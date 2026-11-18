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
    "layout" TEXT NOT NULL DEFAULT 'PORTRAIT_9_16',
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
INSERT INTO "new_Account" ("accessToken", "activatedAt", "active", "avatarColor", "breakMinutes", "connectedAt", "cycleLimit", "cyclePostCount", "displayName", "generating", "generatingSince", "handle", "id", "lastError", "lastPostedAt", "layout", "openId", "profileUrl", "refreshToken", "repostIntervalMinutes", "scope", "startMode", "startTimeOfDay", "tokenExpiresAt", "userId") SELECT "accessToken", "activatedAt", "active", "avatarColor", "breakMinutes", "connectedAt", "cycleLimit", "cyclePostCount", "displayName", "generating", "generatingSince", "handle", "id", "lastError", "lastPostedAt", "layout", "openId", "profileUrl", "refreshToken", "repostIntervalMinutes", "scope", "startMode", "startTimeOfDay", "tokenExpiresAt", "userId" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE UNIQUE INDEX "Account_openId_key" ON "Account"("openId");
CREATE TABLE "new_Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "claimedAt" DATETIME,
    "postedAt" DATETIME,
    "error" TEXT,
    "publishId" TEXT,
    "title" TEXT,
    "privacyLevel" TEXT,
    "allowComment" BOOLEAN NOT NULL DEFAULT false,
    "allowDuet" BOOLEAN NOT NULL DEFAULT false,
    "allowStitch" BOOLEAN NOT NULL DEFAULT false,
    "brandOrganic" BOOLEAN NOT NULL DEFAULT false,
    "brandContent" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" DATETIME,
    CONSTRAINT "Schedule_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Schedule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Schedule" ("accountId", "claimedAt", "error", "id", "postId", "postedAt", "publishId", "scheduledAt", "status") SELECT "accountId", "claimedAt", "error", "id", "postId", "postedAt", "publishId", "scheduledAt", "status" FROM "Schedule";
DROP TABLE "Schedule";
ALTER TABLE "new_Schedule" RENAME TO "Schedule";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
