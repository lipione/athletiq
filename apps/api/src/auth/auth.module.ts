import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RepositoryModule } from '../repositories/repository.module.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [RepositoryModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, SessionService, TokenService],
  exports: [TokenService],
})
export class AuthModule {}
