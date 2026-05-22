import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type AuthenticatedUser, type ImportEntityType } from '../common/store.js';
import {
  INTEGRATION_REPOSITORY,
  type IntegrationRepository,
} from '../repositories/repository.types.js';

type ImportPreviewBody = {
  sourceName?: string;
  entityType?: string;
  rows?: Array<Record<string, string | number | boolean | null>>;
};

type ApiKeyBody = {
  partnerName?: string;
  scopes?: string[];
  expiresAt?: string;
};

type ExportBundleBody = {
  tournamentId?: string;
  formats?: string[];
  include?: string[];
};

type WebhookBody = {
  url?: string;
  events?: string[];
  secretLabel?: string;
};

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(INTEGRATION_REPOSITORY) private readonly integrations: IntegrationRepository,
  ) {}

  previewSpreadsheetImport(actor: AuthenticatedUser, body: ImportPreviewBody) {
    const sourceName = this.requiredString(body.sourceName, 'sourceName');
    const entityType = this.parseImportEntityType(body.entityType);
    if (!Array.isArray(body.rows)) {
      throw new BadRequestException('rows must be an array');
    }
    return this.integrations.previewSpreadsheetImport({
      actor,
      sourceName,
      entityType,
      rows: body.rows,
    });
  }

  commitSpreadsheetImport(actor: AuthenticatedUser, importId: string, body: { mode?: string }) {
    return this.integrations.commitSpreadsheetImport({
      actor,
      importId,
      ...(body.mode ? { mode: body.mode } : {}),
    });
  }

  rollbackSpreadsheetImport(actor: AuthenticatedUser, importId: string, body: { reason?: string }) {
    return this.integrations.rollbackSpreadsheetImport({
      actor,
      importId,
      reason: this.requiredString(body.reason, 'reason'),
    });
  }

  createPartnerApiKey(actor: AuthenticatedUser, body: ApiKeyBody) {
    const scopes = this.requiredStringArray(body.scopes, 'scopes');
    return this.integrations.createPartnerApiKey({
      actor,
      partnerName: this.requiredString(body.partnerName, 'partnerName'),
      scopes,
      ...(body.expiresAt ? { expiresAt: body.expiresAt } : {}),
    });
  }

  getPublicFixtures(tournamentId: string) {
    return this.integrations.getPublicTournamentFixtures(tournamentId);
  }

  getPublicResults(tournamentId: string) {
    return this.integrations.getPublicTournamentResults(tournamentId);
  }

  createExportBundle(actor: AuthenticatedUser, body: ExportBundleBody) {
    return this.integrations.createExportBundle({
      actor,
      tournamentId: this.requiredString(body.tournamentId, 'tournamentId'),
      formats: this.requiredStringArray(body.formats, 'formats'),
      include: this.requiredStringArray(body.include, 'include'),
    });
  }

  createWebhook(actor: AuthenticatedUser, body: WebhookBody) {
    const url = this.requiredString(body.url, 'url');
    if (!url.startsWith('https://')) {
      throw new BadRequestException('Webhook URL must use https');
    }
    return this.integrations.createWebhookSubscription({
      actor,
      url,
      events: this.requiredStringArray(body.events, 'events'),
      ...(body.secretLabel ? { secretLabel: body.secretLabel.trim() } : {}),
    });
  }

  createWebhookTestDelivery(actor: AuthenticatedUser, webhookId: string, body: { event?: string }) {
    return this.integrations.createWebhookTestDelivery({
      actor,
      webhookId,
      event: this.requiredString(body.event, 'event'),
    });
  }

  private parseImportEntityType(value?: string): ImportEntityType {
    if (value === 'athletes' || value === 'schools' || value === 'teams') {
      return value;
    }
    throw new BadRequestException('Unsupported import entity type');
  }

  private requiredString(value: string | undefined, field: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new BadRequestException(`${field} is required`);
    }
    return normalized;
  }

  private requiredStringArray(value: string[] | undefined, field: string) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException(`${field} must be a non-empty array`);
    }
    return value.map((item) => this.requiredString(item, field));
  }
}
