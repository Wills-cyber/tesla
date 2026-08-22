"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  /** Also used as the `for`/`id` pairing, so it must be unique per form. */
  name: string;
  label: string;
  error?: string;
  hint?: string;
  /** Renders "Optional" beside the label instead of leaving it ambiguous. */
  optional?: boolean;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentProps<"input">, "name" | "id" | "className">;

/**
 * A labelled input with accessible error wiring.
 *
 * `aria-invalid` plus `aria-describedby` is what makes a screen reader announce
 * the validation message when focus lands on the field — a red border alone is
 * invisible to assistive tech and to anyone who can't distinguish the colour.
 */
export function FormField({
  name,
  label,
  error,
  hint,
  optional = false,
  className,
  children,
  ...inputProps
}: FormFieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={name} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        {optional && (
          <span className="text-[0.7rem] tracking-wide text-subtle-foreground">
            Optional
          </span>
        )}
      </div>

      <Input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="text-[0.95rem]"
        {...inputProps}
      />

      {hint && !error && (
        <p id={hintId} className="text-xs leading-relaxed text-subtle-foreground">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs leading-relaxed text-destructive"
        >
          {error}
        </p>
      )}

      {children}
    </div>
  );
}

type PasswordFieldProps = Omit<FormFieldProps, "type">;

/**
 * Password input with a show/hide toggle.
 *
 * The toggle is a real `<button>` inside the field, labelled for screen readers
 * and excluded from the tab order's visual jump by sitting immediately after the
 * input in the DOM.
 */
export function PasswordField({
  name,
  label,
  error,
  hint,
  className,
  children,
  ...inputProps
}: PasswordFieldProps) {
  const [visible, setVisible] = React.useState(false);
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
      </Label>

      <div className="relative">
        <Input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="pr-11 text-[0.95rem]"
          {...inputProps}
        />

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="size-4" />
          ) : (
            <Eye aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>

      {hint && !error && (
        <p id={hintId} className="text-xs leading-relaxed text-subtle-foreground">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs leading-relaxed text-destructive"
        >
          {error}
        </p>
      )}

      {children}
    </div>
  );
}
