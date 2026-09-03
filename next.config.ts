import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Emits .next/standalone so the Docker image ships a minimal self-contained server. */
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  serverExternalPackages: ["pg"],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
