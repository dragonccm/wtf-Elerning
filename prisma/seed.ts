import { PrismaClient, QuestionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.classInvitation.deleteMany();
  await prisma.classroomMember.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.errorMark.deleteMany();
  await prisma.essayFeedback.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.flashcardMark.deleteMany();
  await prisma.progressEvent.deleteMany();
  await prisma.studySession.deleteMany();
  await prisma.question.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.flashcard.deleteMany();
  await prisma.flashcardDeck.deleteMany();
  await prisma.lessonVideo.deleteMany();
  await prisma.lessonNode.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@wtf.edu",
      name: "Quản trị viên",
      role: "ADMIN",
      passwordHash,
    },
  });

  const teacher = await prisma.user.create({
    data: {
      email: "teacher@wtf.edu",
      name: "Cô Lan",
      role: "TEACHER",
      passwordHash,
    },
  });

  const student = await prisma.user.create({
    data: {
      email: "student@wtf.edu",
      name: "Minh Anh",
      role: "STUDENT",
      passwordHash,
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: "hocvien2@wtf.edu",
      name: "Tuấn Kiệt",
      role: "STUDENT",
      passwordHash,
    },
  });

  const course = await prisma.course.create({
    data: {
      title: "Tiếng Trung Cơ Bản HSK1",
      description: "Chào hỏi, giới thiệu bản thân và từ vựng đời sống.",
      level: "HSK1",
      teacherId: teacher.id,
      creatorId: teacher.id,
      reviewerId: admin.id,
      category: "HSK",
      status: "PUBLISHED",
      publishedAt: new Date(),
      units: {
        create: [
          {
            title: "Unit 1 — Chào hỏi",
            objective: "Dùng câu chào cơ bản, làm quen bạn mới",
            orderIndex: 1,
            status: "PUBLISHED",
          },
          {
            title: "Unit 2 — Gia đình",
            objective: "Nói về người thân và quan hệ",
            orderIndex: 2,
            status: "PUBLISHED",
          },
        ],
      },
    },
    include: { units: true },
  });

  const unit1 = course.units.find((u) => u.orderIndex === 1)!;
  const unit2 = course.units.find((u) => u.orderIndex === 2)!;

  await prisma.enrollment.createMany({
    data: [
      { userId: student.id, courseId: course.id },
      { userId: student2.id, courseId: course.id },
    ],
  });

  const classroom = await prisma.classroom.create({
    data: {
      courseId: course.id,
      teacherId: teacher.id,
      name: "HSK1 · Lớp tối 2026",
      code: "HSK1-DEMO",
      passwordHash,
      status: "ACTIVE",
      startsAt: new Date("2026-08-01T00:00:00+07:00"),
      endsAt: new Date("2026-12-31T23:59:59+07:00"),
      members: { create: [{ userId: student.id }, { userId: student2.id }] },
    },
  });

  const videoNode = await prisma.lessonNode.create({
    data: {
      unitId: unit1.id,
      title: "Video: Xin chào",
      type: "VIDEO",
      orderIndex: 1,
      status: "PUBLISHED",
      video: {
        create: {
          videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
          pdfUrl: "/docs/unit1-greetings",
          durationSec: 420,
          summary: "Học cách chào hỏi: 你好, 早上好, 再见.",
        },
      },
    },
  });

  const flashNode = await prisma.lessonNode.create({
    data: {
      unitId: unit1.id,
      title: "Flashcard chào hỏi",
      type: "FLASHCARD",
      orderIndex: 2,
      status: "PUBLISHED",
      flashcardDeck: {
        create: {
          title: "Chào hỏi cơ bản",
          topic: "Greetings",
          level: "HSK1",
          cards: {
            create: [
              {
                hanzi: "你好",
                pinyin: "nǐ hǎo",
                meaningVi: "Xin chào",
                example: "你好！我叫小明。",
              },
              {
                hanzi: "谢谢",
                pinyin: "xièxie",
                meaningVi: "Cảm ơn",
                example: "谢谢你！",
              },
              {
                hanzi: "再见",
                pinyin: "zàijiàn",
                meaningVi: "Tạm biệt",
                example: "再见，明天见！",
              },
              {
                hanzi: "早上好",
                pinyin: "zǎoshang hǎo",
                meaningVi: "Chào buổi sáng",
                example: "老师，早上好！",
              },
            ],
          },
        },
      },
    },
  });

  const quizNode = await prisma.lessonNode.create({
    data: {
      unitId: unit1.id,
      title: "Kiểm tra Unit 1",
      type: "QUIZ",
      orderIndex: 3,
      status: "PUBLISHED",
      assessment: {
        create: {
          title: "Quiz chào hỏi",
          description: "Trắc nghiệm tự động chấm",
          passScore: 70,
          questions: {
            create: [
              {
                type: QuestionType.SINGLE,
                prompt: "「你好」nghĩa là gì?",
                optionsJson: JSON.stringify(["Xin chào", "Tạm biệt", "Cảm ơn", "Xin lỗi"]),
                answerJson: JSON.stringify("Xin chào"),
                orderIndex: 1,
                points: 1,
              },
              {
                type: QuestionType.MULTI,
                prompt: "Chọn các cách chào phù hợp buổi sáng",
                optionsJson: JSON.stringify(["早上好", "晚安", "你好", "再见"]),
                answerJson: JSON.stringify(["早上好", "你好"]),
                orderIndex: 2,
                points: 2,
              },
              {
                type: QuestionType.FILL,
                prompt: "Điền Pinyin của 谢谢",
                answerJson: JSON.stringify("xièxie"),
                orderIndex: 3,
                points: 1,
              },
              {
                type: QuestionType.ORDER,
                prompt: "Sắp xếp thành câu: 我 / 叫 / 小明",
                optionsJson: JSON.stringify(["我", "叫", "小明"]),
                answerJson: JSON.stringify(["我", "叫", "小明"]),
                orderIndex: 4,
                points: 2,
              },
              {
                type: QuestionType.LISTEN,
                prompt: "Bạn nghe thấy từ nào? (mô phỏng: nǐ hǎo)",
                optionsJson: JSON.stringify(["你好", "谢谢", "再见", "对不起"]),
                answerJson: JSON.stringify("你好"),
                orderIndex: 5,
                points: 1,
              },
              {
                type: QuestionType.MATCH,
                prompt: "Ghép nghĩa đúng cho 再见",
                optionsJson: JSON.stringify(["Tạm biệt", "Xin chào", "Cảm ơn"]),
                answerJson: JSON.stringify("Tạm biệt"),
                orderIndex: 6,
                points: 1,
              },
            ],
          },
        },
      },
    },
  });

  const essayNode = await prisma.lessonNode.create({
    data: {
      unitId: unit1.id,
      title: "Tự luận: Giới thiệu bản thân",
      type: "ESSAY",
      orderIndex: 4,
      status: "PUBLISHED",
      assessment: {
        create: {
          title: "Viết đoạn giới thiệu",
          passScore: 60,
          questions: {
            create: [
              {
                type: QuestionType.ESSAY_TOPIC,
                prompt: "Viết 3–5 câu giới thiệu tên, quốc tịch và lời chào bằng tiếng Trung (có thể kèm Pinyin).",
                answerJson: JSON.stringify(""),
                orderIndex: 1,
                points: 10,
              },
            ],
          },
        },
      },
    },
  });

  await prisma.lessonNode.create({
    data: {
      unitId: unit1.id,
      title: "Hoàn thành Unit 1",
      type: "MILESTONE",
      orderIndex: 5,
      xpReward: 50,
      status: "PUBLISHED",
    },
  });

  await prisma.lessonNode.create({
    data: {
      unitId: unit2.id,
      title: "Video: Gia đình tôi",
      type: "VIDEO",
      orderIndex: 1,
      status: "PUBLISHED",
      video: {
        create: {
          videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
          durationSec: 360,
          summary: "Từ vựng gia đình: 爸爸, 妈妈, 哥哥, 妹妹.",
        },
      },
    },
  });

  // Unlock first node only: mark nothing completed for student initially
  // Pre-complete video for demo of chain for student2
  await prisma.progressEvent.create({
    data: {
      userId: student2.id,
      nodeId: videoNode.id,
      completed: true,
      timeSpentSec: 400,
      completedAt: new Date(),
    },
  });

  await prisma.studySession.create({
    data: {
      userId: student.id,
      durationSec: 1200,
      endedAt: new Date(),
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  for (const u of [admin, teacher, student, student2]) {
    await prisma.userStreak.create({
      data: { userId: u.id, currentStreak: u.email === "student@wtf.edu" ? 3 : 1, longestStreak: 5, lastActiveDate: today, totalXp: 120 },
    });
    await prisma.dailyGoal.create({
      data: { userId: u.id, date: today, targetXp: 20, earnedXp: u.email === "student@wtf.edu" ? 10 : 0 },
    });
  }

  console.log("Seeded users:");
  console.log("  admin@wtf.edu / password123");
  console.log("  teacher@wtf.edu / password123");
  console.log("  student@wtf.edu / password123");
  console.log(`Course: ${course.title}`);
  console.log(`Class: ${classroom.code} / password123`);
  console.log(`Nodes: video=${videoNode.id}, flash=${flashNode.id}, quiz=${quizNode.id}, essay=${essayNode.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
