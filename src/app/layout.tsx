import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { Providers } from "@/components/providers";
import { ThemeScript } from "@/components/theme/theme-provider";
import { siteConfig } from "@/config/site";
import { THEME_COLORS } from "@/config/theme";

import "./globals.css";

/**
 * Geist, self-hosted from the official `geist` package (`src/app/fonts/`).
 *
 * The variable woff2 files ship in the repo, so the build never depends on
 * reaching fonts.googleapis.com — identical output on Vercel, in CI and
 * offline, with one less third-party request on every page load.
 */
const geistSans = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  keywords: [
    "electric vehicle investment",
    "fixed-term investment plans",
    "mobility technology",
    "EV platform",
    "investment dashboard",
  ],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    // The logo artwork is a dark presentation card, so the preview shows the full
    // lockup at 1.91:1 — the ratio both Open Graph and Twitter crop to.
    images: [
      {
        url: "/brand/og-cover.png",
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: ["/brand/og-cover.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  appleWebApp: {
    capable: true,
    title: siteConfig.shortName,
    statusBarStyle: "default",
  },
  category: "finance",
  // Pre-launch platform: nothing here is an offer, and the app is private.
  other: {
    "format-detection": "telephone=no,address=no,email=no",
  },
};

export const viewport: Viewport = {
  // Light is the default experience, so the browser chrome matches the ivory
  // page. The dark entry only applies once the user opts in.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.light },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Left zoomable on purpose — clamping it breaks accessibility.
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // Next.js 16 no longer overrides CSS smooth scrolling during navigation
      // unless asked to, and we want route changes to jump, not glide.
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {/* Applies a stored dark preference before first paint. */}
        <ThemeScript />

        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-lg focus:border focus:border-brand-border focus:bg-popover focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:shadow-float"
        >
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
