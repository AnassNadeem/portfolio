import { defineConfig, type Plugin } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/** Swap placeholder domain in sitemap.xml / robots.txt after build. */
function injectSiteUrl(siteUrl: string): Plugin {
  const origin = siteUrl.replace(/\/$/, "") || "https://anasnadeem.dev";
  return {
    name: "inject-site-url",
    closeBundle() {
      const dist = join(process.cwd(), "dist");
      for (const file of ["sitemap.xml", "robots.txt"] as const) {
        const path = join(dist, file);
        if (!existsSync(path)) continue;
        const next = readFileSync(path, "utf8").replaceAll(
          "https://anasnadeem.dev",
          origin,
        );
        writeFileSync(path, next);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = env.VITE_SITE_URL || "https://anasnadeem.dev";

  return {
    plugins: [react(), injectSiteUrl(siteUrl)],
    build: {
      chunkSizeWarningLimit: 1700,
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
    },
  };
});
