import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Course thumbnails come from the (separate) backend / CDN as plain URLs.
  // We render them with a normal <img>, so no next/image domain config needed.
  reactStrictMode: true,
  // The root Zeminent app has its own lockfile; pin the workspace root here
  // so Turbopack doesn't infer the parent directory.
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
