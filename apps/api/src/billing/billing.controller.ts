import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator.js';
import { Permissions } from '../common/permissions.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { type AuthenticatedUser } from '../common/store.js';
import { BillingService } from './billing.service.js';

type MembershipPlanBody = {
  name: string;
  description?: string;
  amount: number;
  currency: string;
  durationDays: number;
};

type DiscountCodeBody = {
  code: string;
  amount: number;
  currency: string;
};

type PurchaseMembershipBody = {
  planId: string;
  discountCode?: string;
  installmentCount?: number;
};

type TournamentFeeBody = {
  amount: number;
  currency: string;
  requiredBeforeApproval?: boolean;
};

type TournamentInvoiceBody = {
  discountCode?: string;
  installmentCount?: number;
};

type ManualPaymentBody = {
  amount: number;
  method: 'manual_cash' | 'manual_bank';
  reference?: string;
  notes?: string;
};

type RefundBody = {
  amount: number;
  reason?: string;
};

@Controller('billing')
export class BillingController {
  constructor(@Inject(BillingService) private readonly billingService: BillingService) {}

  @Post('membership-plans')
  @Roles('super_admin')
  @Permissions('billing.manage')
  @HttpCode(201)
  createMembershipPlan(@CurrentUser() actor: AuthenticatedUser, @Body() body: MembershipPlanBody) {
    return this.billingService.createMembershipPlan(actor, body);
  }

  @Get('membership-plans')
  @Roles('super_admin', 'school_admin')
  @Permissions('billing.read')
  listMembershipPlans() {
    return this.billingService.listMembershipPlans();
  }

  @Post('discount-codes')
  @Roles('super_admin')
  @Permissions('billing.manage')
  @HttpCode(201)
  createDiscountCode(@CurrentUser() actor: AuthenticatedUser, @Body() body: DiscountCodeBody) {
    return this.billingService.createDiscountCode(actor, body);
  }

  @Post('schools/:schoolId/memberships')
  @Roles('super_admin', 'school_admin')
  @Permissions('billing.manage')
  @HttpCode(201)
  purchaseSchoolMembership(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
    @Body() body: PurchaseMembershipBody,
  ) {
    return this.billingService.purchaseSchoolMembership(actor, schoolId, body);
  }

  @Post('tournaments/:tournamentId/registration-fee')
  @Roles('super_admin')
  @Permissions('billing.manage')
  @HttpCode(201)
  configureTournamentRegistrationFee(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('tournamentId') tournamentId: string,
    @Body() body: TournamentFeeBody,
  ) {
    return this.billingService.configureTournamentRegistrationFee(actor, tournamentId, body);
  }

  @Post('tournaments/:tournamentId/schools/:schoolId/registration-invoice')
  @Roles('super_admin', 'school_admin')
  @Permissions('billing.manage')
  @HttpCode(201)
  createTournamentRegistrationInvoice(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('tournamentId') tournamentId: string,
    @Param('schoolId') schoolId: string,
    @Body() body: TournamentInvoiceBody = {},
  ) {
    return this.billingService.createTournamentRegistrationInvoice(
      actor,
      tournamentId,
      schoolId,
      body,
    );
  }

  @Post('invoices/:invoiceId/manual-payments')
  @Roles('super_admin', 'school_admin')
  @Permissions('billing.manage')
  @HttpCode(201)
  recordManualPayment(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('invoiceId') invoiceId: string,
    @Body() body: ManualPaymentBody,
  ) {
    return this.billingService.recordManualPayment(actor, invoiceId, body);
  }

  @Post('payments/:paymentId/refunds')
  @Roles('super_admin')
  @Permissions('billing.manage')
  @HttpCode(201)
  refundPayment(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('paymentId') paymentId: string,
    @Body() body: RefundBody,
  ) {
    return this.billingService.refundPayment(actor, paymentId, body);
  }

  @Get('reports/finance')
  @Roles('super_admin', 'school_admin', 'federation_admin')
  @Permissions('billing.read')
  getFinanceReport(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('schoolId') schoolId?: string,
    @Query('tournamentId') tournamentId?: string,
    @Query('currency') currency?: string,
  ) {
    return this.billingService.getFinanceReport(actor, {
      ...(schoolId ? { schoolId } : {}),
      ...(tournamentId ? { tournamentId } : {}),
      ...(currency ? { currency } : {}),
    });
  }
}
