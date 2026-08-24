import { PrismaClient, QuestionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.classMaterial.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.assignmentNode.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.announcement.deleteMany();
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
  await prisma.videoChapter.deleteMany();
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
          videoUrl: "/uploads/demo-lesson.mp4",
          pdfUrl: "/docs/unit1-greetings",
          durationSec: 10,
          summary: "Học cách chào hỏi: 你好, 早上好, 再见.",
          chapters: {
            create: [
              { title: "Mở đầu", startSec: 0, orderIndex: 0 },
              { title: "Chào hỏi", startSec: 4, orderIndex: 1 },
              { title: "Luyện phát âm", startSec: 7, orderIndex: 2 },
            ],
          },
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

  // SRS demo marks for student (Minh Anh): 2 cards due now + 1 due in 7 days + 再见 left unmarked (new)
  const flashDeck = await prisma.flashcardDeck.findUniqueOrThrow({
    where: { nodeId: flashNode.id },
    include: { cards: true },
  });
  const cardByHanzi = (hanzi: string) => flashDeck.cards.find((c) => c.hanzi === hanzi);
  const cardHello = cardByHanzi("你好");
  const cardThanks = cardByHanzi("谢谢");
  const cardMorning = cardByHanzi("早上好");
  if (cardHello && cardThanks && cardMorning) {
    const srsNow = new Date();
    await prisma.flashcardMark.createMany({
      data: [
        { userId: student.id, flashcardId: cardHello.id, known: true, stage: 1, dueAt: new Date(srsNow.getTime() - 60_000), lastReviewedAt: new Date(srsNow.getTime() - 86_400_000) },
        { userId: student.id, flashcardId: cardThanks.id, known: true, stage: 2, dueAt: new Date(srsNow.getTime() - 1_200_000), lastReviewedAt: new Date(srsNow.getTime() - 3 * 86_400_000) },
        { userId: student.id, flashcardId: cardMorning.id, known: true, stage: 3, dueAt: new Date(srsNow.getTime() + 7 * 86_400_000), lastReviewedAt: new Date(srsNow.getTime() - 7 * 86_400_000) },
      ],
    });
  }

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

  // --- Classroom core demo data: announcement, assignment, live session, material ---
  const assignment = await prisma.assignment.create({
    data: {
      classroomId: classroom.id,
      createdBy: teacher.id,
      title: "Ôn Unit 1: quiz + tự luận",
      description: "Hoàn thành \"Kiểm tra Unit 1\" và bài tự luận \"Giới thiệu bản thân\". Tự luận sẽ được cô chấm và phản hồi chi tiết.",
      dueAt: new Date(Date.now() + 7 * 86_400_000),
      publishedAt: new Date(),
      nodes: {
        create: [
          { nodeId: quizNode.id, orderIndex: 1 },
          { nodeId: essayNode.id, orderIndex: 2 },
        ],
      },
    },
  });

  await prisma.announcement.create({
    data: {
      classroomId: classroom.id,
      authorId: teacher.id,
      title: "Tuần này: chào hỏi (Unit 1)",
      body: "Xem video Unit 1 và làm flashcard trước tối thứ 7. Bài tập quiz + tự luận đã được giao, hạn chót 7 ngày.",
    },
  });

  await prisma.classSession.create({
    data: {
      classroomId: classroom.id,
      title: "Luyện nói trực tiếp: Chào hỏi",
      startsAt: new Date(Date.now() + 3 * 86_400_000 + 2 * 3_600_000),
      endsAt: new Date(Date.now() + 3 * 86_400_000 + 3 * 3_600_000),
      status: "SCHEDULED",
    },
  });

  const materialAsset = await prisma.mediaAsset.create({
    data: {
      ownerId: teacher.id,
      originalName: "giaovan-unit1.pdf",
      storedName: "seed-unit1-lecture.pdf",
      mimeType: "application/pdf",
      size: 204_800,
      url: "/docs/unit1-greetings",
    },
  });
  await prisma.classMaterial.create({
    data: {
      classroomId: classroom.id,
      mediaAssetId: materialAsset.id,
      title: "Giáo án Unit 1 (tài liệu in)",
      addedById: teacher.id,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: student.id, type: "ASSIGNMENT", title: `Bài tập mới: ${assignment.title}`,
        message: "Cô Lan vừa giao bài tập mới. Hạn chót trong 7 ngày.", href: `/classes/${classroom.id}`,
      },
      {
        userId: student.id, type: "LIVE_SESSION", title: "Lớp trực tiếp: Luyện nói — Chào hỏi",
        message: "Cô Lan đã lên lịch lớp học trực tiếp trong 3 ngày tới.", href: `/classes/${classroom.id}`,
      },
      {
        userId: student2.id, type: "ASSIGNMENT", title: `Bài tập mới: ${assignment.title}`,
        message: "Cô Lan vừa giao bài tập mới. Hạn chót trong 7 ngày.", href: `/classes/${classroom.id}`,
      },
    ],
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
          videoUrl: "/uploads/demo-lesson.mp4",
          durationSec: 10,
          summary: "Từ vựng gia đình: 爸爸, 妈妈, 哥哥, 妹妹.",
          chapters: {
            create: [
              { title: "Mở đầu", startSec: 0, orderIndex: 0 },
              { title: "Từ vựng gia đình", startSec: 5, orderIndex: 1 },
            ],
          },
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

  // Partial watch for student (Minh Anh) — demos resume on the video player
  await prisma.progressEvent.create({
    data: {
      userId: student.id,
      nodeId: videoNode.id,
      completed: false,
      timeSpentSec: 5,
      lastPositionSec: 3,
      lastWatchedAt: new Date(Date.now() - 3_600_000),
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
