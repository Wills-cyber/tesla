import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { UsdtDepositFlow } from "@/components/wallet/usdt-deposit-flow";
import { UnfinishedDepositPrompt } from "@/components/wallet/unfinished-deposit-prompt";
import { StatusPill } from "@/components/common/status-pill";
import { appRoutes, authRoutes } from "@/config/navigation";
import { getAccountMode, isPreviewMode } from "@/lib/auth/session";
import { getActivePendingDeposit, resolveOrEmpty } from "@/lib/data";

export const metadata: Metadata = {
  title: "Deposit USDT",
  description: "Fund your wallet with USDT on BEP-20 or ERC-20.",
  robots: { index: false, follow: false },
};

export default async function DepositPage() {
  const account = await getAccountMode();
  if (account.mode === "anonymous") {
    redirect(authRoutes.login);
  }

  const preview = isPreviewMode(account);
  const { data: activePendingDeposit } = resolveOrEmpty(
    await getActivePendingDeposit(),
    null
  );

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      {/* Back button */}
      <Link
        href={appRoutes.wallet}
        className="flex items-center gap-2 self-start text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Wallet
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow text-brand-emphasis">Wallet</p>
          {preview ? (
            <StatusPill tone="brand" dot>
              UI Preview
            </StatusPill>
          ) : (
            <StatusPill tone="neutral" dot>
              Instant Issuance
            </StatusPill>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Deposit USDT
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Select your preferred network, enter an amount between 1,000 and 50,000 USDT, and proceed to the payment screen.
          </p>
        </div>
      </div>

      {/* If an active pending deposit exists, show resume banner */}
      {activePendingDeposit && (
        <UnfinishedDepositPrompt deposit={activePendingDeposit} />
      )}

      {/* Deposit Form Card */}
      <div className="rounded-3xl border border-hairline bg-surface-1 p-6 shadow-card sm:p-7">
        <UsdtDepositFlow />
      </div>
    </div>
  );
}
