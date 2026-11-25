import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // In `npm run dev`, don't rebuild when the SQLite database file changes.
  // Without this, every order saved to prisma/dev.db triggered a rebuild,
  // and requests arriving mid-rebuild could fail.
  webpack: (config, { dev }) => {
    if (dev) {
      const ignored = config.watchOptions?.ignored;
      const existing = Array.isArray(ignored) ? ignored : ignored ? [ignored] : [];
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [...existing.filter((p: unknown) => typeof p === "string" && p.length > 0), "**/prisma/*.db", "**/prisma/*.db-journal"],
      };
    }
    return config;
  },
};

export default nextConfig;
