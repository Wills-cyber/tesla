import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of service for using the ${siteConfig.name} platform.`,
  alternates: { canonical: "/terms" },
};

/**
 * Terms of service.
 *
 * Scoped to what the platform actually does today: accounts and published plan
 * terms. It does not purport to govern deposits, withdrawals or investment
 * contracts, because none of those exist yet — terms for those will be issued
 * with the features themselves.
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="22 August 2026"
      intro={`These terms govern your use of the ${siteConfig.name} website and platform. By creating an account or using the site, you agree to them.`}
    >
      <LegalSection heading="1. What this platform currently is">
        <p>
          {siteConfig.name} is a pre-launch platform. Today it allows you to
          create an account and review the published terms of proposed fixed-term
          investment plans. It does not accept deposits, process withdrawals,
          activate investments or hold funds of any kind.
        </p>
        <p>
          Nothing on this platform is an offer, solicitation or invitation to
          invest, or a recommendation regarding any financial product. See the{" "}
          <Link href="/risk-disclosure">Risk Disclosure</Link> for what the
          published figures do and do not mean.
        </p>
      </LegalSection>

      <LegalSection heading="2. Eligibility and your account">
        <p>
          You must be at least 18 years old and legally able to enter into a
          contract to hold an account. You agree to provide accurate information
          and to keep your credentials confidential. You are responsible for
          activity that occurs under your account.
        </p>
        <p>
          We may suspend or close an account that is used unlawfully, that
          misrepresents its holder, or that attempts to interfere with the
          platform or other users.
        </p>
      </LegalSection>

      <LegalSection heading="3. Plan information">
        <p>
          Plan terms are published as descriptions of what a plan proposes. We aim
          to keep them accurate and internally consistent, but they may be
          corrected, changed or withdrawn before a plan becomes available.
        </p>
        <p>
          A plan being visible on this platform does not mean it is available,
          approved, or capable of being funded.
        </p>
      </LegalSection>

      <LegalSection heading="4. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>Use the platform for any unlawful purpose.</li>
          <li>
            Attempt to gain unauthorised access to any account, system or data.
          </li>
          <li>
            Probe, scan, overload or disrupt the service or its infrastructure.
          </li>
          <li>
            Scrape, republish or misrepresent platform content as your own or as
            endorsed by anyone.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. No affiliation with Tesla, Inc.">
        <p>{siteConfig.affiliationDisclaimer}</p>
      </LegalSection>

      <LegalSection heading="6. No advice">
        <p>
          Nothing on this platform is financial, investment, tax, legal or
          accounting advice, and none of it takes account of your circumstances or
          objectives. Consider independent professional advice before making any
          financial decision.
        </p>
      </LegalSection>

      <LegalSection heading="7. Availability and changes">
        <p>
          The platform is provided on an &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo; basis while in pre-launch. Features may change, be
          delayed, or be removed. We do not warrant uninterrupted or error-free
          operation.
        </p>
        <p>
          We may update these terms. Where a change is material we will make it
          apparent on this page and, once notifications are operational, in your
          dashboard.
        </p>
      </LegalSection>

      <LegalSection heading="8. Liability">
        <p>
          To the fullest extent permitted by law, we are not liable for indirect,
          incidental, special or consequential loss arising from your use of the
          platform. Nothing in these terms excludes liability that cannot lawfully
          be excluded.
        </p>
      </LegalSection>

      <LegalSection heading="9. Contact">
        <p>
          Questions about these terms can be sent to{" "}
          <a href={`mailto:${siteConfig.contactEmail}`}>
            {siteConfig.contactEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
