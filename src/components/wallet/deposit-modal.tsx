"use client";

import * as React from "react";
import { ArrowDownToLine, Info } from "lucide-react";

import { BrandedSpinner } from "@/components/brand/branded-loader";

import { CopyField } from "@/components/wallet/copy-field";
import { CryptoAssetSelector } from "@/components/wallet/crypto-asset-selector";
import {
  NetworkSelector,
  NetworkWarning,
} from "@/components/wallet/network-selector";
import { QrCode } from "@/components/wallet/qr-code";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { requestDepositAddressAction } from "@/lib/wallet/actions";
import { cn } from "@/lib/utils";
import type { DepositAddress, PaymentMethod } from "@/types/crypto";

type DepositModalProps = {
  methods: readonly PaymentMethod[];
  /**
   * Addresses already issued to this user, keyed by method id. Only ever
   * populated from `deposit_addresses` rows — never generated client-side.
   */
  addresses?: Readonly<Record<string, DepositAddress>>;
  trigger?: React.ReactNode;
};

/**
 * Crypto deposit flow.
 *
 * The user picks an asset, then a network — never an asset alone, because an asset
 * does not exist on every chain and the address is chain-specific.
 *
 * What this component will not do:
 *   · invent a deposit address. If no `deposit_addresses` row exists for the pair,
 *     it says so. It does not render an empty field or a placeholder QR code that
 *     someone could send funds to.
 *   · report a deposit as received. Confirmations arrive from the provider webhook
 *     and are read from the `deposits` table; nothing here can credit a balance.
 *   · offer a network the backend hasn't enabled. Unsupported pairs render disabled
 *     and labelled rather than being hidden, so a missing chain is never ambiguous.
 */
export function DepositModal({
  methods,
  addresses = {},
  trigger,
}: DepositModalProps) {
  const depositMethods = React.useMemo(
    () => methods.filter((method) => method.asset && method.network),
    [methods]
  );

  const [assetSymbol, setAssetSymbol] = React.useState<string | null>(
    depositMethods[0]?.asset.symbol ?? null
  );
  const [methodId, setMethodId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  const networksForAsset = React.useMemo(
    () =>
      depositMethods.filter((method) => method.asset.symbol === assetSymbol),
    [depositMethods, assetSymbol]
  );

  const selected = methodId
    ? (networksForAsset.find((method) => method.id === methodId) ?? null)
    : null;

  const address = selected ? addresses[selected.id] : undefined;

  function chooseAsset(symbol: string) {
    setAssetSymbol(symbol);
    setMethodId(null);
    setNotice(null);
  }

  function chooseNetwork(id: string) {
    setMethodId(id);
    setNotice(null);
  }

  async function loadAddress() {
    if (!selected) return;

    setPending(true);
    setNotice(null);

    try {
      const result = await requestDepositAddressAction({ methodId: selected.id });
      setNotice(
        result.status === "success"
          ? "Deposit address ready. Refresh if it isn't shown."
          : result.message
      );
    } catch (error) {
      console.error("[DepositModal] address request failed", error);
      setNotice("We couldn't reach the server. Check your connection and retry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="accent" size="md">
            <ArrowDownToLine />
            Deposit
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto p-0 shadow-float sm:max-w-lg">
        <DialogHeader className="border-b border-hairline p-6 text-left">
          <DialogTitle className="text-xl font-semibold">Deposit</DialogTitle>
          <DialogDescription>
            Fund your wallet with crypto. Choose the asset and the exact network
            you will send from.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 p-6">
          {depositMethods.length === 0 ? (
            <EmptyMethods />
          ) : (
            <>
              <CryptoAssetSelector
                methods={depositMethods}
                value={assetSymbol}
                onChange={chooseAsset}
              />

              <NetworkSelector
                methods={networksForAsset}
                value={methodId}
                onChange={chooseNetwork}
                operation="deposit"
              />

              {selected && <NetworkWarning method={selected} />}

              {selected && address ? (
                <div className="flex flex-col items-center gap-5">
                  <QrCode
                    value={address.uri}
                    label={`QR code for your ${selected.asset.symbol} deposit address on ${selected.network.name}`}
                  />

                  <div className="flex w-full flex-col gap-4">
                    <CopyField label="Deposit address" value={address.address} />
                    {address.memo && (
                      <CopyField label="Memo / tag" value={address.memo} />
                    )}
                  </div>

                  {selected.network.requiredConfirmations !== null && (
                    <p className="text-xs text-muted-foreground">
                      Credited after{" "}
                      <span data-numeric className="font-semibold text-foreground">
                        {selected.network.requiredConfirmations}
                      </span>{" "}
                      network confirmations.
                    </p>
                  )}
                </div>
              ) : selected ? (
                <AddressUnavailable
                  method={selected}
                  pending={pending}
                  notice={notice}
                  onRetry={loadAddress}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a network to continue.
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyMethods() {
  return (
    <div className="flex gap-3 rounded-xl border border-hairline bg-surface-2 p-4">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand" />
      <p className="text-xs leading-relaxed text-muted-foreground">
        No deposit networks are configured. The supported asset and network
        combinations come from the payment provider, which isn&apos;t connected
        yet.
      </p>
    </div>
  );
}

/**
 * The honest "no address yet" state.
 *
 * A deposit address is issued by the payment provider. Until one exists there is
 * nothing to copy and nothing to scan, and this says exactly that rather than
 * rendering an empty box that reads as a loading failure.
 */
function AddressUnavailable({
  method,
  pending,
  notice,
  onRetry,
}: {
  method: PaymentMethod;
  pending: boolean;
  notice: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-dashed border-hairline-strong bg-surface-2 p-5">
      <div className="flex items-center gap-3">
        <StatusPill tone={method.depositEnabled ? "warning" : "neutral"} dot>
          {method.depositEnabled ? "No address issued" : "Not enabled"}
        </StatusPill>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {method.depositEnabled
          ? `No ${method.asset.symbol} deposit address has been issued to your account on ${method.network.name} yet.`
          : `Deposits in ${method.asset.symbol} on ${method.network.name} (${method.network.protocol}) are not enabled yet. No payment provider is connected, so no address exists and nothing can be credited.`}
      </p>

      <Button
        type="button"
        variant="hairline"
        size="md"
        onClick={onRetry}
        disabled={pending}
        className="self-start"
      >
        {pending && <BrandedSpinner />}
        Check for an address
      </Button>

      {notice && (
        <p
          role="status"
          className={cn(
            "rounded-lg border border-hairline bg-surface-1 p-3 text-xs leading-relaxed text-muted-foreground"
          )}
        >
          {notice}
        </p>
      )}
    </div>
  );
}
