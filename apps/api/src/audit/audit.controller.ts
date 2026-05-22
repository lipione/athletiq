import { Controller, Get } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Permissions } from '../common/permissions.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { AUDIT_REPOSITORY, type AuditRepository } from '../repositories/repository.types.js';

@Controller('audit')
export class AuditController {
  constructor(@Inject(AUDIT_REPOSITORY) private readonly audit: AuditRepository) {}

  @Get()
  @Roles('super_admin')
  @Permissions('audit.read')
  list() {
    return this.audit.list();
  }
}
