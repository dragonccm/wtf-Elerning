-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "avatarUrl" TEXT,
    "bio" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "disabledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatarUrl", "bio", "createdAt", "email", "id", "name", "passwordHash", "role", "updatedAt") SELECT "avatarUrl", "bio", "createdAt", "email", "id", "name", "passwordHash", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Upgrade existing courses and enrollments without losing learning data.
UPDATE "Course"
SET "status" = CASE WHEN "published" = 1 THEN 'PUBLISHED' ELSE 'DRAFT' END,
    "publishedAt" = CASE WHEN "published" = 1 THEN CURRENT_TIMESTAMP ELSE NULL END,
    "creatorId" = "teacherId";
UPDATE "Unit" SET "status" = 'PUBLISHED' WHERE "courseId" IN (SELECT "id" FROM "Course" WHERE "status" = 'PUBLISHED');
UPDATE "LessonNode" SET "status" = 'PUBLISHED' WHERE "unitId" IN (SELECT "id" FROM "Unit" WHERE "status" = 'PUBLISHED');

INSERT INTO "Classroom" ("id", "courseId", "teacherId", "name", "code", "passwordHash", "status", "createdAt", "updatedAt")
SELECT 'legacy-' || c."id", c."id", c."teacherId", c."title" || ' · Lớp mặc định',
       'LEGACY-' || upper(substr(c."id", 1, 8)), u."passwordHash", 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Course" c JOIN "User" u ON u."id" = c."teacherId"
WHERE c."teacherId" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "Enrollment" e WHERE e."courseId" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "Classroom" x WHERE x."courseId" = c."id");

INSERT INTO "ClassroomMember" ("id", "classroomId", "userId", "joinedAt")
SELECT 'legacy-member-' || e."id", 'legacy-' || e."courseId", e."userId", e."enrolledAt"
FROM "Enrollment" e
WHERE EXISTS (SELECT 1 FROM "Classroom" c WHERE c."id" = 'legacy-' || e."courseId")
  AND NOT EXISTS (SELECT 1 FROM "ClassroomMember" m WHERE m."classroomId" = 'legacy-' || e."courseId" AND m."userId" = e."userId");
