import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * SQLite connection settings. socket_timeout (seconds) is how long a query may
 * wait on a locked database before failing with P1008 — the default 5s was too
 * short to ride out a slow write. Existing params in DATABASE_URL win.
 */
function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("file:") || url.includes("socket_timeout")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}socket_timeout=20`;
}

// DATABASE_URL isn't set during `next build` in Docker (only at runtime), and
// PrismaClient rejects an explicit undefined url — so only override when set.
const url = databaseUrl();
export const prisma = globalForPrisma.prisma ?? new PrismaClient(url ? { datasources: { db: { url } } } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// accessToken/refreshToken/tokenExpiresAt/scope must NEVER reach the client —
// use this select wherever an Account is nested in an API response.
export const SAFE_ACCOUNT_SELECT = {
  id: true,
  handle: true,
  displayName: true,
  avatarColor: true,
  openId: true,
  profileUrl: true,
  connectedAt: true,
  active: true,
  generating: true,
  lastPostedAt: true,
  lastError: true,
  startMode: true,
  startTimeOfDay: true,
  activatedAt: true,
  repostIntervalMinutes: true,
  cycleLimit: true,
  breakMinutes: true,
  cyclePostCount: true,
  layout: true,
  postingScheduleId: true,
  autoPrivacyLevel: true,
  autoAllowComment: true,
  autoAllowDuet: true,
  autoAllowStitch: true,
  autoBrandOrganic: true,
  autoBrandContent: true,
  autoConsentAt: true,
} as const;
