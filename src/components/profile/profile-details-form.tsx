"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { BrandedSpinner } from "@/components/brand/branded-loader";
import { FormMessage } from "@/components/auth/form-message";
import { FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { updateProfileNameAction } from "@/lib/profile/actions";
import { profileSchema, type ProfileValues } from "@/lib/validations/profile";
import type { AuthFormState } from "@/hooks/use-auth-form";

/**
 * Display-name form.
 *
 * A real write: `updateProfileNameAction` updates the `profiles` row through the
 * owner-update RLS policy. Zod validates here for immediate feedback and again in
 * the action, because client validation is UX and never a boundary.
 *
 * With no backend the action returns `unavailable` and the form shows a neutral
 * notice rather than a red error — "this isn't connected yet" is not the user making
 * a mistake, and colouring it as failure misdirects the blame.
 */
export function ProfileDetailsForm({
  fullName,
  disabled = false,
}: {
  fullName: string | null;
  disabled?: boolean;
}) {
  const [state, setState] = React.useState<AuthFormState>({
    message: null,
    tone: null,
  });

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: fullName ?? "" },
    mode: "onBlur",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setState({ message: null, tone: null });

    try {
      const result = await updateProfileNameAction(values);

      if (result.status === "success") {
        setState({ message: result.message ?? "Saved.", tone: "success" });
        form.reset(values);
        return;
      }

      if (result.status === "unavailable") {
        setState({ message: result.message, tone: "notice" });
        return;
      }

      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof ProfileValues, {
            type: "server",
            message,
          });
        }
      }
      setState({ message: result.message, tone: "error" });
    } catch (error) {
      console.error("[ProfileDetailsForm] submit failed", error);
      setState({
        message: "We couldn't reach the server. Nothing was saved.",
        tone: "error",
      });
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField
        {...form.register("fullName")}
        name="fullName"
        label="Full name"
        autoComplete="name"
        placeholder="Your name"
        disabled={disabled || form.formState.isSubmitting}
        error={form.formState.errors.fullName?.message}
        hint="Shown on your account and in the app header."
      />

      <FormMessage state={state} />

      <Button
        type="submit"
        variant="hairline"
        size="md"
        disabled={disabled || form.formState.isSubmitting || !form.formState.isDirty}
        className="self-start"
      >
        {form.formState.isSubmitting && <BrandedSpinner />}
        Save changes
      </Button>
    </form>
  );
}
