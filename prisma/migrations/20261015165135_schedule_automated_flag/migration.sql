-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "automated" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Schedule_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Schedule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Schedule" ("accountId", "allowComment", "allowDuet", "allowStitch", "brandContent", "brandOrganic", "claimedAt", "consentAt", "error", "id", "postId", "postedAt", "privacyLevel", "publishId", "scheduledAt", "status", "title") SELECT "accountId", "allowComment", "allowDuet", "allowStitch", "brandContent", "brandOrganic", "claimedAt", "consentAt", "error", "id", "postId", "postedAt", "privacyLevel", "publishId", "scheduledAt", "status", "title" FROM "Schedule";
DROP TABLE "Schedule";
ALTER TABLE "new_Schedule" RENAME TO "Schedule";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
