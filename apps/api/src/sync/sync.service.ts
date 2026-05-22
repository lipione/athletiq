import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { type AuthenticatedUser } from '../common/store.js';
import { SYNC_REPOSITORY, type SyncRepository } from '../repositories/repository.types.js';
import { TenancyService } from '../tenancy/tenancy.service.js';

type MutationInput = {
  mutationId: string;
  mutationType: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class SyncService {
  constructor(
    @Inject(SYNC_REPOSITORY) private readonly sync: SyncRepository,
    @Inject(TenancyService) private readonly tenancy: TenancyService,
  ) {}

  pushMutations(
    actor: AuthenticatedUser,
    payload: { clientId: string; mutations: MutationInput[]; schoolId?: string },
  ) {
    const scope = this.tenancy.resolveActorScope(actor, {
      ...(payload.schoolId ? { schoolId: payload.schoolId } : {}),
    });
    return this.sync.pushMutations({
      actor,
      tenantId: scope.tenantId,
      clientId: payload.clientId,
      mutations: payload.mutations.map((mutation) => ({
        id: mutation.mutationId,
        mutationType: mutation.mutationType,
        payload: mutation.payload,
      })),
    });
  }

  listMutations(actor: AuthenticatedUser, clientId: string, schoolId?: string) {
    const scope = this.tenancy.resolveActorScope(actor, {
      ...(schoolId ? { schoolId } : {}),
    });
    return this.sync.listMutations(scope.tenantId, clientId);
  }
}
