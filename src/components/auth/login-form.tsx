"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { FormField, PasswordField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { authRoutes } from "@/config/navigation";
import { useAuthForm } from "@/hooks/use-auth-form";
import { loginAction } from "@/lib/auth/actions";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";

/**
 * Login form.
 *
 * The password is passed straight to the Server Action and never touched by this
 * component beyond the controlled input — nothing is persisted to storage, and
 * the field is not part of any analytics or logging path.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  const { form, state, submitting, onSubmit } = useAuthForm<LoginValues>({
    schema: loginSchema,
    defaultValues: { email: "", password: "", rememberMe: false },
    action: loginAction,
    onSuccess: (result) => {
      router.push(result.redirectTo ?? redirectTo ?? authRoutes.afterLogin);
    },
  });

  const { errors } = form.formState;

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
        error={errors.email?.message}
        disabled={submitting}
      />

      <PasswordField
        {...form.register("password")}
        label="Password"
        autoComplete="current-password"
        placeholder="Enter your password"
        error={errors.password?.message}
        disabled={submitting}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Checkbox
            id="rememberMe"
            checked={form.watch("rememberMe")}
            onCheckedChange={(checked) =>
              form.setValue("rememberMe", checked === true, {
                shouldValidate: true,
              })
            }
            disabled={submitting}
            className="border-hairline-strong data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
          <Label
            htmlFor="rememberMe"
            className="cursor-pointer text-sm font-normal text-muted-foreground"
          >
            Remember me
          </Label>
        </div>

        <Link
          href={authRoutes.forgotPassword}
          className="text-sm text-brand-emphasis underline decoration-brand/45 underline-offset-4 transition-colors hover:decoration-brand"
        >
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        variant="accent"
        size="md"
        disabled={submitting}
        className="group mt-1 w-full"
      >
        {submitting ? (
          <>
            <Loader2 aria-hidden="true" className="animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            Login
            <ArrowRight className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5" />
          </>
        )}
      </Button>
    </form>
  );
}
