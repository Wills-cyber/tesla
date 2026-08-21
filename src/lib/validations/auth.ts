import { z } from "zod";

/**
 * Auth form schemas.
 *
 * Shared by the client (react-hook-form resolver) and the Server Actions, so
 * validation can't be bypassed by disabling JavaScript or posting directly.
 *
 * Input and output types are kept identical (no `.default()`, no unions) so the
 * form's field types and the parsed types never drift apart.
 */

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email address is required.")
  .max(254, "That email address is too long.")
  .pipe(z.email("Enter a valid email address."));

const passwordField = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Passwords are limited to 72 characters.")
  .regex(/[a-z]/, "Include at least one lowercase letter.")
  .regex(/[A-Z]/, "Include at least one uppercase letter.")
  .regex(/\d/, "Include at least one number.");

const fullNameField = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(80, "That name is too long.")
  .regex(
    /^[\p{L}\p{M}][\p{L}\p{M}\s'’.-]*$/u,
    "Use letters, spaces, hyphens and apostrophes only."
  );

/** Optional in practice: an empty string is valid and treated as "none". */
const referralCodeField = z
  .string()
  .trim()
  .max(24, "Referral codes are at most 24 characters.")
  .regex(/^[A-Za-z0-9-]*$/, "Use letters, numbers and hyphens only.");

export const registerSchema = z
  .object({
    fullName: fullNameField,
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, "Confirm your password."),
    referralCode: referralCodeField,
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password."),
  rememberMe: z.boolean(),
});

export const forgotPasswordSchema = z.object({ email: emailField });

export type RegisterValues = z.infer<typeof registerSchema>;
export type LoginValues = z.infer<typeof loginSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/**
 * Rough strength signal for the register form's meter.
 *
 * Purely a UI affordance — `registerSchema` is what actually gates submission.
 */
export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
};

export function scorePassword(value: string): PasswordStrength {
  if (!value) return { score: 0, label: "Enter a password" };

  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^\w\s]/.test(value)) score += 1;

  const clamped = Math.min(4, score) as PasswordStrength["score"];
  const labels = ["Too weak", "Weak", "Fair", "Strong", "Very strong"] as const;

  return { score: clamped, label: labels[clamped] };
}
