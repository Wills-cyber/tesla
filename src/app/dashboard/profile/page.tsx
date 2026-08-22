import type { Metadata } from "next";
import { KeyRound, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { ProfileAvatar } from "@/components/dashboard/profile-avatar";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";
import { getAccountMode, getAccountUser, isPreviewMode } from "@/lib/auth/session";
import { getCurrentProfile, resolveOrEmpty } from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { AccountStatus } from "@/types/user";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your TESLA Electronics account details and security settings.",
  robots: { index: false, follow: false },
};

const accountStatusCopy: Record<
  AccountStatus,
  { label: string; tone: "success" | "warning" | "danger"; detail: string }
> = {
  active: {
    label: "Active",
    tone: "success",
    detail: "Your account is in good standing.",
  },
  pending_verification: {
    label: "Pending Verification",
    tone: "warning",
    detail: "Verification will be required before any funding can be accepted.",
  },
  suspended: {
    label: "Suspended",
    tone: "danger",
    detail: "Contact support to restore access to this account.",
  },
};

/**
 * Profile page.
 *
 * The password area intentionally has no "change password" form: password changes
 * belong to Supabase Auth, which will handle re-authentication and the update
 * flow. Building a form here now would mean writing a credential path twice and
 * throwing one away.
 */
export default async function DashboardProfilePage() {
  const account = await getAccountMode();
  const user = getAccountUser(account);
  const preview = isPreviewMode(account);

  const { data: profile } = resolveOrEmpty(await getCurrentProfile(), null);

  const fullName = profile?.fullName ?? user?.fullName ?? null;
  const email = profile?.email ?? user?.email ?? null;
  const status = profile?.accountStatus ?? "pending_verification";
  const statusCopy = accountStatusCopy[status];

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your account details, status and security settings."
        badge={
          preview ? (
            <StatusPill tone="gold" dot className="self-start">
              UI Preview · No account connected
            </StatusPill>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* ------------------------------------------------------ Account details */}
        <section
          aria-labelledby="account-details-heading"
          className="surface flex flex-col gap-7 rounded-xl border border-white/10 p-6 sm:p-7"
        >
          <h2 id="account-details-heading" className="text-lg font-medium">
            Account details
          </h2>

          <ProfileAvatar
            fullName={fullName}
            avatarUrl={profile?.avatarUrl ?? user?.avatarUrl ?? null}
            editable={!preview}
          />

          <dl className="flex flex-col divide-y divide-white/6 border-t border-white/8">
            <DetailRow
              icon={UserRound}
              label="Full Name"
              value={fullName ?? "Not set"}
              muted={!fullName}
            />
            <DetailRow
              icon={Mail}
              label="Email"
              value={email ?? "Not connected"}
              muted={!email}
            />
            <DetailRow
              icon={ShieldCheck}
              label="Account Status"
              value={
                <span className="flex flex-col items-end gap-1.5 text-right">
                  <StatusPill tone={statusCopy.tone} dot>
                    {statusCopy.label}
                  </StatusPill>
                  <span className="text-[0.7rem] text-muted-foreground/70">
                    {statusCopy.detail}
                  </span>
                </span>
              }
            />
            {profile?.createdAt && (
              <DetailRow
                icon={UserRound}
                label="Member Since"
                value={formatDate(profile.createdAt)}
              />
            )}
          </dl>

          {preview && (
            <p className="text-xs leading-relaxed text-muted-foreground/70">
              These fields are empty because Supabase is not connected yet. Once
              it is, they populate from your `profiles` row.
            </p>
          )}
        </section>

        {/* --------------------------------------------------- Security & session */}
        <div className="flex flex-col gap-6">
          <section
            id="security"
            aria-labelledby="security-heading"
            className="surface flex flex-col gap-5 scroll-mt-24 rounded-xl border border-white/10 p-6 sm:p-7"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-gold-300"
              >
                <KeyRound className="size-4" />
              </span>
              <h2 id="security-heading" className="text-lg font-medium">
                Password & security
              </h2>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              Password management will be handled by Supabase Auth, including
              re-authentication before a change takes effect. Until it is
              connected there is no credential to change here.
            </p>

            <ul className="flex flex-col gap-2.5 border-t border-white/8 pt-5">
              {[
                "Passwords are never stored or hashed by this application",
                "Email-verified password reset",
                "Session cookies rotated on every request",
                "Row Level Security on every table",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-gold-500/70"
                  />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>

            <Button variant="hairline" size="md" disabled className="mt-1 self-start">
              Change password — coming soon
            </Button>
          </section>

          <section
            aria-labelledby="session-heading"
            className="surface flex flex-col gap-4 rounded-xl border border-white/10 p-6 sm:p-7"
          >
            <h2 id="session-heading" className="text-lg font-medium">
              Session
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {preview
                ? "No session is active — signing out simply returns you to the home page."
                : "Signing out clears your session cookies on this device."}
            </p>

            {/* A form post so sign-out is never triggered by a link prefetch. */}
            <form action={signOutAction} className="self-start">
              <Button type="submit" variant="hairline" size="md">
                <LogOut />
                Log out
              </Button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  muted = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <dt className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
        {label}
      </dt>
      <dd
        className={
          muted
            ? "text-right text-sm text-muted-foreground/60"
            : "text-right text-sm font-medium"
        }
      >
        {value}
      </dd>
    </div>
  );
}
