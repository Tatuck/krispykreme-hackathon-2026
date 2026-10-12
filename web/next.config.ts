import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page here reads live DB/cookie data, so we keep classic dynamic rendering.
  cacheComponents: false,
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.app", "*.ts.net", "100.*.*.*", "192.168.*.*", "10.*.*.*"],
  serverExternalPackages: ["@libsql/client"],
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
