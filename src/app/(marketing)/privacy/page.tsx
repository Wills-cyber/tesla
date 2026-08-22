import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${siteConfig.name} handles personal data.`,
  alternates: { canonical: "/privacy" },
};

/**
 * Privacy policy.
 *
 * Describes the current, pre-launch reality: there is no database connected, so
 * the honest answer to "what do you store" is "nothing yet". The section on what
 * will be collected once Supabase is connected is written in the future tense on
 * purpose — claiming present-tense practices we don't yet have would be wrong.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="22 August 2026"
      intro={`How ${siteConfig.name} handles personal data, and what it does not currently collect.`}
    >
      <LegalSection heading="Current status: no data is stored">
        <p>
          No database is connected to this platform yet. Information typed into
          the registration, login or password-reset forms is validated and then
          discarded — it is not written to any store, and no account record is
          created.
        </p>
        <p>
          Passwords are never hashed, logged or transmitted to any third party by
          this application. Credential handling will be performed entirely by
          Supabase Auth once it is connected.
        </p>
      </LegalSection>

      <LegalSection heading="What will be collected once accounts are live">
        <p>
          When the backend is connected, an account will store: your name, email
          address, an optional avatar, an optional referral code, your account
          status, and timestamps. If and when funding features open, records of
          your investments, scheduled and paid amounts, transactions and account
          balance will also be stored.
        </p>
        <p>
          Data will be held in a Supabase Postgres database with Row Level
          Security enabled, so a signed-in user can read and write only their own
          rows.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies">
        <p>
          Once authentication is connected, session cookies will be used to keep
          you signed in. These are strictly necessary for the service to work. No
          advertising or cross-site tracking cookies are used.
        </p>
      </LegalSection>

      <LegalSection heading="Sharing">
        <p>
          Personal data will not be sold. It will be shared only with
          infrastructure providers needed to operate the service — currently
          Supabase for database and authentication, and Vercel for hosting — and
          only to the extent required to provide it.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          Depending on where you live, you may have the right to access, correct,
          export or delete your personal data, and to object to certain
          processing. Because no data is currently stored, such a request today
          would return nothing. Once accounts are live, requests can be sent to{" "}
          <a href={`mailto:${siteConfig.contactEmail}`}>
            {siteConfig.contactEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          This policy will be updated when the backend is connected and again if
          funding features are introduced. The date at the top of this page always
          reflects the last substantive revision. See also our{" "}
          <Link href="/terms">Terms of Service</Link> and{" "}
          <Link href="/risk-disclosure">Risk Disclosure</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
