"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DefaultValues, FieldValues, UseFormReturn } from "react-hook-form";
import type { z } from "zod";

import type { ActionResult } from "@/types";

type UseAuthFormOptions<TValues extends FieldValues> = {
  /**
   * Input and output types are identical for every auth schema (see
   * `src/lib/validations/auth.ts`), which keeps the form's field types and the
   * parsed types from drifting apart.
   */
  schema: z.ZodType<TValues, TValues>;
  defaultValues: DefaultValues<TValues>;
  /** The Server Action to call on submit. */
  action: (values: TValues) => Promise<ActionResult>;
  onSuccess?: (result: Extract<ActionResult, { status: "success" }>) => void;
};

export type AuthFormState = {
  /** Set from an action result that isn't specific to one field. */
  message: string | null;
  tone: "error" | "notice" | "success" | null;
};

type UseAuthFormReturn<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>;
  state: AuthFormState;
  submitting: boolean;
  onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  dismiss: () => void;
};

/**
 * Wiring shared by all three auth forms.
 *
 * Zod validates on the client for immediate feedback, and the Server Action
 * re-validates with the same schema — client validation is UX, never a boundary.
 *
 * Server-reported field errors are pushed back into react-hook-form so they
 * render in the same place as client errors. An `unavailable` result becomes a
 * neutral notice rather than a red error: "this isn't built yet" is not the user
 * making a mistake, and colouring it as failure would misdirect the blame.
 */
export function useAuthForm<TValues extends FieldValues>({
  schema,
  defaultValues,
  action,
  onSuccess,
}: UseAuthFormOptions<TValues>): UseAuthFormReturn<TValues> {
  const [state, setState] = React.useState<AuthFormState>({
    message: null,
    tone: null,
  });

  const form = useForm<TValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onBlur",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setState({ message: null, tone: null });

    try {
      const result = await action(values as TValues);

      if (result.status === "success") {
        setState({ message: result.message ?? null, tone: "success" });
        onSuccess?.(result);
        return;
      }

      if (result.status === "unavailable") {
        setState({ message: result.message, tone: "notice" });
        return;
      }

      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          form.setError(field as Parameters<typeof form.setError>[0], {
            type: "server",
            message,
          });
        }
      }

      setState({ message: result.message, tone: "error" });
    } catch (error) {
      // A thrown action means the request never completed — network, or a bug.
      console.error("[useAuthForm] submit failed", error);
      setState({
        message:
          "We couldn't reach the server. Check your connection and try again.",
        tone: "error",
      });
    }
  });

  return {
    form,
    state,
    submitting: form.formState.isSubmitting,
    onSubmit,
    dismiss: () => setState({ message: null, tone: null }),
  };
}
