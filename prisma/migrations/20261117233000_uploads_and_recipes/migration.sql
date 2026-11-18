-- AlterTable
ALTER TABLE "Post" ADD COLUMN "durationSec" REAL;
ALTER TABLE "Post" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'UPLOAD';

-- AlterTable
ALTER TABLE "GeneratedVideo" ADD COLUMN "recipeJson" TEXT;
ALTER TABLE "GeneratedVideo" ADD COLUMN "recipeHash" TEXT;

-- CreateIndex
CREATE INDEX "GeneratedVideo_recipeHash_idx" ON "GeneratedVideo"("recipeHash");
