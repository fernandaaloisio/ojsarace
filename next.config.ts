import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  experimental: {
    // o formulário de submissão envia o manuscrito pela própria server action
    serverActions: { bodySizeLimit: "30mb" },
  },
};

export default config;
