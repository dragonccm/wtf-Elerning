-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordVersion" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Classroom_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Classroom_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClassroomMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classroomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassroomMember_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassroomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClassInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classroomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sentAt" DATETIME,
    "acceptedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassInvitation_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassInvitation_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClassInvitation_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detailJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT NOT NULL DEFAULT 'HSK1',
    "coverColor" TEXT NOT NULL DEFAULT '#1FA97A',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "teacherId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'HSK',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "creatorId" TEXT,
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Course_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Course_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Course" ("coverColor", "createdAt", "description", "id", "level", "published", "teacherId", "title", "updatedAt") SELECT "coverColor", "createdAt", "description", "id", "level", "published", "teacherId", "title", "updatedAt" FROM "Course";
DROP TABLE "Course";
ALTER TABLE "new_Course" RENAME TO "Course";
CREATE TABLE "new_LessonNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    CONSTRAINT "LessonNode_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LessonNode" ("id", "orderIndex", "title", "type", "unitId", "xpReward") SELECT "id", "orderIndex", "title", "type", "unitId", "xpReward" FROM "LessonNode";
DROP TABLE "LessonNode";
ALTER TABLE "new_LessonNode" RENAME TO "LessonNode";
CREATE TABLE "new_Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    CONSTRAINT "Unit_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Unit" ("courseId", "id", "objective", "orderIndex", "title") SELECT "courseId", "id", "objective", "orderIndex", "title" FROM "Unit";
DROP TABLE "Unit";
ALTER TABLE "new_Unit" RENAME TO "Unit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_code_key" ON "Classroom"("code");

-- CreateIndex
CREATE INDEX "Classroom_teacherId_status_idx" ON "Classroom"("teacherId", "status");

-- CreateIndex
CREATE INDEX "Classroom_courseId_idx" ON "Classroom"("courseId");

-- CreateIndex
CREATE INDEX "ClassroomMember_userId_idx" ON "ClassroomMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomMember_classroomId_userId_key" ON "ClassroomMember"("classroomId", "userId");

-- CreateIndex
CREATE INDEX "ClassInvitation_email_status_idx" ON "ClassInvitation"("email", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storedName_key" ON "MediaAsset"("storedName");

-- CreateIndex
CREATE INDEX "MediaAsset_ownerId_idx" ON "MediaAsset"("ownerId");
