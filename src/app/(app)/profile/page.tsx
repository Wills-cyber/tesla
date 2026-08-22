import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  KeyRound,
  LogOut,
  Mail,
  Palette,
  ScrollText,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { ProfileAvatar } from "@/components/dashboard/profile-avatar";
import { NotificationPreferences } from "@/components/profile/notification-preferences";
import { PasswordChangeButton } from "@/components/profile/password-change-button";
import { ProfileDetailsForm } from "@/components/profile/profile-details-form";
import { StatusPill, type PillTone } from "@/components/common/status-pill";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { legalRoutes } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { signOutAction } from "@/lib/auth/actions";
import { getAccountMode, getAccountUser, isPreviewMode } from "@/lib/auth/session";
import {
  getCurrentProfile,
  getUnreadNotificationCount,
  resolveOrEmpty,
} from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { AccountStatus } from "@/types/user";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your TESLA Electronics account details and security settings.",
  robots: { index: false, follow: false },
};

const accountStatusCopy: Record<
  AccountStatus,
  { label: string; tone: PillTone; detail: string }
> = {
  active: {
    label: "Active",
    tone: "success",
    detail: "Your account is in good standing.",
  },
  pending_verification: {
    label: "Pending verification",
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
 * Profile.
 *
 * Account details, security, notifications and appearance — the settings surface.
 * Everything on it does something real: the name form writes to `profiles`, the
 * password button asks Supabase Auth to email a reset link, the theme control
 * persists a preference, and sign-out is a form post so it can't fire on a link
 * prefetch. Where a capability has no backend yet, the section says so instead of
 * offering a control that would silently do nothing.
 */
export default async function ProfilePage() {
  const account = await getAccountMode();
  const user = getAccountUser(account);
  const preview = isPreviewMode(account);

  const [profileResult, unreadResult] = await Promise.all([
    getCurrentProfile(),
    getUnreadNotificationCount(),
  ]);

  const { data: profile } = resolveOrEmpty(profileResult, null);
  const { data: unreadCount } = resolveOrEmpty(unreadResult, 0);

  const fullName = profile?.fullName ?? user?.fullName ?? null;
  const email = profile?.email ?? user?.email ?? null;
  const status = profile?.accountStatus ?? "pending_verification";
  const statusCopy = accountStatusCopy[status];

  return (
    <>
      <PageHeader
        eyebrow="Profile"
        title="Profile & settings"
        description="Your account details, security, notifications and appearance."
        badge={
          preview ? (
            <StatusPill tone="brand" dot className="self-start">
              UI Preview · No account connected
            </StatusPill>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] xl:items-start">
        {/* ---------------------------------------------------- Account details */}
        <div className="flex flex-col gap-6">
          <Section
            id="account"
            icon={UserRound}
            title="Account details"
            heading="account-details-heading"
          >
            <ProfileAvatar
              fullName={fullName}
              avatarUrl={profile?.avatarUrl ?? user?.avatarUrl ?? null}
              editable={!preview}
            />

            <div className="border-t border-hairline pt-6">
              <ProfileDetailsForm fullName={fullName} disabled={preview} />
            </div>

            <dl className="flex flex-col divide-y divide-hairline border-t border-hairline">
              <DetailRow
                icon={Mail}
                label="Email"
                value={email ?? "Not connected"}
                muted={!email}
                hint="Changing your email address requires re-verification and isn't available yet."
              />
              <DetailRow
                icon={ShieldCheck}
                label="Account status"
                value={
                  <span className="flex flex-col items-end gap-1.5 text-right">
                    <StatusPill tone={statusCopy.tone} dot>
                      {statusCopy.label}
                    </StatusPill>
                    <span className="text-[0.7rem] text-subtle-foreground">
                      {statusCopy.detail}
                    </span>
                  </span>
                }
              />
              {profile?.createdAt && (
                <DetailRow
                  icon={UserRound}
                  label="Member since"
                  value={formatDate(profile.createdAt)}
                />
              )}
            </dl>

            {preview && (
              <p className="text-xs leading-relaxed text-subtle-foreground">
                These fields are empty because Supabase is not connected yet. Once it
                is, they populate from your <code>profiles</code> row.
              </p>
            )}
          </Section>

          <Section
            id="notifications"
            icon={Bell}
            title="Notifications"
            heading="notifications-heading"
          >
            <NotificationPreferences unreadCount={unreadCount} />
          </Section>
        </div>

        {/* ------------------------------------------------- Security & session */}
        <div className="flex flex-col gap-6">
          <Section
            id="security"
            icon={KeyRound}
            title="Password & security"
            heading="security-heading"
          >
            <PasswordChangeButton email={email} />

            <ul className="flex flex-col gap-2.5 border-t border-hairline pt-5">
              {[
                "Passwords are never stored or hashed by this application",
                "Email-verified password reset",
                "Session cookies rotated on every request",
                "Row Level Security on every database table",
                "No signing key or wallet secret is ever sent to your browser",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-brand"
                  />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            id="appearance"
            icon={Palette}
            title="Appearance"
            heading="appearance-heading"
          >
            <p className="text-sm leading-relaxed text-muted-foreground">
              The light theme is the platform default. Dark mode is available as a
              personal preference and is stored on this device only.
            </p>
            <div className="border-t border-hairline">
              <ThemeToggle variant="row" />
            </div>
          </Section>

          <Section
            id="legal"
            icon={ScrollText}
            title="Legal"
            heading="legal-heading"
          >
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              Investment figures shown on this platform are stated plan terms.
              Nothing here is financial, investment, tax or legal advice.
            </p>
            <p className="text-xs leading-relaxed text-subtle-foreground">
              {siteConfig.affiliationDisclaimer}
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Button asChild variant="hairline" size="md">
                <Link href={legalRoutes.terms}>Terms</Link>
              </Button>
              <Button asChild variant="ghost" size="md">
                <Link href={legalRoutes.privacy}>Privacy</Link>
              </Button>
            </div>
          </Section>

          <Section id="session" icon={LogOut} title="Session" heading="session-heading">
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
          </Section>
        </div>
      </div>
    </>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  heading,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={heading}
      className="panel flex scroll-mt-24 flex-col gap-6 p-6 sm:p-7"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-hairline bg-surface-2 text-brand"
        >
          <Icon className="size-4" />
        </span>
        <h2 id={heading} className="text-lg font-semibold">
          {title}
        </h2>
      </div>

      {children}
    </section>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  hint,
  muted = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <dt className="flex flex-col gap-1">
        <span className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Icon aria-hidden="true" className="size-3.5 shrink-0" />
          {label}
        </span>
        {hint && (
          <span className="max-w-56 text-[0.7rem] leading-relaxed text-subtle-foreground">
            {hint}
          </span>
        )}
      </dt>
      <dd
        className={
          muted
            ? "text-right text-sm text-subtle-foreground"
            : "text-right text-sm font-medium"
        }
      >
        {value}
      </dd>
    </div>
  );
}
