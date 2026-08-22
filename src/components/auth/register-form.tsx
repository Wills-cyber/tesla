"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { BrandedSpinner } from "@/components/brand/branded-loader";

import { FormField, PasswordField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { Button } from "@/components/ui/button";
import { authRoutes } from "@/config/navigation";
import { useAuthForm } from "@/hooks/use-auth-form";
import { registerAction } from "@/lib/auth/actions";
import { registerSchema, type RegisterValues } from "@/lib/validations/auth";

/**
 * Registration form.
 *
 * Both password fields are ordinary controlled inputs: nothing is hashed here,
 * nothing is written to `localStorage`, and the values leave the component only
 * as arguments to the Server Action. Hashing and storage are Supabase Auth's job.
 */
export function RegisterForm() {
  const router = useRouter();

  const { form, state, submitting, onSubmit } = useAuthForm<RegisterValues>({
    schema: registerSchema,
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      referralCode: "",
    },
    action: registerAction,
    onSuccess: (result) => {
      router.push(result.redirectTo ?? authRoutes.afterLogin);
    },
  });

  const { errors } = form.formState;
  const password = form.watch("password");

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormMessage state={state} />

      <FormField
        {...form.register("fullName")}
        label="Full Name"
        autoComplete="name"
        placeholder="Alex Morgan"
        error={errors.fullName?.message}
        disabled={submitting}
      />

      <FormField
        {...form.register("email")}
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="you@example.com"
        error={errors.email?.message}
        disabled={submitting}
      />

      <PasswordField
        {...form.register("password")}
        label="Password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        error={errors.password?.message}
        disabled={submitting}
      >
        <PasswordStrengthMeter value={password} />
      </PasswordField>

      <PasswordField
        {...form.register("confirmPassword")}
        label="Confirm Password"
        autoComplete="new-password"
        placeholder="Re-enter your password"
        error={errors.confirmPassword?.message}
        disabled={submitting}
      />

      <FormField
        {...form.register("referralCode")}
        label="Referral Code"
        optional
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="e.g. TE-2026"
        hint="Leave blank if you weren't referred."
        error={errors.referralCode?.message}
        disabled={submitting}
      />

      <Button
        type="submit"
        variant="accent"
        size="md"
        disabled={submitting}
        className="group mt-1 w-full"
      >
        {submitting ? (
          <>
            <BrandedSpinner />
            Creating account…
          </>
        ) : (
          <>
            Create Account
            <ArrowRight className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5" />
          </>
        )}
      </Button>

      <p className="text-[0.7rem] leading-relaxed text-subtle-foreground">
        By creating an account you agree to our Terms and Privacy Policy.
        Creating an account does not commit you to any investment, and no payment
        details are collected.
      </p>
    </form>
  );
}
