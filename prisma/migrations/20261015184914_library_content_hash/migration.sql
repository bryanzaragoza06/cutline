-- AlterTable
ALTER TABLE "LibraryItem" ADD COLUMN "contentHash" TEXT;

-- CreateIndex
CREATE INDEX "LibraryItem_userId_contentHash_idx" ON "LibraryItem"("userId", "contentHash");
