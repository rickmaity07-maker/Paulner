import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Photos come from the Unsplash CDN, which resizes them itself; see lib/image-loader.ts.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
  },
};

export default nextConfig;
