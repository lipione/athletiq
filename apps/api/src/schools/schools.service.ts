import { BadRequestException, ForbiddenException, Injectable, Inject } from '@nestjs/common';
import { type AuthenticatedUser } from '../common/store.js';
import { type UserRole } from '../common/roles.js';
import { SCHOOL_REPOSITORY, type SchoolRepository } from '../repositories/repository.types.js';

@Injectable()
export class SchoolsService {
  constructor(@Inject(SCHOOL_REPOSITORY) private readonly schools: SchoolRepository) {}

  createSchool(actor: AuthenticatedUser, payload: { name: string; location?: string }) {
    if (!payload.name?.trim()) {
      throw new BadRequestException('school name is required');
    }

    const location = payload.location?.trim();
    return this.schools.create({
      actor,
      name: payload.name.trim(),
      ...(location ? { location } : {}),
    });
  }

  approveSchool(actor: AuthenticatedUser, schoolId: string) {
    return this.schools.approve(actor, schoolId);
  }

  inviteCoach(
    actor: AuthenticatedUser,
    schoolId: string,
    payload: { email: string; role?: UserRole },
  ) {
    if (!payload.email?.trim()) {
      throw new BadRequestException('email is required');
    }

    if (payload.role === 'super_admin' && actor.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can invite super admins');
    }

    return this.schools.inviteUser(actor, schoolId, payload.email.trim(), payload.role ?? 'coach');
  }

  listSchools() {
    return this.schools.list();
  }
}
