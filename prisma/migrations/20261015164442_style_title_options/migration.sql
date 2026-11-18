-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VideoStyle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" TEXT NOT NULL,
    "defaultBucketId" TEXT,
    "secondsPerImage" REAL NOT NULL DEFAULT 1.95,
    "titleOnScreen" BOOLEAN NOT NULL DEFAULT true,
    "titleAsCaption" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoStyle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VideoStyle" ("createdAt", "defaultBucketId", "description", "id", "kind", "name", "secondsPerImage", "userId") SELECT "createdAt", "defaultBucketId", "description", "id", "kind", "name", "secondsPerImage", "userId" FROM "VideoStyle";
DROP TABLE "VideoStyle";
ALTER TABLE "new_VideoStyle" RENAME TO "VideoStyle";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
