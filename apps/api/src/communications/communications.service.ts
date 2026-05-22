import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type {
  AuthenticatedUser,
  CommunicationLocale,
  CommunicationPriority,
} from '../common/store.js';
import type { UserRole } from '../common/roles.js';
import {
  COMMUNICATION_REPOSITORY,
  type CommunicationRepository,
  type CreateAnnouncementInput,
  type CreateCommunicationTemplateInput,
  type CreateConversationThreadInput,
  type LinkGuardianInput,
  type SendTemplateNotificationInput,
  type UpsertNotificationPreferenceInput,
} from '../repositories/repository.types.js';

const channels = ['email', 'sms', 'push', 'in_app'] as const;
const categories = [
  'schedule',
  'verification',
  'announcement',
  'match_update',
  'compliance',
  'thread',
] as const;
const locales = ['en', 'ne'] as const;
const priorities = ['normal', 'urgent', 'compliance'] as const;

@Injectable()
export class CommunicationsService {
  constructor(
    @Inject(COMMUNICATION_REPOSITORY) private readonly communications: CommunicationRepository,
  ) {}

  linkGuardian(actor: AuthenticatedUser, input: LinkGuardianInput) {
    return this.communications.linkGuardian(actor, {
      guardianUserId: this.required(input.guardianUserId, 'guardianUserId'),
      athleteId: this.required(input.athleteId, 'athleteId'),
      relationship: this.required(input.relationship, 'relationship'),
    });
  }

  getFamilyDashboard(actor: AuthenticatedUser, guardianUserId?: string) {
    return this.communications.getFamilyDashboard(actor, guardianUserId?.trim() || undefined);
  }

  createAnnouncement(actor: AuthenticatedUser, input: CreateAnnouncementInput) {
    return this.communications.createAnnouncement(actor, {
      title: this.required(input.title, 'title'),
      body: this.required(input.body, 'body'),
      category: this.enumValue(input.category, categories, 'category'),
      priority: input.priority
        ? this.enumValue(input.priority, priorities, 'priority')
        : ('normal' satisfies CommunicationPriority),
      locale: input.locale
        ? this.enumValue(input.locale, locales, 'locale')
        : ('en' satisfies CommunicationLocale),
      schoolIds: this.stringList(input.schoolIds),
      teamIds: this.stringList(input.teamIds),
      ...(input.role ? { role: input.role as UserRole } : {}),
    });
  }

  upsertPreference(actor: AuthenticatedUser, input: UpsertNotificationPreferenceInput) {
    return this.communications.upsertPreference(actor, {
      ...(input.userId?.trim() ? { userId: input.userId.trim() } : {}),
      channel: this.enumValue(input.channel, channels, 'channel'),
      category: this.enumValue(input.category, categories, 'category'),
      enabled: Boolean(input.enabled),
      locale: input.locale
        ? this.enumValue(input.locale, locales, 'locale')
        : ('en' satisfies CommunicationLocale),
      ...(input.quietHoursStart?.trim() ? { quietHoursStart: input.quietHoursStart.trim() } : {}),
      ...(input.quietHoursEnd?.trim() ? { quietHoursEnd: input.quietHoursEnd.trim() } : {}),
    });
  }

  listPreferences(actor: AuthenticatedUser, userId?: string) {
    return this.communications.listPreferences(actor, userId?.trim() || undefined);
  }

  createTemplate(actor: AuthenticatedUser, input: CreateCommunicationTemplateInput) {
    if (!input.variants?.en?.subject || !input.variants.en.body) {
      throw new BadRequestException('English template variant is required');
    }
    if (!input.variants?.ne?.subject || !input.variants.ne.body) {
      throw new BadRequestException('Nepali template variant is required');
    }
    return this.communications.createTemplate(actor, {
      key: this.required(input.key, 'key'),
      category: this.enumValue(input.category, categories, 'category'),
      required: input.required ?? false,
      variants: {
        en: {
          subject: this.required(input.variants.en.subject, 'variants.en.subject'),
          body: this.required(input.variants.en.body, 'variants.en.body'),
        },
        ne: {
          subject: this.required(input.variants.ne.subject, 'variants.ne.subject'),
          body: this.required(input.variants.ne.body, 'variants.ne.body'),
        },
      },
    });
  }

  sendTemplate(actor: AuthenticatedUser, input: SendTemplateNotificationInput) {
    return this.communications.sendTemplateNotification(actor, {
      templateKey: this.required(input.templateKey, 'templateKey'),
      recipientUserId: this.required(input.recipientUserId, 'recipientUserId'),
      channel: this.enumValue(input.channel, channels, 'channel'),
      ...(input.locale ? { locale: this.enumValue(input.locale, locales, 'locale') } : {}),
      variables: input.variables ?? {},
      ...(input.resourceType?.trim() ? { resourceType: input.resourceType.trim() } : {}),
      ...(input.resourceId?.trim() ? { resourceId: input.resourceId.trim() } : {}),
    });
  }

  listInbox(actor: AuthenticatedUser, userId?: string) {
    return this.communications.listInbox(actor, userId?.trim() || undefined);
  }

  createThread(actor: AuthenticatedUser, input: CreateConversationThreadInput) {
    return this.communications.createThread(actor, {
      title: this.required(input.title, 'title'),
      schoolId: this.required(input.schoolId, 'schoolId'),
      ...(input.teamId?.trim() ? { teamId: input.teamId.trim() } : {}),
      ...(input.athleteId?.trim() ? { athleteId: input.athleteId.trim() } : {}),
      participantUserIds: this.stringList(input.participantUserIds),
    });
  }

  postMessage(actor: AuthenticatedUser, threadId: string, input: { body?: string }) {
    return this.communications.postMessage(
      actor,
      this.required(threadId, 'threadId'),
      this.required(input.body, 'body'),
    );
  }

  hideMessage(actor: AuthenticatedUser, messageId: string, input: { reason?: string }) {
    return this.communications.hideMessage(
      actor,
      this.required(messageId, 'messageId'),
      this.required(input.reason, 'reason'),
    );
  }

  listThread(actor: AuthenticatedUser, threadId: string) {
    return this.communications.listThread(actor, this.required(threadId, 'threadId'));
  }

  private required(value: string | undefined, field: string) {
    if (!value?.trim()) {
      throw new BadRequestException(`${field} is required`);
    }
    return value.trim();
  }

  private stringList(values: string[] | undefined) {
    return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
  }

  private enumValue<T extends readonly string[]>(
    value: string,
    allowed: T,
    field: string,
  ): T[number] {
    if (!allowed.includes(value)) {
      throw new BadRequestException(`${field} is invalid`);
    }
    return value as T[number];
  }
}
