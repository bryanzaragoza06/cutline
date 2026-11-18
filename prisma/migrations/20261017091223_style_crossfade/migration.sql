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
    "secondsPerImage" REAL NOT NULL DEFAULT 1.65,
    "crossfadeSec" REAL NOT NULL DEFAULT 0.3,
    "titleOnScreen" BOOLEAN NOT NULL DEFAULT true,
    "titleAsCaption" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoStyle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VideoStyle" ("createdAt", "defaultBucketId", "description", "id", "kind", "name", "secondsPerImage", "titleAsCaption", "titleOnScreen", "userId") SELECT "createdAt", "defaultBucketId", "description", "id", "kind", "name", "secondsPerImage", "titleAsCaption", "titleOnScreen", "userId" FROM "VideoStyle";
DROP TABLE "VideoStyle";
ALTER TABLE "new_VideoStyle" RENAME TO "VideoStyle";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- secondsPerImage used to mean "start of one clip to the start of the next"
-- (it included the fixed 0.3s fade). It now means hold time before the fade,
-- with the fade set separately. Convert so existing templates keep the same
-- clip count and timing: hold = old − 0.3 with a 0.3s fade; for very fast
-- templates (old < 0.6s) keep the 0.3s minimum hold and shorten the fade.
-- (SQLite evaluates every SET expression against the pre-update row.)
UPDATE "VideoStyle" SET
  "crossfadeSec" = CASE WHEN "secondsPerImage" < 0.6 THEN MAX(0.01, ROUND("secondsPerImage" - 0.3, 2)) ELSE 0.3 END,
  "secondsPerImage" = CASE WHEN "secondsPerImage" < 0.6 THEN 0.3 ELSE ROUND("secondsPerImage" - 0.3, 2) END;
