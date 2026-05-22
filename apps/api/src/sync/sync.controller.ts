import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { type AuthenticatedUser } from '../common/store.js';
import { SyncService } from './sync.service.js';

type MutationInput = {
  mutationId: string;
  mutationType: string;
  payload: Record<string, unknown>;
};

type PushMutationBody = {
  clientId: string;
  schoolId?: string;
  mutations: MutationInput[];
};

@Controller('sync')
export class SyncController {
  constructor(@Inject(SyncService) private readonly syncService: SyncService) {}

  @Post('mutations/push')
  @Roles('super_admin', 'school_admin', 'coach', 'referee')
  @HttpCode(201)
  push(@CurrentUser() actor: AuthenticatedUser, @Body() body: PushMutationBody) {
    return this.syncService.pushMutations(actor, {
      clientId: body.clientId,
      mutations: body.mutations,
      ...(body.schoolId ? { schoolId: body.schoolId } : {}),
    });
  }

  @Get('mutations/:clientId')
  @Roles('super_admin', 'school_admin', 'coach', 'referee')
  list(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('clientId') clientId: string,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.syncService.listMutations(actor, clientId, schoolId);
  }
}
