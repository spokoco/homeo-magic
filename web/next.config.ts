import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  ...(isProd && { basePath: "/homeo-magic" }),
  turbopack: {
    root: ".",
  },
  allowedDevOrigins: ["dw-bee-linux.tail3eef35.ts.net"],
};

export default nextConfig;
