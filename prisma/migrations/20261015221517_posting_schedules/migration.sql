-- CreateTable
CREATE TABLE "PostingSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startMode" TEXT NOT NULL DEFAULT 'NOW',
    "startTimeOfDay" TEXT,
    "repostIntervalMinutes" INTEGER,
    "cycleLimit" INTEGER,
    "breakMinutes" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostingSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarColor" TEXT NOT NULL DEFAULT '#f43f5e',
    "openId" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" DATETIME,
    "scope" TEXT,
    "profileUrl" TEXT,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startMode" TEXT NOT NULL DEFAULT 'NOW',
    "startTimeOfDay" TEXT,
    "activatedAt" DATETIME,
    "repostIntervalMinutes" INTEGER,
    "cycleLimit" INTEGER,
    "breakMinutes" INTEGER,
    "cyclePostCount" INTEGER NOT NULL DEFAULT 0,
    "layout" TEXT NOT NULL DEFAULT 'LANDSCAPE_16_9',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "generating" BOOLEAN NOT NULL DEFAULT false,
    "generatingSince" DATETIME,
    "lastPostedAt" DATETIME,
    "lastError" TEXT,
    "postingScheduleId" TEXT,
    "autoPrivacyLevel" TEXT,
    "autoAllowComment" BOOLEAN NOT NULL DEFAULT false,
    "autoAllowDuet" BOOLEAN NOT NULL DEFAULT false,
    "autoAllowStitch" BOOLEAN NOT NULL DEFAULT false,
    "autoBrandOrganic" BOOLEAN NOT NULL DEFAULT false,
    "autoBrandContent" BOOLEAN NOT NULL DEFAULT false,
    "autoConsentAt" DATETIME,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Account_postingScheduleId_fkey" FOREIGN KEY ("postingScheduleId") REFERENCES "PostingSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("accessToken", "activatedAt", "active", "autoAllowComment", "autoAllowDuet", "autoAllowStitch", "autoBrandContent", "autoBrandOrganic", "autoConsentAt", "autoPrivacyLevel", "avatarColor", "breakMinutes", "connectedAt", "cycleLimit", "cyclePostCount", "displayName", "generating", "generatingSince", "handle", "id", "lastError", "lastPostedAt", "layout", "openId", "profileUrl", "refreshToken", "repostIntervalMinutes", "scope", "startMode", "startTimeOfDay", "tokenExpiresAt", "userId") SELECT "accessToken", "activatedAt", "active", "autoAllowComment", "autoAllowDuet", "autoAllowStitch", "autoBrandContent", "autoBrandOrganic", "autoConsentAt", "autoPrivacyLevel", "avatarColor", "breakMinutes", "connectedAt", "cycleLimit", "cyclePostCount", "displayName", "generating", "generatingSince", "handle", "id", "lastError", "lastPostedAt", "layout", "openId", "profileUrl", "refreshToken", "repostIntervalMinutes", "scope", "startMode", "startTimeOfDay", "tokenExpiresAt", "userId" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE UNIQUE INDEX "Account_openId_key" ON "Account"("openId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Carry over existing per-account posting cycles: one schedule per distinct
-- combination of settings per user (named after its settings), then link
-- every account to its match. Null-safe matching via IS.
INSERT INTO "PostingSchedule" ("id", "userId", "name", "startMode", "startTimeOfDay", "repostIntervalMinutes", "cycleLimit", "breakMinutes", "createdAt")
SELECT
  'sch_' || lower(hex(randomblob(10))),
  c."userId",
  (CASE c."startMode" WHEN 'AT_TIME' THEN 'Starts ' || ifnull(c."startTimeOfDay", '?') || ' · ' WHEN 'COOK' THEN 'Cook · ' ELSE '' END)
  || 'Every ' ||
  (CASE WHEN c."repostIntervalMinutes" IS NULL THEN '?'
        WHEN c."repostIntervalMinutes" >= 60 THEN (c."repostIntervalMinutes" / 60) || 'h' || (CASE WHEN c."repostIntervalMinutes" % 60 > 0 THEN ' ' || (c."repostIntervalMinutes" % 60) || 'm' ELSE '' END)
        ELSE c."repostIntervalMinutes" || 'm' END)
  || ' · ' || ifnull(c."cycleLimit", '?') || ' posts · ' ||
  (CASE WHEN c."breakMinutes" IS NULL THEN '? break'
        WHEN c."breakMinutes" = 0 THEN 'no break'
        WHEN c."breakMinutes" >= 60 THEN (c."breakMinutes" / 60) || 'h' || (CASE WHEN c."breakMinutes" % 60 > 0 THEN ' ' || (c."breakMinutes" % 60) || 'm' ELSE '' END) || ' break'
        ELSE c."breakMinutes" || 'm break' END),
  c."startMode", c."startTimeOfDay", c."repostIntervalMinutes", c."cycleLimit", c."breakMinutes",
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
FROM (
  SELECT DISTINCT "userId", "startMode", "startTimeOfDay", "repostIntervalMinutes", "cycleLimit", "breakMinutes"
  FROM "Account"
  WHERE "repostIntervalMinutes" IS NOT NULL OR "cycleLimit" IS NOT NULL OR "breakMinutes" IS NOT NULL
) c;

UPDATE "Account" SET "postingScheduleId" = (
  SELECT ps."id" FROM "PostingSchedule" ps
  WHERE ps."userId" = "Account"."userId"
    AND ps."startMode" IS "Account"."startMode"
    AND ps."startTimeOfDay" IS "Account"."startTimeOfDay"
    AND ps."repostIntervalMinutes" IS "Account"."repostIntervalMinutes"
    AND ps."cycleLimit" IS "Account"."cycleLimit"
    AND ps."breakMinutes" IS "Account"."breakMinutes"
  LIMIT 1
)
WHERE "repostIntervalMinutes" IS NOT NULL OR "cycleLimit" IS NOT NULL OR "breakMinutes" IS NOT NULL;
