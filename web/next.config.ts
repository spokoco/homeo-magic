import type { NextConfig } from "next";
import path from "path";

const isProd = process.env.NODE_ENV === "production";
const useBasePath = isProd && !process.env.SKIP_BASE_PATH;
const basePath = useBasePath ? "/homeo-magic" : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  ...(useBasePath && { basePath }),
  turbopack: {
    root: path.resolve("."),
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_SITE_ORIGIN: "https://spokoco.github.io",
  },
  allowedDevOrigins: ["dw-bee-linux.tail3eef35.ts.net"],
};

export default nextConfig;
