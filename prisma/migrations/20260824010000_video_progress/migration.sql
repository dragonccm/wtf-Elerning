-- AlterTable (video resume: last playback position on ProgressEvent)
ALTER TABLE "ProgressEvent" ADD COLUMN "lastPositionSec" INTEGER;
ALTER TABLE "ProgressEvent" ADD COLUMN "lastWatchedAt" DATETIME;

-- CreateTable
CREATE TABLE "VideoChapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startSec" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoChapter_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "LessonVideo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "VideoChapter_videoId_idx" ON "VideoChapter"("videoId");
