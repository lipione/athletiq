import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { type AuthenticatedUser } from '../common/store.js';
import {
  BILLING_REPOSITORY,
  type BillingRepository,
  type ConfigureTournamentRegistrationFeeInput,
  type CreateDiscountCodeInput,
  type CreateMembershipPlanInput,
  type CreateTournamentRegistrationInvoiceInput,
  type FinanceReportInput,
  type PurchaseSchoolMembershipInput,
  type RecordManualPaymentInput,
  type RefundPaymentInput,
} from '../repositories/repository.types.js';

@Injectable()
export class BillingService {
  constructor(@Inject(BILLING_REPOSITORY) private readonly billing: BillingRepository) {}

  createMembershipPlan(actor: AuthenticatedUser, input: CreateMembershipPlanInput) {
    this.assertNonBlank(input.name, 'name');
    this.assertPositiveMoney(input.amount, 'amount');
    this.assertCurrency(input.currency);
    if (!Number.isInteger(input.durationDays) || input.durationDays <= 0) {
      throw new BadRequestException('durationDays must be a positive integer');
    }

    return this.billing.createMembershipPlan(actor, {
      name: input.name.trim(),
      ...(input.description?.trim() ? { description: input.description.trim() } : {}),
      amount: input.amount,
      currency: input.currency.trim().toUpperCase(),
      durationDays: input.durationDays,
    });
  }

  listMembershipPlans() {
    return this.billing.listMembershipPlans();
  }

  createDiscountCode(actor: AuthenticatedUser, input: CreateDiscountCodeInput) {
    this.assertNonBlank(input.code, 'code');
    this.assertPositiveMoney(input.amount, 'amount');
    this.assertCurrency(input.currency);

    return this.billing.createDiscountCode(actor, {
      code: input.code.trim().toUpperCase(),
      amount: input.amount,
      currency: input.currency.trim().toUpperCase(),
    });
  }

  purchaseSchoolMembership(
    actor: AuthenticatedUser,
    schoolId: string,
    input: PurchaseSchoolMembershipInput,
  ) {
    this.assertNonBlank(schoolId, 'schoolId');
    this.assertNonBlank(input.planId, 'planId');
    this.assertInstallmentCount(input.installmentCount);

    return this.billing.purchaseSchoolMembership(actor, schoolId.trim(), {
      planId: input.planId.trim(),
      ...(input.discountCode?.trim() ? { discountCode: input.discountCode.trim() } : {}),
      ...(input.installmentCount ? { installmentCount: input.installmentCount } : {}),
    });
  }

  configureTournamentRegistrationFee(
    actor: AuthenticatedUser,
    tournamentId: string,
    input: ConfigureTournamentRegistrationFeeInput,
  ) {
    this.assertNonBlank(tournamentId, 'tournamentId');
    this.assertPositiveMoney(input.amount, 'amount');
    this.assertCurrency(input.currency);

    return this.billing.configureTournamentRegistrationFee(actor, tournamentId.trim(), {
      amount: input.amount,
      currency: input.currency.trim().toUpperCase(),
      requiredBeforeApproval: input.requiredBeforeApproval ?? true,
    });
  }

  createTournamentRegistrationInvoice(
    actor: AuthenticatedUser,
    tournamentId: string,
    schoolId: string,
    input: CreateTournamentRegistrationInvoiceInput,
  ) {
    this.assertNonBlank(tournamentId, 'tournamentId');
    this.assertNonBlank(schoolId, 'schoolId');
    this.assertInstallmentCount(input.installmentCount);

    return this.billing.createTournamentRegistrationInvoice(
      actor,
      tournamentId.trim(),
      schoolId.trim(),
      {
        ...(input.discountCode?.trim() ? { discountCode: input.discountCode.trim() } : {}),
        ...(input.installmentCount ? { installmentCount: input.installmentCount } : {}),
      },
    );
  }

  recordManualPayment(
    actor: AuthenticatedUser,
    invoiceId: string,
    input: RecordManualPaymentInput,
  ) {
    this.assertNonBlank(invoiceId, 'invoiceId');
    this.assertPositiveMoney(input.amount, 'amount');
    if (input.method !== 'manual_cash' && input.method !== 'manual_bank') {
      throw new BadRequestException('method must be manual_cash or manual_bank');
    }

    return this.billing.recordManualPayment(actor, invoiceId.trim(), {
      amount: input.amount,
      method: input.method,
      ...(input.reference?.trim() ? { reference: input.reference.trim() } : {}),
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    });
  }

  refundPayment(actor: AuthenticatedUser, paymentId: string, input: RefundPaymentInput) {
    this.assertNonBlank(paymentId, 'paymentId');
    this.assertPositiveMoney(input.amount, 'amount');

    return this.billing.refundPayment(actor, paymentId.trim(), {
      amount: input.amount,
      ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
    });
  }

  getFinanceReport(actor: AuthenticatedUser, input: FinanceReportInput) {
    if (actor.role === 'school_admin') {
      if (!input.schoolId) {
        throw new BadRequestException('schoolId is required for school finance reports');
      }
      if (!actor.schoolIds.includes(input.schoolId)) {
        throw new ForbiddenException('Not a member of this school');
      }
    }
    if (input.currency) {
      this.assertCurrency(input.currency);
    }

    return this.billing.getFinanceReport({
      ...(input.schoolId?.trim() ? { schoolId: input.schoolId.trim() } : {}),
      ...(input.tournamentId?.trim() ? { tournamentId: input.tournamentId.trim() } : {}),
      ...(input.currency?.trim() ? { currency: input.currency.trim().toUpperCase() } : {}),
    });
  }

  private assertNonBlank(value: string | undefined, field: string) {
    if (!value?.trim()) {
      throw new BadRequestException(`${field} is required`);
    }
  }

  private assertPositiveMoney(value: number, field: string) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(`${field} must be a positive integer minor-unit amount`);
    }
  }

  private assertCurrency(value: string | undefined) {
    if (!value?.trim() || !/^[A-Z]{3}$/i.test(value.trim())) {
      throw new BadRequestException('currency must be a 3-letter ISO code');
    }
  }

  private assertInstallmentCount(value: number | undefined) {
    if (value === undefined) {
      return;
    }
    if (!Number.isInteger(value) || value < 1 || value > 12) {
      throw new BadRequestException('installmentCount must be between 1 and 12');
    }
  }
}
