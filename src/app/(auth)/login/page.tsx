import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard, AuthSwitchLink } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { authRoutes } from "@/config/navigation";
import { isAuthOperational } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Login",
  description:
    "Sign in to your TESLA Electronics account to review investment plan terms and track your account.",
  alternates: { canonical: authRoutes.login },
  // Auth screens have no business in a search index.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  const operational = isAuthOperational();

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to review your account and the published plan terms."
      notice={
        operational
          ? null
          : "Sign-in isn't live yet — Supabase Auth is still being connected. The form validates properly, but there are no accounts to sign in to."
      }
      footer={
        <AuthSwitchLink
          prompt="Don't have an account?"
          href={authRoutes.register}
          label="Create one"
        />
      }
    >
      {/* `useSearchParams` needs a Suspense boundary during prerender. */}
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden="true">
      <Skeleton className="h-[4.6rem] w-full rounded-lg" />
      <Skeleton className="h-[4.6rem] w-full rounded-lg" />
      <Skeleton className="h-5 w-full rounded-md" />
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}
