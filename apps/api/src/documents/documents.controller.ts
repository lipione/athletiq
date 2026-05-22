import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Roles } from '../common/roles.decorator.js';
import { Permissions } from '../common/permissions.decorator.js';
import {
  type AuthenticatedUser,
  type IdentityDocumentStatus,
  type IdentityDocumentType,
} from '../common/store.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { DocumentsService } from './documents.service.js';

type OcrBody = {
  documentText?: string;
  documentType: 'birth_certificate' | 'citizenship' | 'school_id';
};

type MultipartUpload = {
  filename: string;
  mimetype: string;
  fields: Record<string, { value?: unknown } | undefined>;
  toBuffer: () => Promise<Buffer>;
};

type MultipartRequest = {
  file: () => Promise<MultipartUpload | undefined>;
};

const documentTypes = new Set<IdentityDocumentType>([
  'birth_certificate',
  'citizenship',
  'school_id',
  'medical',
  'eligibility_form',
]);

@Controller('documents')
export class DocumentsController {
  constructor(@Inject(DocumentsService) private readonly documentsService: DocumentsService) {}

  @Post('ocr/extract')
  @Roles('super_admin', 'school_admin', 'coach', 'referee')
  @HttpCode(201)
  extract(@CurrentUser() _actor: AuthenticatedUser, @Body() body: OcrBody) {
    return this.documentsService.extract(body);
  }

  @Post('athletes/:athleteId/upload')
  @Roles('super_admin', 'school_admin')
  @Permissions('document.upload')
  @HttpCode(201)
  async uploadDocument(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('athleteId') athleteId: string,
    @Req() request: MultipartRequest,
  ) {
    const file = await request.file();
    if (!file) {
      throw new BadRequestException('file is required');
    }
    const documentType = file.fields.documentType?.value;
    if (
      typeof documentType !== 'string' ||
      !documentTypes.has(documentType as IdentityDocumentType)
    ) {
      throw new BadRequestException('documentType is required');
    }

    return this.documentsService.uploadDocument(actor, {
      athleteId,
      documentType: documentType as IdentityDocumentType,
      originalFilename: file.filename,
      mimeType: file.mimetype,
      buffer: await file.toBuffer(),
    });
  }

  @Post(':documentId/extract')
  @Roles('super_admin', 'school_admin')
  @Permissions('document.extract')
  @HttpCode(201)
  extractDocument(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Body() body: { documentText?: string },
  ) {
    return this.documentsService.extractDocument(actor, documentId, body);
  }

  @Get('review-queue')
  @Roles('super_admin', 'school_admin')
  @Permissions('document.read')
  listReviewQueue(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('schoolId') schoolId?: string,
    @Query('status') status?: IdentityDocumentStatus,
  ) {
    return this.documentsService.listReviewQueue(actor, {
      ...(schoolId ? { schoolId } : {}),
      ...(status ? { status } : {}),
    });
  }

  @Post(':documentId/review-links')
  @Roles('super_admin')
  @Permissions('document.review')
  @HttpCode(201)
  createReviewLink(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Body() body: { ttlMinutes?: number },
  ) {
    return this.documentsService.createReviewLink(actor, documentId, body);
  }

  @Get('review-links/:token')
  @Roles('super_admin', 'school_admin')
  @Permissions('document.read')
  resolveReviewLink(@CurrentUser() actor: AuthenticatedUser, @Param('token') token: string) {
    return this.documentsService.resolveReviewLink(actor, token);
  }

  @Post(':documentId/reviews')
  @Roles('super_admin', 'school_admin')
  @Permissions('document.review')
  @HttpCode(201)
  recordReview(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Body()
    body: {
      action: 'approve' | 'reject' | 'request_correction' | 'override';
      notes?: string;
      reason?: string;
      overrideReason?: string;
    },
  ) {
    return this.documentsService.recordReview(actor, documentId, body);
  }

  @Get('expiring')
  @Roles('super_admin', 'school_admin')
  @Permissions('document.read')
  listExpiringDocuments(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('before') before: string,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.documentsService.listExpiringDocuments(actor, {
      before,
      ...(schoolId ? { schoolId } : {}),
    });
  }

  @Post('expiry/run')
  @Roles('super_admin')
  @Permissions('document.review')
  @HttpCode(201)
  runExpiryCheck(@CurrentUser() actor: AuthenticatedUser, @Body() body: { before: string }) {
    return this.documentsService.runExpiryCheck(actor, body);
  }

  @Get(':documentId/duplicates')
  @Roles('super_admin', 'school_admin')
  @Permissions('document.read')
  listDuplicateCandidates(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('documentId') documentId: string,
  ) {
    return this.documentsService.listDuplicateCandidates(actor, documentId);
  }
}
