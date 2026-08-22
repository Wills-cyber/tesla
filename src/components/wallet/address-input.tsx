"use client";

import * as React from "react";
import { CircleCheck, ClipboardPaste, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addressHints, isValidAddressForMethod } from "@/config/crypto";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/crypto";

/**
 * How an address stands against the chosen chain.
 *
 * `empty` is deliberately distinct from `invalid`: nothing typed yet is not a
 * mistake, and marking it as one trains people to ignore the error state.
 */
export type AddressValidity = "empty" | "invalid" | "valid";

export function checkAddress(
  method: PaymentMethod | null,
  address: string
): AddressValidity {
  const trimmed = address.trim();
  if (!trimmed) return "empty";
  if (!method) return "empty";
  return isValidAddressForMethod(method, trimmed) ? "valid" : "invalid";
}

type AddressInputProps = {
  method: PaymentMethod;
  value: string;
  onChange: (value: string) => void;
  /** Server-reported error for this field, shown in place of the local hint. */
  error?: string | null;
  id?: string;
  className?: string;
};

/**
 * The destination address field.
 *
 * Three things here are not cosmetic.
 *
 * **Validation is network-specific.** A non-empty check would happily accept a
 * Tron address for an Ethereum payout, and that transfer is unrecoverable. The
 * field validates against the *chosen pair's* address format and says so, naming
 * the chain in the error, so the mistake is legible rather than just refused.
 *
 * **Nothing is normalised.** The value is stored exactly as typed apart from
 * surrounding whitespace. No case folding, no checksum "correction", no stripping
 * of characters that look wrong. Silently altering a destination is how a user
 * verifies one string and pays out to another.
 *
 * **Paste is a real button.** On mobile, long-press-to-paste into a monospace
 * field is fiddly and typing a 42-character address by hand is where transcription
 * errors come from. `readText()` needs permission and is unavailable on insecure
 * origins, so the failure path says what to do instead of doing nothing.
 */
export function AddressInput({
  method,
  value,
  onChange,
  error,
  id = "withdrawal-address",
  className,
}: AddressInputProps) {
  const [pasteError, setPasteError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const validity = checkAddress(method, value);
  const hint = addressHints[method.network.addressFormat];

  // The address the user typed is never rewritten; only the surrounding
  // whitespace a clipboard tends to carry is dropped.
  function commit(next: string) {
    setPasteError(null);
    onChange(next.trim());
  }

  async function paste() {
    setPasteError(null);

    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setPasteError("Your clipboard is empty.");
        return;
      }
      commit(text);
      inputRef.current?.focus();
    } catch {
      setPasteError(
        "Clipboard access was blocked. Paste with Ctrl/⌘+V into the field instead."
      );
      inputRef.current?.focus();
    }
  }

  const message = error ?? pasteError ?? null;
  const tone = error || pasteError || validity === "invalid" ? "error" : "muted";

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="text-sm font-medium">
          Wallet Address
        </Label>
        <span className="text-[0.7rem] text-muted-foreground">
          {method.asset.symbol} · {method.network.protocol}
        </span>
      </div>

      <div className="flex items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            ref={inputRef}
            id={id}
            name="destinationAddress"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="done"
            placeholder={
              method.network.addressFormat === "tron"
                ? "Enter destination wallet address (T…)"
                : "Enter destination wallet address (0x…)"
            }
            value={value}
            onChange={(event) => commit(event.target.value)}
            aria-invalid={
              error || validity === "invalid" ? true : undefined
            }
            aria-describedby={`${id}-help`}
            className={cn(
              "h-12 pr-10 font-mono text-xs sm:text-[0.8rem]",
              validity === "valid" &&
                !error &&
                "border-success/45 focus-visible:border-success",
              (validity === "invalid" || error) &&
                "border-destructive/50 focus-visible:border-destructive"
            )}
          />

          {/* Inline state marker, inside the field so it survives narrow widths. */}
          {value.trim().length > 0 && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-3 flex items-center"
            >
              {validity === "valid" && !error ? (
                <CircleCheck className="size-4 text-success" />
              ) : (
                <TriangleAlert className="size-4 text-destructive" />
              )}
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="hairline"
          size="icon-xl"
          onClick={paste}
          aria-label="Paste address from clipboard"
          title="Paste"
          className="h-12 w-12 shrink-0"
        >
          <ClipboardPaste />
        </Button>

        <Button
          type="button"
          variant="hairline"
          size="icon-xl"
          onClick={() => commit("")}
          disabled={value.length === 0}
          aria-label="Clear address"
          title="Clear"
          className="h-12 w-12 shrink-0"
        >
          <X />
        </Button>
      </div>

      <p
        id={`${id}-help`}
        className={cn(
          "text-xs leading-relaxed",
          tone === "error" ? "text-destructive" : "text-muted-foreground"
        )}
        {...(tone === "error" ? { role: "alert" } : {})}
      >
        {message ??
          (validity === "invalid"
            ? `That isn't a valid ${method.network.name} address. ${hint}`
            : validity === "valid"
              ? `Valid ${method.network.name} address format.`
              : hint)}
      </p>
    </div>
  );
}
