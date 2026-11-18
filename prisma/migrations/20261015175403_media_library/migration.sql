-- CreateTable
CREATE TABLE "LibraryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT,
    "filename" TEXT,
    "durationSec" REAL,
    "text" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibraryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StyleAudio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoStyleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "durationSec" REAL NOT NULL,
    "postCaption" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "libraryItemId" TEXT,
    CONSTRAINT "StyleAudio_videoStyleId_fkey" FOREIGN KEY ("videoStyleId") REFERENCES "VideoStyle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StyleAudio_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "LibraryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StyleAudio" ("createdAt", "durationSec", "filename", "id", "postCaption", "url", "videoStyleId") SELECT "createdAt", "durationSec", "filename", "id", "postCaption", "url", "videoStyleId" FROM "StyleAudio";
DROP TABLE "StyleAudio";
ALTER TABLE "new_StyleAudio" RENAME TO "StyleAudio";
CREATE TABLE "new_StyleCaption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoStyleId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "libraryItemId" TEXT,
    CONSTRAINT "StyleCaption_videoStyleId_fkey" FOREIGN KEY ("videoStyleId") REFERENCES "VideoStyle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StyleCaption_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "LibraryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StyleCaption" ("createdAt", "id", "text", "videoStyleId") SELECT "createdAt", "id", "text", "videoStyleId" FROM "StyleCaption";
DROP TABLE "StyleCaption";
ALTER TABLE "new_StyleCaption" RENAME TO "StyleCaption";
CREATE TABLE "new_StyleImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoStyleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "libraryItemId" TEXT,
    CONSTRAINT "StyleImage_videoStyleId_fkey" FOREIGN KEY ("videoStyleId") REFERENCES "VideoStyle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StyleImage_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "LibraryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StyleImage" ("createdAt", "id", "url", "videoStyleId") SELECT "createdAt", "id", "url", "videoStyleId" FROM "StyleImage";
DROP TABLE "StyleImage";
ALTER TABLE "new_StyleImage" RENAME TO "StyleImage";
CREATE TABLE "new_StyleVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoStyleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "durationSec" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "libraryItemId" TEXT,
    CONSTRAINT "StyleVideo_videoStyleId_fkey" FOREIGN KEY ("videoStyleId") REFERENCES "VideoStyle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StyleVideo_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "LibraryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StyleVideo" ("createdAt", "durationSec", "id", "url", "videoStyleId") SELECT "createdAt", "durationSec", "id", "url", "videoStyleId" FROM "StyleVideo";
DROP TABLE "StyleVideo";
ALTER TABLE "new_StyleVideo" RENAME TO "StyleVideo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LibraryItem_userId_kind_idx" ON "LibraryItem"("userId", "kind");

-- Backfill: every existing template file/caption becomes a library item owned
-- by the template's user, linked 1:1 (ids are derived so the links are exact).
INSERT INTO "LibraryItem" ("id", "userId", "kind", "url", "createdAt")
SELECT 'lib_' || si."id", vs."userId", 'IMAGE', si."url", si."createdAt"
FROM "StyleImage" si JOIN "VideoStyle" vs ON vs."id" = si."videoStyleId";
UPDATE "StyleImage" SET "libraryItemId" = 'lib_' || "id";

INSERT INTO "LibraryItem" ("id", "userId", "kind", "url", "durationSec", "createdAt")
SELECT 'lib_' || sv."id", vs."userId", 'VIDEO', sv."url", sv."durationSec", sv."createdAt"
FROM "StyleVideo" sv JOIN "VideoStyle" vs ON vs."id" = sv."videoStyleId";
UPDATE "StyleVideo" SET "libraryItemId" = 'lib_' || "id";

INSERT INTO "LibraryItem" ("id", "userId", "kind", "url", "filename", "durationSec", "text", "createdAt")
SELECT 'lib_' || sa."id", vs."userId", 'AUDIO', sa."url", sa."filename", sa."durationSec", sa."postCaption", sa."createdAt"
FROM "StyleAudio" sa JOIN "VideoStyle" vs ON vs."id" = sa."videoStyleId";
UPDATE "StyleAudio" SET "libraryItemId" = 'lib_' || "id";

INSERT INTO "LibraryItem" ("id", "userId", "kind", "text", "createdAt")
SELECT 'lib_' || sc."id", vs."userId", 'CAPTION', sc."text", sc."createdAt"
FROM "StyleCaption" sc JOIN "VideoStyle" vs ON vs."id" = sc."videoStyleId";
UPDATE "StyleCaption" SET "libraryItemId" = 'lib_' || "id";
