import { Injectable } from '@nestjs/common';
import { hash, verify } from 'argon2';

@Injectable()
export class PasswordService {
  hashPassword(password: string) {
    return hash(password, { type: 2 });
  }

  async verifyPassword(storedPassword: string, candidatePassword: string) {
    if (this.isLockedPassword(storedPassword)) {
      return false;
    }

    if (this.isArgon2Hash(storedPassword)) {
      return verify(storedPassword, candidatePassword);
    }

    return storedPassword === candidatePassword;
  }

  requiresLegacyMigration(value: string) {
    return !this.isArgon2Hash(value) && !this.isLockedPassword(value);
  }

  isArgon2Hash(value: string) {
    return (
      value.startsWith('$argon2id$') ||
      value.startsWith('$argon2i$') ||
      value.startsWith('$argon2d$')
    );
  }

  isLockedPassword(value: string) {
    return value.startsWith('LOCKED:');
  }
}
