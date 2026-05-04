const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://spokoco.github.io";

export const APP_BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

export function appPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${APP_BASE_PATH}${normalizedPath}`;
}

export const metadataBase = new URL(SITE_ORIGIN);
