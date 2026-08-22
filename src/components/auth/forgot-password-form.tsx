"use client";

import * as React from "react";
import { Loader2, Send } from "lucide-react";

import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { useAuthForm } from "@/hooks/use-auth-form";
import { forgotPasswordAction } from "@/lib/auth/actions";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/lib/validations/auth";

/**
 * Password reset request.
 *
 * Once Supabase Auth is connected this should respond identically whether or not
 * the address exists — confirming which emails are registered is an account
 * enumeration vector. The current stand-in already behaves that way, since it
 * has no user table to check against.
 */
export function ForgotPasswordForm() {
  const { form, state, submitting, onSubmit } = useAuthForm<ForgotPasswordValues>({
    schema: forgotPasswordSchema,
    defaultValues: { email: "" },
    action: forgotPasswordAction,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormMessage state={state} />

      <FormField
        {...form.register("email")}
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="you@example.com"
        hint="We'll send a reset link to this address once accounts are live."
        error={form.formState.errors.email?.message}
        disabled={submitting}
      />

      <Button
        type="submit"
        variant="accent"
        size="md"
        disabled={submitting}
        className="mt-1 w-full"
      >
        {submitting ? (
          <>
            <Loader2 aria-hidden="true" className="animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Send />
            Send Reset Link
          </>
        )}
      </Button>
    </form>
  );
}
