-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LibraryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT,
    "filename" TEXT,
    "durationSec" REAL,
    "text" TEXT,
    "clipStarts" TEXT NOT NULL DEFAULT '[]',
    "waveform" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibraryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LibraryItem" ("createdAt", "durationSec", "filename", "id", "kind", "text", "url", "userId") SELECT "createdAt", "durationSec", "filename", "id", "kind", "text", "url", "userId" FROM "LibraryItem";
DROP TABLE "LibraryItem";
ALTER TABLE "new_LibraryItem" RENAME TO "LibraryItem";
CREATE INDEX "LibraryItem_userId_kind_idx" ON "LibraryItem"("userId", "kind");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
