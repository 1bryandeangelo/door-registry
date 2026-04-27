import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      canvas: { browser: "./lib/canvas-stub.js" },
    },
  },
};

export default nextConfig;
