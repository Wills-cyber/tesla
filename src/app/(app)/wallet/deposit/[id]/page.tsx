import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { DepositPaymentView } from "@/components/wallet/deposit-payment-view";
import { appRoutes, authRoutes } from "@/config/navigation";
import { getAccountMode } from "@/lib/auth/session";
import { getDepositById, resolveOrEmpty } from "@/lib/data";

export const metadata: Metadata = {
  title: "Deposit Payment",
  description: "Complete your USDT deposit payment.",
  robots: { index: false, follow: false },
};

export default async function DepositDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const account = await getAccountMode();
  if (account.mode === "anonymous") {
    redirect(authRoutes.login);
  }

  const depositResult = await getDepositById(id);
  const { data: deposit } = resolveOrEmpty(depositResult, null);

  if (!deposit) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <Link
          href={appRoutes.wallet}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Wallet
        </Link>

        <EmptyState
          title="Deposit request not found"
          description="We couldn't find a deposit with this reference number. It may have expired or belongs to another account."
          action={
            <Button asChild variant="accent" size="md">
              <Link href={appRoutes.deposit}>Start New Deposit</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <Link
        href={appRoutes.wallet}
        className="flex items-center gap-2 self-start text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Wallet
      </Link>

      <DepositPaymentView deposit={deposit} />
    </div>
  );
}
