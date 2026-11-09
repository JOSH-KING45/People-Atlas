import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return ["/login", "/guest", "/atlas", "/offline-atlas", "/account", "/auth"].map((path) => ({
      source: `${path}/:path*`,
      headers: [{ key: "X-Robots-Tag", value: "noindex" }],
    }));
  },
};

export default nextConfig;
