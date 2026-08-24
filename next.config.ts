import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/docs/:slug.pdf",
        destination: "/docs/:slug",
      },
    ];
  },
};

export default nextConfig;
