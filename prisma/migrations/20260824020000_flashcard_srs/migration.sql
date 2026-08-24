-- AlterTable (Leitner SRS on FlashcardMark: stage + scheduling)
ALTER TABLE "FlashcardMark" ADD COLUMN "stage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FlashcardMark" ADD COLUMN "dueAt" DATETIME;
ALTER TABLE "FlashcardMark" ADD COLUMN "lastReviewedAt" DATETIME;

-- CreateIndex
CREATE INDEX "FlashcardMark_userId_dueAt_idx" ON "FlashcardMark"("userId", "dueAt");
