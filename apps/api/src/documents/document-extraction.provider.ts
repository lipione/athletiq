import { Injectable } from '@nestjs/common';
import type {
  DocumentReviewFlagRecord,
  ExtractedIdentityFields,
  IdentityDocumentType,
} from '../common/store.js';

export type DocumentExtractionProviderResult = {
  provider: 'deterministic' | 'openai';
  extracted: ExtractedIdentityFields;
  fieldConfidence: Partial<Record<keyof ExtractedIdentityFields, number>>;
  confidence: number;
  reviewFlags: Array<{
    field: DocumentReviewFlagRecord['field'];
    severity: DocumentReviewFlagRecord['severity'];
    message: string;
  }>;
};

@Injectable()
export class DocumentExtractionProvider {
  extract(input: {
    documentType: IdentityDocumentType;
    documentText?: string;
    fileBuffer?: Buffer;
  }): DocumentExtractionProviderResult {
    const text = this.sourceText(input.documentText, input.fileBuffer);
    const rawMap = this.parseKeyValueText(text);
    const extracted = this.extractFields(rawMap);
    const fieldConfidence = this.fieldConfidence(extracted);
    const confidence = this.estimateConfidence(input.documentType, extracted);
    const reviewFlags = this.reviewFlags(input.documentType, extracted, confidence);

    return {
      provider: 'deterministic',
      extracted,
      fieldConfidence,
      confidence,
      reviewFlags,
    };
  }

  private sourceText(documentText?: string, fileBuffer?: Buffer) {
    const explicitText = documentText?.trim();
    if (explicitText) {
      return explicitText;
    }
    return fileBuffer?.toString('utf8').trim() ?? '';
  }

  private parseKeyValueText(text: string) {
    const rawMap = new Map<string, string>();
    const lines = text.split(/[\n;|]/);
    for (const line of lines) {
      const [left, ...rest] = line.split(':');
      if (!left || rest.length === 0) {
        continue;
      }
      const key = left.trim().toLowerCase();
      const value = rest.join(':').trim();
      if (value) {
        rawMap.set(key, value);
      }
    }
    return rawMap;
  }

  private extractFields(rawMap: Map<string, string>): ExtractedIdentityFields {
    return this.removeEmpty({
      fullName: rawMap.get('name') ?? rawMap.get('full name'),
      dateOfBirth: rawMap.get('date of birth') ?? rawMap.get('dob'),
      fatherName: rawMap.get('father') ?? rawMap.get('father name'),
      motherName: rawMap.get('mother') ?? rawMap.get('mother name'),
      address: rawMap.get('address'),
      gender: rawMap.get('gender'),
      schoolName: rawMap.get('school') ?? rawMap.get('school name'),
      documentNumber:
        rawMap.get('document number') ??
        rawMap.get('certificate number') ??
        rawMap.get('id number'),
      issueDate: rawMap.get('issue date'),
      expiryDate: rawMap.get('expiry date') ?? rawMap.get('expires at'),
      issuingAuthority: rawMap.get('issuing authority') ?? rawMap.get('authority'),
    });
  }

  private removeEmpty(
    fields: Partial<Record<keyof ExtractedIdentityFields, string | undefined>>,
  ): ExtractedIdentityFields {
    const entries = Object.entries(fields).filter(
      ([, value]) => value !== undefined && value !== '',
    );
    return Object.fromEntries(entries) as ExtractedIdentityFields;
  }

  private fieldConfidence(extracted: ExtractedIdentityFields) {
    const confidence: Partial<Record<keyof ExtractedIdentityFields, number>> = {};
    for (const key of Object.keys(extracted) as Array<keyof ExtractedIdentityFields>) {
      confidence[key] = 95;
    }
    return confidence;
  }

  private estimateConfidence(
    documentType: IdentityDocumentType,
    extracted: ExtractedIdentityFields,
  ) {
    const required = this.requiredFields(documentType);
    const presentRequired = required.filter((field) => extracted[field]);
    const optionalPresent = Object.keys(extracted).length - presentRequired.length;
    const base = Math.round((presentRequired.length / required.length) * 80);
    return Math.min(100, base + Math.min(optionalPresent * 4, 20));
  }

  private reviewFlags(
    documentType: IdentityDocumentType,
    extracted: ExtractedIdentityFields,
    confidence: number,
  ) {
    const flags: DocumentExtractionProviderResult['reviewFlags'] = [];
    for (const field of this.requiredFields(documentType)) {
      if (!extracted[field]) {
        flags.push({
          field,
          severity: 'high',
          message: `${field} needs reviewer confirmation`,
        });
      }
    }
    if (confidence < 90) {
      flags.push({
        field: 'document',
        severity: 'medium',
        message: 'Extraction confidence requires human review',
      });
    }
    return flags;
  }

  private requiredFields(documentType: IdentityDocumentType): Array<keyof ExtractedIdentityFields> {
    if (documentType === 'medical' || documentType === 'eligibility_form') {
      return ['fullName', 'dateOfBirth', 'documentNumber', 'expiryDate'];
    }
    return ['fullName', 'dateOfBirth', 'documentNumber', 'fatherName', 'motherName'];
  }
}
