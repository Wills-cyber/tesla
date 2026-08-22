import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileQuestion } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { WithdrawalStatusCard } from "@/components/wallet/withdrawal-status-card";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/config/navigation";
import { getAccountMode, isPreviewMode } from "@/lib/auth/session";
import {
  getPaymentMethods,
  getWithdrawalById,
  resolveOrEmpty,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "Withdrawal",
  description: "The status of a TESLA Electronics withdrawal request.",
  robots: { index: false, follow: false },
};

/** A UUID, and nothing else. Anything else is a 404 rather than a query. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A single withdrawal request's status.
 *
 * This is both the post-submission success screen and the permanent record — the
 * same component either way, reading whatever the row currently says. There is no
 * separate "just submitted" view holding optimistic state, which is why a reload
 * one second after submitting shows exactly what a reload next week would.
 *
 * Access is safe by construction, twice over: `getWithdrawalById` filters on the
 * caller's `user_id`, and Row Level Security on `withdrawal_requests` restricts
 * the table to its owner regardless. A guessed UUID therefore yields a 404, not
 * someone else's destination address.
 *
 * The `preview` case is separated from the not-found case on purpose. With no
 * backend connected there is genuinely nothing to look up, and telling the user
 * that is more useful than a 404 implying they followed a broken link.
 */
export default async function WithdrawalDetailPage({
  params,
}: PageProps<"/wallet/withdraw/[id]">) {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) notFound();

  const account = await getAccountMode();
  const preview = isPreviewMode(account);

  const [withdrawalResult, methodsResult] = await Promise.all([
    getWithdrawalById(id),
    getPaymentMethods(),
  ]);

  const { data: methods } = resolveOrEmpty(methodsResult, []);
  const { data: withdrawal, error } = resolveOrEmpty(withdrawalResult, null);

  // A real query failure is not a missing record. Say which it was.
  if (error) {
    return (
      <>
        <BackLink />
        <EmptyState
          icon={FileQuestion}
          title="We couldn't load this withdrawal"
          description={error}
          action={
            <Button asChild variant="hairline" size="md">
              <Link href={appRoutes.wallet}>Return to Wallet</Link>
            </Button>
          }
        />
      </>
    );
  }

  if (!withdrawal) {
    if (!preview) notFound();

    return (
      <>
        <BackLink />
        <EmptyState
          icon={FileQuestion}
          title="No withdrawal to show"
          description="No backend is connected, so there are no withdrawal records to look up."
          note="This is not an error. Withdrawals are not enabled yet — no payout provider is connected, so no request has ever been created and nothing has been sent on-chain."
          action={
            <Button asChild variant="hairline" size="md">
              <Link href={appRoutes.wallet}>Return to Wallet</Link>
            </Button>
          }
        />
      </>
    );
  }

  const method = methods.find(
    (candidate) => candidate.id === withdrawal.methodId
  );

  return (
    <>
      <BackLink />

      <PageHeader
        eyebrow="Wallet"
        title="Withdrawal"
        description="The live status of this request, read from the record itself."
        badge={
          preview ? (
            <StatusPill tone="brand" dot className="self-start">
              UI Preview · No account connected
            </StatusPill>
          ) : null
        }
      />

      <WithdrawalStatusCard withdrawal={withdrawal} method={method} />
    </>
  );
}

function BackLink() {
  return (
    <div>
      <Button asChild variant="ghost" size="sm">
        <Link href={appRoutes.wallet}>
          <ArrowLeft />
          Wallet
        </Link>
      </Button>
    </div>
  );
}
