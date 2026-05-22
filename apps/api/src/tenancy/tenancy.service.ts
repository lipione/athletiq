import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/store.js';
import type { TenantResolutionOptions, TenantScope } from './tenant.types.js';

@Injectable()
export class TenancyService {
  resolveActorScope(actor: AuthenticatedUser, options: TenantResolutionOptions = {}): TenantScope {
    if (options.schoolId) {
      this.assertSchoolAccess(actor, options.schoolId);
      return {
        tenantId: options.schoolId,
        tenantType: 'school',
        actor,
      };
    }

    if (actor.role === 'super_admin') {
      return {
        tenantId: 'platform',
        tenantType: 'platform',
        actor,
      };
    }

    if (actor.role === 'federation_admin') {
      return {
        tenantId: `federation:${actor.id}`,
        tenantType: 'federation',
        actor,
      };
    }

    if (actor.role === 'government_viewer') {
      return {
        tenantId: `government:${actor.id}`,
        tenantType: 'government',
        actor,
      };
    }

    if (actor.schoolIds.length > 1) {
      throw new BadRequestException(
        'schoolId is required for users linked to multiple school tenants',
      );
    }

    const schoolId = actor.schoolIds[0];
    if (!schoolId) {
      throw new ForbiddenException('User is not linked to a school tenant');
    }

    return {
      tenantId: schoolId,
      tenantType: 'school',
      actor,
    };
  }

  assertSchoolAccess(actor: AuthenticatedUser, schoolId: string) {
    if (actor.role === 'super_admin') {
      return;
    }

    if (!actor.schoolIds.includes(schoolId)) {
      throw new ForbiddenException('Not a member of this school');
    }
  }
}
