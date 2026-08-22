import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The dashboard used to own every authenticated page under `/dashboard/*`.
   * The application is now organised into five top-level areas, so these keep
   * old links, bookmarks and notification `href`s working instead of 404ing.
   */
  async redirects() {
    return [
      { source: "/dashboard/investments", destination: "/invest", permanent: false },
      { source: "/dashboard/deposit", destination: "/wallet", permanent: false },
      { source: "/dashboard/withdraw", destination: "/wallet", permanent: false },
      {
        source: "/dashboard/transactions",
        destination: "/wallet/activity",
        permanent: false,
      },
      { source: "/dashboard/profile", destination: "/profile", permanent: false },
      {
        source: "/dashboard/notifications",
        destination: "/notifications",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
