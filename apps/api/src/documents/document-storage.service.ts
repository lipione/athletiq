import { createHash } from 'crypto';
import { BadRequestException, Injectable } from '@nestjs/common';

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

@Injectable()
export class DocumentStorageService {
  private readonly objects = new Map<string, Buffer>();

  store(input: {
    documentId: string;
    schoolId: string;
    athleteId: string;
    buffer: Buffer;
    mimeType: string;
  }) {
    if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
      throw new BadRequestException('Unsupported document file type');
    }
    if (input.buffer.length === 0) {
      throw new BadRequestException('Document file is required');
    }
    if (input.buffer.length > MAX_DOCUMENT_BYTES) {
      throw new BadRequestException('Document file exceeds 10 MB');
    }

    const sha256Hash = createHash('sha256').update(input.buffer).digest('hex');
    const storageKey = `documents/${input.schoolId}/${input.athleteId}/${input.documentId}/${sha256Hash}`;
    this.objects.set(storageKey, Buffer.from(input.buffer));
    return {
      byteSize: input.buffer.length,
      sha256Hash,
      storageKey,
    };
  }

  read(storageKey: string) {
    const object = this.objects.get(storageKey);
    return object ? Buffer.from(object) : undefined;
  }

  tokenHash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
