import { randomBytes } from 'crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type {
  AuthenticatedUser,
  DocumentReviewQueueItem,
  DocumentReviewResult,
  IdentityDocumentRecord,
  IdentityDocumentStatus,
  IdentityDocumentType,
} from '../common/store.js';
import {
  ATHLETE_REPOSITORY,
  DOCUMENT_REPOSITORY,
  type AthleteRepository,
  type DocumentRepository,
  type RecordDocumentReviewInput,
} from '../repositories/repository.types.js';
import { DocumentExtractionProvider } from './document-extraction.provider.js';
import { DocumentStorageService } from './document-storage.service.js';

type OcrBody = {
  documentText?: string;
  documentType: Extract<IdentityDocumentType, 'birth_certificate' | 'citizenship' | 'school_id'>;
};

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documents: DocumentRepository,
    @Inject(ATHLETE_REPOSITORY)
    private readonly athletes: AthleteRepository,
    @Inject(DocumentStorageService)
    private readonly storage: DocumentStorageService,
    @Inject(DocumentExtractionProvider)
    private readonly extractionProvider: DocumentExtractionProvider,
  ) {}

  extract(payload: OcrBody) {
    const text = payload.documentText?.trim();
    if (!text) {
      throw new BadRequestException('documentText is required');
    }

    const extraction = this.extractionProvider.extract({
      documentType: payload.documentType,
      documentText: text,
    });

    return {
      documentType: payload.documentType,
      extracted: extraction.extracted,
      confidence: extraction.confidence,
    };
  }

  async uploadDocument(
    actor: AuthenticatedUser,
    input: {
      athleteId: string;
      documentType: IdentityDocumentType;
      originalFilename: string;
      mimeType: string;
      buffer: Buffer;
    },
  ) {
    const athlete = await this.athletes.findById(input.athleteId);
    if (!athlete) {
      throw new BadRequestException('Athlete not found');
    }
    if (actor.role !== 'super_admin' && !actor.schoolIds.includes(athlete.schoolId)) {
      throw new ForbiddenException('Not a member of this school');
    }

    const documentId = this.nextId('doc');
    const stored = this.storage.store({
      documentId,
      schoolId: athlete.schoolId,
      athleteId: athlete.id,
      buffer: input.buffer,
      mimeType: input.mimeType,
    });
    const document = await this.documents.uploadDocument(actor, {
      id: documentId,
      athleteId: athlete.id,
      schoolId: athlete.schoolId,
      documentType: input.documentType,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      byteSize: stored.byteSize,
      sha256Hash: stored.sha256Hash,
      storageKey: stored.storageKey,
    });
    return this.safeDocument(document);
  }

  async extractDocument(
    actor: AuthenticatedUser,
    documentId: string,
    input: { documentText?: string },
  ) {
    const document = await this.mustFindDocument(documentId);
    this.assertDocumentAccess(actor, document);
    const storedBuffer = this.storage.read(document.storageKey);
    const extraction = this.extractionProvider.extract({
      documentType: document.documentType,
      ...(input.documentText ? { documentText: input.documentText } : {}),
      ...(storedBuffer ? { fileBuffer: storedBuffer } : {}),
    });
    const result = await this.documents.extractDocument(actor, documentId, extraction);
    return {
      document: this.safeDocument(result.document),
      extraction: result.extraction,
      reviewFlags: result.reviewFlags,
      duplicateCandidates: result.duplicateCandidates,
    };
  }

  async createReviewLink(
    actor: AuthenticatedUser,
    documentId: string,
    input: { ttlMinutes?: number },
  ) {
    const token = `drl_${this.randomToken(32)}`;
    const ttlMinutes = Number.isFinite(input.ttlMinutes) ? Number(input.ttlMinutes) : 60;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    const link = await this.documents.createReviewLink(actor, documentId, {
      tokenHash: this.storage.tokenHash(token),
      expiresAt,
    });
    return {
      id: link.id,
      documentId: link.documentId,
      token,
      reviewUrl: `/api/documents/review-links/${token}`,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
    };
  }

  async resolveReviewLink(actor: AuthenticatedUser, token: string) {
    const item = await this.documents.resolveReviewLink(actor, this.storage.tokenHash(token));
    return this.safeQueueItem(item);
  }

  async listReviewQueue(
    actor: AuthenticatedUser,
    input: { schoolId?: string; status?: IdentityDocumentStatus },
  ) {
    const schoolId =
      actor.role === 'super_admin'
        ? input.schoolId
        : input.schoolId && actor.schoolIds.includes(input.schoolId)
          ? input.schoolId
          : actor.schoolIds[0];
    if (actor.role !== 'super_admin' && !schoolId) {
      throw new ForbiddenException('Not a member of this school');
    }
    if (
      actor.role !== 'super_admin' &&
      input.schoolId &&
      !actor.schoolIds.includes(input.schoolId)
    ) {
      throw new ForbiddenException('Not a member of this school');
    }
    const items = await this.documents.listReviewQueue({
      ...(schoolId ? { schoolId } : {}),
      ...(input.status ? { status: input.status } : {}),
    });
    return items.map((item) => this.safeQueueItem(item));
  }

  async recordReview(
    actor: AuthenticatedUser,
    documentId: string,
    input: RecordDocumentReviewInput,
  ) {
    const result = await this.documents.recordReview(actor, documentId, input);
    return this.safeReviewResult(result);
  }

  async listDuplicateCandidates(actor: AuthenticatedUser, documentId: string) {
    const document = await this.mustFindDocument(documentId);
    this.assertDocumentAccess(actor, document);
    return this.documents.listDuplicateCandidates(documentId);
  }

  async listExpiringDocuments(
    actor: AuthenticatedUser,
    input: { before: string; schoolId?: string },
  ) {
    const schoolId =
      actor.role === 'super_admin'
        ? input.schoolId
        : input.schoolId && actor.schoolIds.includes(input.schoolId)
          ? input.schoolId
          : actor.schoolIds[0];
    if (actor.role !== 'super_admin' && !schoolId) {
      throw new ForbiddenException('Not a member of this school');
    }
    if (
      actor.role !== 'super_admin' &&
      input.schoolId &&
      !actor.schoolIds.includes(input.schoolId)
    ) {
      throw new ForbiddenException('Not a member of this school');
    }
    const documents = await this.documents.listExpiringDocuments({
      before: input.before,
      ...(schoolId ? { schoolId } : {}),
    });
    return documents.map((document) => this.safeDocument(document));
  }

  runExpiryCheck(actor: AuthenticatedUser, input: { before: string }) {
    return this.documents.runExpiryCheck(actor, input);
  }

  private async mustFindDocument(documentId: string) {
    const document = await this.documents.findDocumentById(documentId);
    if (!document) {
      throw new BadRequestException('Document not found');
    }
    return document;
  }

  private assertDocumentAccess(actor: AuthenticatedUser, document: IdentityDocumentRecord) {
    if (actor.role !== 'super_admin' && !actor.schoolIds.includes(document.schoolId)) {
      throw new ForbiddenException('Not a member of this school');
    }
  }

  private safeQueueItem(item: DocumentReviewQueueItem) {
    return {
      document: this.safeDocument(item.document),
      ...(item.extraction ? { extraction: item.extraction } : {}),
      reviewFlags: item.reviewFlags,
      duplicateCandidates: item.duplicateCandidates,
    };
  }

  private safeReviewResult(result: DocumentReviewResult) {
    return {
      document: this.safeDocument(result.document),
      review: result.review,
      ...(result.athlete ? { athlete: result.athlete } : {}),
    };
  }

  private safeDocument(document: IdentityDocumentRecord) {
    const safe: Partial<IdentityDocumentRecord> = { ...document };
    delete safe.storageKey;
    return safe;
  }

  private nextId(prefix: string) {
    return `${prefix}_${Date.now()}_${this.randomToken(6)}`;
  }

  private randomToken(length: number) {
    return randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
      .toLowerCase();
  }
}
