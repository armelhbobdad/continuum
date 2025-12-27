import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const isTauri = !!process.env.TAURI_ENV_PLATFORM;

const nextConfig: NextConfig = {
  typedRoutes: !isTauri,
  reactCompiler: true,
  ...(isTauri && {
    output: "export",
    distDir: "dist",
    images: {
      unoptimized: true,
    },
  }),
};

export default nextConfig;

if (!isTauri) {
  initOpenNextCloudflareForDev();
}
