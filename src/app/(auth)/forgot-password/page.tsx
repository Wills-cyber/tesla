import type { Metadata } from "next";

import { AuthCard, AuthSwitchLink } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { authRoutes } from "@/config/navigation";
import { isAuthOperational } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Request a password reset link for your TESLA Electronics account.",
  alternates: { canonical: authRoutes.forgotPassword },
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  const operational = isAuthOperational();

  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email address on your account and we'll send you a link to set a new password."
      notice={
        operational
          ? null
          : "Password reset isn't live yet — Supabase Auth is still being connected, so no email will be sent."
      }
      footer={
        <AuthSwitchLink
          prompt="Remembered it?"
          href={authRoutes.login}
          label="Back to login"
        />
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
