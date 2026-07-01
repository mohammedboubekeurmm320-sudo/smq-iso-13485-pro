import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone" — REMOVED. Netlify's @netlify/plugin-nextjs manages
  // its own deployment format. Using "standalone" conflicts with the plugin
  // and causes request handling loops / infinite page refreshes on Netlify.
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
};

export default nextConfig;