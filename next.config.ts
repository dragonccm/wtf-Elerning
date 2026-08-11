import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.API_URL || "http://localhost:4000"}/:path*`,
      },
      {
        source: "/docs/:slug.pdf",
        destination: "/docs/:slug",
      },
    ];
  },
};

export default nextConfig;
