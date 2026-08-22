import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Risk Disclosure",
  description:
    "Risk disclosure for TESLA Electronics: what published plan terms mean, what they do not guarantee, and the risks of investing.",
  alternates: { canonical: "/risk-disclosure" },
};

/**
 * Risk disclosure.
 *
 * This is the page the FAQ and every plan card point at. It is deliberately blunt
 * about three things: figures are stated terms rather than guarantees, no
 * protection scheme applies, and nothing on the platform is advice.
 */
export default function RiskDisclosurePage() {
  return (
    <LegalPage
      title="Risk Disclosure"
      updated="22 August 2026"
      intro="Please read this before relying on anything published on this platform. It explains what the figures on an investment plan mean and what they do not."
    >
      <LegalSection heading="Stated terms are not guarantees">
        <p>
          Every monetary figure attached to an investment plan on this platform —
          investment amount, weekly stated profit, total stated profit, principal
          and completion amount — is a <strong>stated term</strong>. It describes
          what the plan proposes to pay if it performs exactly as published.
        </p>
        <p>
          Stated terms are not a guarantee, warranty, promise or assurance of
          profit. They are not a forecast, and they are not a record of money that
          has been received, held or paid to anyone.
        </p>
      </LegalSection>

      <LegalSection heading="The platform is pre-launch">
        <p>
          {siteConfig.name} is a pre-launch product. As of the date above:
        </p>
        <ul>
          <li>No deposits can be made and no payment provider is connected.</li>
          <li>No withdrawals can be made and no funds are held.</li>
          <li>No investment plan can be activated or funded.</li>
          <li>
            No investment has been sold, no capital has been accepted, and no
            profit has been paid to anyone.
          </li>
        </ul>
        <p>
          Nothing on this platform constitutes an offer, solicitation or
          invitation to invest, or a recommendation to buy or sell any financial
          product.
        </p>
      </LegalSection>

      <LegalSection heading="Capital is at risk">
        <p>
          Investing involves risk. If and when plans become available, committing
          capital could result in losing some or all of it. Past or projected
          performance of any market, vehicle segment or technology is not a
          reliable indicator of future results.
        </p>
      </LegalSection>

      <LegalSection heading="No deposit protection or compensation scheme">
        <p>
          Amounts described on this platform are not protected by any deposit
          insurance, investor compensation scheme or government guarantee. We make
          no claim to hold any licence, registration or regulatory authorisation.
          Where such authorisation is required before a feature can operate, that
          feature will remain switched off until it is obtained.
        </p>
      </LegalSection>

      <LegalSection heading="Not financial advice">
        <p>
          Nothing published on this platform is financial, investment, tax, legal
          or accounting advice, and nothing here takes account of your particular
          circumstances, objectives or risk tolerance. Consider obtaining
          independent professional advice before making any financial decision.
        </p>
      </LegalSection>

      <LegalSection heading="No affiliation with Tesla, Inc.">
        <p>{siteConfig.affiliationDisclaimer}</p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          If anything here is unclear, read the{" "}
          <Link href="/#faq">frequently asked questions</Link> or the{" "}
          <Link href="/terms">Terms of Service</Link>. Do not act on an assumption
          about how a plan works — ask first.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
