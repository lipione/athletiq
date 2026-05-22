import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator.js';
import { Permissions } from '../common/permissions.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import type { AuthenticatedUser } from '../common/store.js';
import type {
  CreateAnnouncementInput,
  CreateCommunicationTemplateInput,
  CreateConversationThreadInput,
  LinkGuardianInput,
  SendTemplateNotificationInput,
  UpsertNotificationPreferenceInput,
} from '../repositories/repository.types.js';
import { CommunicationsService } from './communications.service.js';

@Controller('communications')
export class CommunicationsController {
  constructor(
    @Inject(CommunicationsService) private readonly communications: CommunicationsService,
  ) {}

  @Post('guardian-links')
  @Roles('super_admin', 'school_admin')
  @Permissions('communications.manage')
  @HttpCode(201)
  linkGuardian(@CurrentUser() actor: AuthenticatedUser, @Body() body: LinkGuardianInput) {
    return this.communications.linkGuardian(actor, body);
  }

  @Get('family-dashboard')
  @Roles('super_admin', 'guardian')
  @Permissions('communications.read')
  familyDashboard(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('guardianUserId') guardianUserId?: string,
  ) {
    return this.communications.getFamilyDashboard(actor, guardianUserId);
  }

  @Post('announcements')
  @Roles('super_admin', 'school_admin')
  @Permissions('communications.send')
  @HttpCode(201)
  createAnnouncement(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: CreateAnnouncementInput,
  ) {
    return this.communications.createAnnouncement(actor, body);
  }

  @Post('preferences')
  @Roles('super_admin', 'school_admin', 'coach', 'referee', 'guardian')
  @Permissions('communications.preferences.manage')
  @HttpCode(201)
  upsertPreference(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: UpsertNotificationPreferenceInput,
  ) {
    return this.communications.upsertPreference(actor, body);
  }

  @Get('preferences')
  @Roles('super_admin', 'school_admin', 'coach', 'referee', 'guardian')
  @Permissions('communications.preferences.manage')
  listPreferences(@CurrentUser() actor: AuthenticatedUser, @Query('userId') userId?: string) {
    return this.communications.listPreferences(actor, userId);
  }

  @Post('templates')
  @Roles('super_admin')
  @Permissions('communications.manage')
  @HttpCode(201)
  createTemplate(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: CreateCommunicationTemplateInput,
  ) {
    return this.communications.createTemplate(actor, body);
  }

  @Post('notifications/send-template')
  @Roles('super_admin', 'school_admin')
  @Permissions('communications.send')
  @HttpCode(201)
  sendTemplate(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: SendTemplateNotificationInput,
  ) {
    return this.communications.sendTemplate(actor, body);
  }

  @Get('inbox')
  @Roles('super_admin', 'school_admin', 'coach', 'referee', 'guardian')
  @Permissions('communications.read')
  inbox(@CurrentUser() actor: AuthenticatedUser, @Query('userId') userId?: string) {
    return this.communications.listInbox(actor, userId);
  }

  @Post('threads')
  @Roles('super_admin', 'school_admin', 'coach', 'guardian')
  @Permissions('communications.send')
  @HttpCode(201)
  createThread(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: CreateConversationThreadInput,
  ) {
    return this.communications.createThread(actor, body);
  }

  @Get('threads/:threadId')
  @Roles('super_admin', 'school_admin', 'coach', 'guardian')
  @Permissions('communications.read')
  listThread(@CurrentUser() actor: AuthenticatedUser, @Param('threadId') threadId: string) {
    return this.communications.listThread(actor, threadId);
  }

  @Post('threads/:threadId/messages')
  @Roles('super_admin', 'school_admin', 'coach', 'guardian')
  @Permissions('communications.send')
  @HttpCode(201)
  postMessage(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('threadId') threadId: string,
    @Body() body: { body?: string },
  ) {
    return this.communications.postMessage(actor, threadId, body);
  }

  @Post('messages/:messageId/hide')
  @Roles('super_admin', 'school_admin')
  @Permissions('communications.moderate')
  @HttpCode(201)
  hideMessage(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('messageId') messageId: string,
    @Body() body: { reason?: string },
  ) {
    return this.communications.hideMessage(actor, messageId, body);
  }
}
