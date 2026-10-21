import type { NextConfig } from "next";

/**
 * Hosts next/image may optimize. Food photos from any other host still render
 * (unoptimized) through FoodImage, so admins can paste any https image URL.
 */
const imageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "images.unsplash.com")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Lets phones on the same Wi-Fi load the dev server via the computer's LAN IP.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  partialPrefetching: true,
  images: {
    remotePatterns: imageHosts.map((hostname) => ({ protocol: "https", hostname })),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
