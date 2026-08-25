"use client";

import * as React from "react";
import { ArrowDownToLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UsdtDepositFlow } from "@/components/wallet/usdt-deposit-flow";
import type { PaymentMethod } from "@/types/crypto";

type DepositModalProps = {
  methods?: readonly PaymentMethod[];
  trigger?: React.ReactNode;
};

/**
 * USDT Crypto deposit modal.
 *
 * Supports ONLY USDT on BEP-20 (BNB Smart Chain) and ERC-20 (Ethereum).
 */
export function DepositModal({ trigger }: DepositModalProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <DialogTitle className="text-xl font-semibold">Deposit USDT</DialogTitle>
          <DialogDescription>
            Select your preferred network, enter an amount between 1,000 and 50,000 USDT, and continue to payment.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          <UsdtDepositFlow />
        </div>
      </DialogContent>
    </Dialog>
  );
}
