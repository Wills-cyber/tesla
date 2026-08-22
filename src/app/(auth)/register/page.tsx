import type { Metadata } from "next";

import { AuthCard, AuthSwitchLink } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { authRoutes } from "@/config/navigation";
import { isAuthOperational } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create a TESLA Electronics account to explore fixed-term electric vehicle investment plan terms.",
  alternates: { canonical: authRoutes.register },
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  const operational = isAuthOperational();

  return (
    <AuthCard
      title="Create your account"
      description="Account creation is free. You'll be able to review every published plan term before anything is available to fund."
      notice={
        operational
          ? null
          : "Accounts aren't live yet — Supabase Auth is still being connected. Nothing you enter here is saved, and no account is created."
      }
      footer={
        <AuthSwitchLink
          prompt="Already have an account?"
          href={authRoutes.login}
          label="Login"
        />
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
