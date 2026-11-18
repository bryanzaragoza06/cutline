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
    "autoPrivacyLevel" TEXT,
    "autoAllowComment" BOOLEAN NOT NULL DEFAULT false,
    "autoAllowDuet" BOOLEAN NOT NULL DEFAULT false,
    "autoAllowStitch" BOOLEAN NOT NULL DEFAULT false,
    "autoBrandOrganic" BOOLEAN NOT NULL DEFAULT false,
    "autoBrandContent" BOOLEAN NOT NULL DEFAULT false,
    "autoConsentAt" DATETIME,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("accessToken", "activatedAt", "active", "autoAllowComment", "autoAllowDuet", "autoAllowStitch", "autoBrandContent", "autoBrandOrganic", "autoConsentAt", "autoPrivacyLevel", "avatarColor", "breakMinutes", "connectedAt", "cycleLimit", "cyclePostCount", "displayName", "generating", "generatingSince", "handle", "id", "lastError", "lastPostedAt", "layout", "openId", "profileUrl", "refreshToken", "repostIntervalMinutes", "scope", "startMode", "startTimeOfDay", "tokenExpiresAt", "userId") SELECT "accessToken", "activatedAt", "active", "autoAllowComment", "autoAllowDuet", "autoAllowStitch", "autoBrandContent", "autoBrandOrganic", "autoConsentAt", "autoPrivacyLevel", "avatarColor", "breakMinutes", "connectedAt", "cycleLimit", "cyclePostCount", "displayName", "generating", "generatingSince", "handle", "id", "lastError", "lastPostedAt", "layout", "openId", "profileUrl", "refreshToken", "repostIntervalMinutes", "scope", "startMode", "startTimeOfDay", "tokenExpiresAt", "userId" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE UNIQUE INDEX "Account_openId_key" ON "Account"("openId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
