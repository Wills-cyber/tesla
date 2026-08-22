"use client";

import * as React from "react";
import { KeyRound, Mail } from "lucide-react";

import { BrandedSpinner } from "@/components/brand/branded-loader";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { requestPasswordChangeAction } from "@/lib/profile/actions";
import type { AuthFormState } from "@/hooks/use-auth-form";

/**
 * Password change.
 *
 * Implemented as an email reset rather than an in-app old/new password form. That
 * is the mechanism Supabase Auth provides, it proves control of the mailbox, and it
 * avoids building a second credential path that would be thrown away.
 *
 * The address is taken from the session inside the Server Action, so this button
 * cannot be pointed at anyone else's mailbox.
 */
export function PasswordChangeButton({ email }: { email: string | null }) {
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<AuthFormState>({
    message: null,
    tone: null,
  });

  async function request() {
    setPending(true);
    setState({ message: null, tone: null });

    try {
      const result = await requestPasswordChangeAction();

      setState({
        message: result.status === "success" ? (result.message ?? null) : result.message,
        tone:
          result.status === "success"
            ? "success"
            : result.status === "unavailable"
              ? "notice"
              : "error",
      });
    } catch (error) {
      console.error("[PasswordChangeButton] request failed", error);
      setState({
        message: "We couldn't reach the server. No email was sent.",
        tone: "error",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
        Password changes go through a verified email link. We&apos;ll send it to{" "}
        {email ? (
          <span className="font-medium text-foreground">{email}</span>
        ) : (
          "the address on your account"
        )}
        , and the link lets you set a new password.
      </p>

      <FormMessage state={state} />

      <Button
        type="button"
        variant="hairline"
        size="md"
        onClick={request}
        disabled={pending}
        className="self-start"
      >
        {pending ? <BrandedSpinner /> : <KeyRound />}
        Send password reset email
      </Button>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-subtle-foreground">
        <Mail aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        Passwords are never stored, hashed or logged by this application — Supabase
        Auth owns the credential.
      </p>
    </div>
  );
}
