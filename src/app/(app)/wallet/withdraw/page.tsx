import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { WithdrawFlow } from "@/components/wallet/withdraw-flow";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/config/navigation";
import { MINIMUM_WITHDRAWAL_CENTS } from "@/config/crypto";
import { getAccountMode, isPreviewMode } from "@/lib/auth/session";
import {
  getPaymentMethods,
  getSavedAddresses,
  getUserBalance,
  getWithdrawalPolicy,
  resolveOrEmpty,
} from "@/lib/data";
import { EMPTY_BALANCE, spendableCents } from "@/types/balance";

export const metadata: Metadata = {
  title: "Withdraw",
  description: "Withdraw your TESLA Electronics balance to your own wallet.",
  robots: { index: false, follow: false },
};

/**
 * The withdrawal flow, as a route.
 *
 * A page rather than a modal, deliberately. A withdrawal is a five-decision,
 * irreversible action; a dialog gives it a cramped scroll container, an
 * accidental-dismiss surface, and no address bar to return to. A route gives it
 * the full viewport on a phone, a back button that works, and a URL — which
 * matters because the confirmation step is the one screen in the product a user
 * might want to stop on and check carefully.
 *
 * Everything the flow needs is resolved here, on the server:
 *
 *   · the supported pairs, from `payment_methods`
 *   · the policy — minimum, maximum, service fee — from `platform_settings`
 *   · the spendable balance, from `user_balances`
 *
 * The client component receives these as props and cannot change them. It never
 * derives a balance, a limit or a fee of its own, and the Server Action re-reads
 * all three before writing anything, so a tampered prop buys nothing.
 */
export default async function WithdrawPage() {
  const account = await getAccountMode();
  const preview = isPreviewMode(account);

  const [balanceResult, methodsResult, policyResult, savedResult] =
    await Promise.all([
      getUserBalance(),
      getPaymentMethods(),
      getWithdrawalPolicy(),
      getSavedAddresses(),
    ]);

  const { data: balance } = resolveOrEmpty(balanceResult, {
    userId: "preview",
    updatedAt: "",
    ...EMPTY_BALANCE,
  });

  const { data: methods } = resolveOrEmpty(methodsResult, []);
  const { data: savedAddresses } = resolveOrEmpty(savedResult, []);
  const { data: policy } = resolveOrEmpty(policyResult, {
    minimumCents: MINIMUM_WITHDRAWAL_CENTS,
    maximumCents: null,
    serviceFeeBps: 0,
    withdrawalsEnabled: false,
    depositsEnabled: false,
  });

  return (
    <>
      <PageHeader
        eyebrow="Wallet"
        title="Withdraw"
        description="Send your balance to a wallet you control. Every detail is confirmed before anything is submitted, and a crypto transfer cannot be reversed."
        badge={
          preview ? (
            <StatusPill tone="brand" dot className="self-start">
              UI Preview · No account connected
            </StatusPill>
          ) : null
        }
        actions={
          <Button asChild variant="ghost" size="md">
            <Link href={appRoutes.wallet}>
              <ArrowLeft />
              Wallet
            </Link>
          </Button>
        }
      />

      <WithdrawFlow
        methods={methods}
        savedAddresses={savedAddresses}
        policy={policy}
        spendableCents={spendableCents(balance)}
        preview={preview}
      />

      {/* ------------------------------------------------------------ Security */}
      <section className="panel-sunken flex gap-3.5 p-5">
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 size-4.5 shrink-0 text-brand"
        />
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold">How this withdrawal is handled</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Your browser never holds a signing key and never broadcasts a
            transaction. Submitting creates a <em>request</em>; the server then
            re-checks your account status, the asset and network, the destination
            address format, the minimum, the live exchange quote and your available
            balance, and the database re-validates all of it again before a row is
            written. Signing and broadcast happen inside the payment
            provider&apos;s custody infrastructure.
          </p>
        </div>
      </section>
    </>
  );
}
