"use server";

import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/session";
import { gradeAnswers } from "@/lib/scoring";
import { completeNode } from "@/lib/progress";
import { awardXp } from "@/lib/streak";
import { SRS_INTERVAL_DAYS, SRS_LAPSE_MINUTES, SRS_MAX_STAGE } from "@/lib/drill";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ErrorType, QuestionType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  if (name.length < 2) redirect("/profile?error=name");
  await prisma.user.update({ where: { id: user.id }, data: { name, bio } });
  revalidatePath("/profile");
  redirect("/profile?ok=1");
}

export async function forgotPasswordAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  void email;
  redirect("/forgot-password?sent=1");
}

export async function completeVideoAction(nodeId: string) {
  const user = await requireUser();
  const node = await prisma.lessonNode.findUnique({
    where: { id: nodeId },
    include: { unit: true, video: true },
  });
  if (!node) throw new Error("Video not found");
  const progress = await prisma.progressEvent.findUnique({
    where: { userId_nodeId: { userId: user.id, nodeId } },
  });
  const watchedSec = progress?.lastPositionSec ?? 0;
  const timeSpentSec = watchedSec > 0 ? watchedSec : (node.video?.durationSec ?? 0);
  await completeNode(user.id, nodeId, 100, Math.max(timeSpentSec, 1));
  revalidatePath("/learn");
  revalidatePath(`/learn/${node.unit.courseId}`);
  redirect(`/learn/${node.unit.courseId}`);
}

export async function markFlashcardAction(flashcardId: string, known: boolean) {
  const user = await requireUser();
  await prisma.flashcardMark.upsert({
    where: { userId_flashcardId: { userId: user.id, flashcardId } },
    create: { userId: user.id, flashcardId, known },
    update: { known },
  });
  revalidatePath("/learn");
}

export async function completeFlashcardTestAction(nodeId: string, resultsJson: string) {
  const user = await requireUser();
  const results = JSON.parse(resultsJson) as { flashcardId: string; correct: boolean }[];

  const node = await prisma.lessonNode.findUnique({
    where: { id: nodeId },
    include: { flashcardDeck: { include: { cards: true } } },
  });
  if (!node?.flashcardDeck) throw new Error("Flashcard deck not found");

  const deckIds = new Set(node.flashcardDeck.cards.map((c) => c.id));
  const valid = results.filter((r) => deckIds.has(r.flashcardId));
  if (valid.length !== node.flashcardDeck.cards.length) {
    throw new Error("Chưa hoàn thành đủ câu kiểm tra");
  }

  const correctCount = valid.filter((r) => r.correct).length;
  const passScore = Math.ceil(node.flashcardDeck.cards.length * 0.8);
  if (correctCount < passScore) {
    throw new Error(`Cần ${passScore} câu đúng để hoàn thành`);
  }

  await Promise.all(
    valid.map((r) =>
      prisma.flashcardMark.upsert({
        where: { userId_flashcardId: { userId: user.id, flashcardId: r.flashcardId } },
        create: { userId: user.id, flashcardId: r.flashcardId, known: r.correct },
        update: { known: r.correct },
      }),
    ),
  );

  const score = Math.round((correctCount / node.flashcardDeck.cards.length) * 100);
  await completeNode(user.id, nodeId, score, 300);
  revalidatePath("/learn");
  redirect("/learn");
}

export async function completeFlashcardDeckAction(nodeId: string) {
  const user = await requireUser();
  await completeNode(user.id, nodeId, 100, 300);
  revalidatePath("/learn");
  redirect("/learn");
}

/**
 * Apply the SRS outcome of a quick drill session.
 * resultsJson: { flashcardId, correct }[] — final result per unique card
 * (a card answered wrong then right in the same session counts as correct).
 */
export async function finishDrillAction(resultsJson: string) {
  const user = await requireUser();
  const results = JSON.parse(resultsJson) as { flashcardId: string; correct: boolean }[];
  if (!Array.isArray(results) || results.length === 0) redirect("/drills");

  const now = new Date();
  for (const r of results) {
    if (typeof r.flashcardId !== "string") continue;
    const existing = await prisma.flashcardMark.findUnique({
      where: { userId_flashcardId: { userId: user.id, flashcardId: r.flashcardId } },
    });
    const stage = r.correct ? Math.min((existing?.stage ?? 0) + 1, SRS_MAX_STAGE) : 0;
    const dueAt = r.correct
      ? new Date(now.getTime() + SRS_INTERVAL_DAYS[stage - 1] * 86_400_000)
      : new Date(now.getTime() + SRS_LAPSE_MINUTES * 60_000);
    await prisma.flashcardMark.upsert({
      where: { userId_flashcardId: { userId: user.id, flashcardId: r.flashcardId } },
      create: {
        userId: user.id,
        flashcardId: r.flashcardId,
        known: stage >= 1,
        stage,
        dueAt,
        lastReviewedAt: now,
      },
      update: { known: stage >= 1, stage, dueAt, lastReviewedAt: now },
    });
  }

  // Small XP reward for a real session (at least 3 unique cards)
  if (new Set(results.map((r) => r.flashcardId)).size >= 3) {
    await awardXp(user.id, 5, "drill:flashcards");
  }
  revalidatePath("/learn");
  revalidatePath("/drills");
  redirect("/learn");
}

export async function submitQuizAction(assessmentId: string, nodeId: string, answersJson: string) {
  const user = await requireUser();
  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      node: {
        unit: {
          course: {
            OR: [
              { enrollments: { some: { userId: user.id } } },
              { classrooms: { some: { members: { some: { userId: user.id } } } } },
            ],
          },
        },
      },
    },
    include: {
      questions: { orderBy: { orderIndex: "asc" } },
      node: { include: { progress: { where: { userId: user.id } } } },
    },
  });
  if (!assessment || assessment.nodeId !== nodeId) throw new Error("Assessment not found");

  const unfinishedPrerequisites = await prisma.lessonNode.count({
    where: {
      unitId: assessment.node.unitId,
      orderIndex: { lt: assessment.node.orderIndex },
      progress: { none: { userId: user.id, completed: true } },
    },
  });
  if (unfinishedPrerequisites > 0) throw new Error("Lesson is still locked");

  const answers = JSON.parse(answersJson) as { questionId: string; responseJson: string }[];
  const allowedQuestionIds = new Set(assessment.questions.map((question) => question.id));
  if (answers.some((answer) => !allowedQuestionIds.has(answer.questionId))) {
    throw new Error("Invalid answer payload");
  }

  const graded = gradeAnswers(assessment.questions, answers);

  const submission = await prisma.submission.create({
    data: {
      userId: user.id,
      assessmentId,
      score: graded.score,
      maxScore: graded.maxScore,
      autoGraded: true,
      status: "GRADED",
      gradedAt: new Date(),
      answers: {
        create: answers.map((a) => {
          const detail = graded.details.find((d) => d.questionId === a.questionId);
          return {
            questionId: a.questionId,
            responseJson: a.responseJson,
            isCorrect: detail?.isCorrect ?? false,
            pointsEarned: detail?.pointsEarned ?? 0,
          };
        }),
      },
    },
  });

  const passed = graded.percent >= assessment.passScore;
  const firstCompletion = !assessment.node.progress.some((progress) => progress.completed);
  if (passed && firstCompletion) await awardXp(user.id, assessment.node.xpReward, "quiz_pass");

  if (passed) {
    await completeNode(user.id, nodeId, graded.percent, 600);
  }

  redirect(`/learn/results/${submission.id}`);
}

export async function submitEssayAction(assessmentId: string, nodeId: string, text: string) {
  const user = await requireUser();
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { questions: true },
  });
  if (!assessment || assessment.nodeId !== nodeId) throw new Error("Không tìm thấy bài tự luận");
  const question = assessment.questions[0];
  if (!question || !question.type.startsWith("ESSAY")) throw new Error("Bài tự luận không hợp lệ");
  const cleanText = text.trim();
  if (cleanText.length < 10) throw new Error("Bài viết cần ít nhất 10 ký tự");
  const submission = await prisma.submission.create({
    data: {
      userId: user.id,
      assessmentId,
      maxScore: question?.points ?? 10,
      autoGraded: false,
      status: "SUBMITTED",
      answers: {
        create: [
          {
            questionId: question.id,
            responseJson: JSON.stringify(cleanText),
          },
        ],
      },
    },
  });
  // node completes after teacher grades
  void nodeId;
  redirect(`/learn/results/${submission.id}`);
}

export async function gradeEssayAction(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const submissionId = String(formData.get("submissionId"));
  const score = Number(formData.get("score"));
  const comment = String(formData.get("comment") || "");
  const errorType = String(formData.get("errorType") || "GRAMMAR") as ErrorType;
  const excerpt = String(formData.get("excerpt") || "");
  const suggestion = String(formData.get("suggestion") || "");

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { answers: true },
  });
  if (!submission || submission.autoGraded || submission.status !== "SUBMITTED") {
    throw new Error("Bài nộp không còn chờ chấm");
  }
  if (teacher.role !== "ADMIN") {
    const ownsSubmission = await prisma.enrollment.count({
      where: { userId: submission.userId, course: { teacherId: teacher.id } },
    });
    if (!ownsSubmission) throw new Error("Bạn không có quyền chấm bài này");
  }
  if (!Number.isFinite(score) || score < 0 || score > (submission.maxScore ?? 10)) {
    throw new Error("Điểm không hợp lệ");
  }

  await prisma.essayFeedback.create({
    data: {
      submissionId,
      teacherId: teacher.id,
      score,
      comment,
      errorMarks:
        excerpt && suggestion
          ? {
              create: [{ type: errorType, excerpt, suggestion }],
            }
          : undefined,
    },
  });

  await prisma.submission.update({
    where: { id: submissionId },
    data: { score, status: "GRADED", gradedAt: new Date() },
  });

  const assessment = await prisma.assessment.findUnique({ where: { id: submission.assessmentId } });
  if (assessment) {
    await completeNode(submission.userId, assessment.nodeId, score, 0);
  }

  revalidatePath("/teacher/grading");
  redirect("/teacher/grading");
}

export async function createCourseAction(formData: FormData) {
  const user = await requireRole("TEACHER");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const level = String(formData.get("level") || "HSK1");
  const teacherId = String(formData.get("teacherId") || "") || null;
  const category = z.enum(["HSK", "COMMUNICATION", "EXAM"]).catch("HSK").parse(formData.get("category"));
  if (!title) redirect("/admin/courses?error=title");
  await prisma.course.create({
    data: {
      title,
      description,
      level,
      category,
      teacherId: user.role === "ADMIN" ? teacherId : user.id,
      creatorId: user.id,
      status: "DRAFT",
      published: false,
    },
  });
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/content");
  redirect(user.role === "ADMIN" ? "/admin/courses?ok=created" : "/teacher/content?ok=created");
}

export async function createUnitAction(formData: FormData) {
  const user = await requireRole("TEACHER");
  const courseId = String(formData.get("courseId") || "");
  const title = String(formData.get("title") || "").trim();
  const objective = String(formData.get("objective") || "").trim();
  if (!courseId || !title) redirect("/admin/courses?error=unit");
  const course = await prisma.course.findFirst({ where: { id: courseId, ...(user.role === "ADMIN" ? {} : { teacherId: user.id }), status: { in: ["DRAFT", "PENDING_REVIEW"] } } });
  if (!course || course.status === "PENDING_REVIEW") redirect(user.role === "ADMIN" ? "/admin/courses?error=locked" : "/teacher/content?error=locked");

  const lastUnit = await prisma.unit.findFirst({
    where: { courseId },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true },
  });
  await prisma.unit.create({
    data: { courseId, title, objective: objective || null, orderIndex: (lastUnit?.orderIndex ?? 0) + 1, status: "DRAFT" },
  });
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/content");
  redirect(user.role === "ADMIN" ? "/admin/courses?ok=unit" : "/teacher/content?ok=unit");
}

export async function createTeacherAction(formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "password123");
  if (!name || !email) redirect("/admin/teachers?error=missing");
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role: "TEACHER" },
  });
  revalidatePath("/admin/teachers");
  redirect("/admin/teachers");
}

export async function assignTeacherAction(formData: FormData) {
  await requireRole("ADMIN");
  const courseId = String(formData.get("courseId"));
  const teacherId = String(formData.get("teacherId") || "") || null;
  await prisma.course.update({ where: { id: courseId }, data: { teacherId } });
  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}

export async function createFlashcardDeckAction(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const unitId = String(formData.get("unitId"));
  const title = String(formData.get("title") || "Bộ thẻ mới");
  const hanzi = String(formData.get("hanzi") || "");
  const pinyin = String(formData.get("pinyin") || "");
  const meaningVi = String(formData.get("meaningVi") || "");
  const example = String(formData.get("example") || "");

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { course: true, nodes: true },
  });
  if (!unit || unit.course.status !== "DRAFT" || (teacher.role !== "ADMIN" && unit.course.teacherId !== teacher.id)) {
    redirect("/teacher/content?error=forbidden");
  }

  await prisma.lessonNode.create({
    data: {
      unitId,
      title,
      type: "FLASHCARD",
      orderIndex: unit.nodes.length + 1,
      flashcardDeck: {
        create: {
          title,
          topic: "Custom",
          level: unit.course.level,
          cards: hanzi
            ? {
                create: [{ hanzi, pinyin, meaningVi, example }],
              }
            : undefined,
        },
      },
    },
  });
  revalidatePath("/teacher/content");
  redirect("/teacher/content");
}

/** Parse "45" (seconds) or "1:30" (m:ss) into seconds; null when invalid. */
function parseChapterStart(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Math.min(Number(trimmed), 86_399);
  const m = trimmed.match(/^(\d{1,2}):([0-5]?\d)$/);
  if (m) return Math.min(Number(m[1]) * 60 + Number(m[2]), 86_399);
  return null;
}

export async function createVideoLessonAction(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const unitId = String(formData.get("unitId"));
  const title = String(formData.get("title") || "Bài video");
  const videoUrl = String(formData.get("videoUrl") || "");
  const summary = String(formData.get("summary") || "");
  const chapters: { title: string; startSec: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const chapterTitle = String(formData.get(`chapters[${i}][title]`) ?? "").trim();
    if (!chapterTitle) continue;
    const startSec = parseChapterStart(String(formData.get(`chapters[${i}][startSec]`) ?? ""));
    if (startSec === null) continue;
    chapters.push({ title: chapterTitle, startSec });
  }
  chapters.sort((a, b) => a.startSec - b.startSec);
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { course: true, nodes: true },
  });
  if (!unit || unit.course.status !== "DRAFT" || (teacher.role !== "ADMIN" && unit.course.teacherId !== teacher.id)) {
    redirect("/teacher/content?error=forbidden");
  }
  await prisma.lessonNode.create({
    data: {
      unitId,
      title,
      type: "VIDEO",
      orderIndex: unit.nodes.length + 1,
      video: {
        create: {
          videoUrl: videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4",
          summary,
          durationSec: 300,
          chapters: {
            create: chapters.map((c, i) => ({ title: c.title, startSec: c.startSec, orderIndex: i })),
          },
        },
      },
    },
  });
  revalidatePath("/teacher/content");
  redirect("/teacher/content");
}

type QuizType = "SINGLE" | "MULTI" | "FILL" | "ORDER";

type DraftQuizQuestion = {
  type: QuizType;
  prompt: string;
  options: string[];
  answer: string[];
  points: number;
};

/** Parse + validate the builder payload (questionsJson) into safe typed questions. */
function parseDraftQuizQuestions(raw: unknown): DraftQuizQuestion[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 50) return null;
  const out: DraftQuizQuestion[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) return null;
    const rec = item as Record<string, unknown>;
    const type = rec.type;
    if (type !== "SINGLE" && type !== "MULTI" && type !== "FILL" && type !== "ORDER") return null;
    const prompt = typeof rec.prompt === "string" ? rec.prompt.trim() : "";
    if (!prompt) return null;
    const asStringArray = (value: unknown) =>
      Array.isArray(value)
        ? value.filter((v): v is string => typeof v === "string").map((s) => s.trim()).filter(Boolean)
        : [];
    const options = asStringArray(rec.options);
    const answer = asStringArray(rec.answer);
    const points = Math.round(Number(rec.points));
    if (!Number.isFinite(points) || points < 1 || points > 100) return null;
    if (type === "FILL") {
      if (answer.length !== 1) return null;
      out.push({ type, prompt, options: [], answer, points });
      continue;
    }
    if (options.length < 2 || new Set(options).size !== options.length) return null;
    if (type === "SINGLE") {
      if (answer.length !== 1 || !options.includes(answer[0])) return null;
    } else if (type === "MULTI") {
      if (answer.length === 0 || answer.some((a) => !options.includes(a))) return null;
    } else {
      // ORDER: answer must be a permutation of options (order-sensitive at grading)
      const sorted = (arr: string[]) => [...arr].sort();
      if (answer.length !== options.length || JSON.stringify(sorted(answer)) !== JSON.stringify(sorted(options))) {
        return null;
      }
    }
    out.push({ type, prompt, options, answer, points });
  }
  return out;
}

export async function createQuizAction(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const unitId = String(formData.get("unitId") || "");
  const title = String(formData.get("title") || "Bài tập mới").trim();
  const description = String(formData.get("description") || "").trim();
  const passScore = Number(formData.get("passScore") || 70);
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { course: true, nodes: true },
  });
  if (!unit || unit.course.status !== "DRAFT" || (teacher.role !== "ADMIN" && unit.course.teacherId !== teacher.id)) {
    redirect("/teacher/content?error=forbidden");
  }
  let parsed: DraftQuizQuestion[] | null = null;
  try {
    parsed = parseDraftQuizQuestions(JSON.parse(String(formData.get("questionsJson") || "[]")));
  } catch {
    parsed = null;
  }
  if (!parsed) redirect("/teacher/content?error=quiz");
  await prisma.lessonNode.create({
    data: {
      unitId,
      title,
      type: "QUIZ",
      orderIndex: unit.nodes.length + 1,
      assessment: {
        create: {
          title,
          description: description || null,
          passScore: Number.isFinite(passScore) ? Math.min(100, Math.max(0, Math.round(passScore))) : 70,
          questions: {
            create: parsed.map((q, i) => ({
              type: q.type,
              prompt: q.prompt,
              optionsJson: q.type === "FILL" ? null : JSON.stringify(q.options),
              // SINGLE stores a plain string (matches QuizPlayer/seed convention);
              // MULTI/ORDER store arrays; FILL stores the fill text as a string.
              answerJson: JSON.stringify(q.type === "MULTI" || q.type === "ORDER" ? q.answer : q.answer[0] ?? ""),
              orderIndex: i + 1,
              points: q.points,
            })),
          },
        },
      },
    },
  });
  revalidatePath("/teacher/content");
  redirect("/teacher/content?ok=quiz");
}

export async function createEssayAction(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const unitId = String(formData.get("unitId") || "");
  const title = String(formData.get("title") || "Bài tự luận").trim();
  const prompt = String(formData.get("prompt") || "").trim();
  const maxScore = Number(formData.get("maxScore") || 10);
  if (!unitId || !title || !prompt || !Number.isFinite(maxScore) || maxScore <= 0) {
    redirect("/teacher/content?error=essay");
  }

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { course: true, nodes: true },
  });
  if (!unit || unit.course.status !== "DRAFT" || (teacher.role !== "ADMIN" && unit.course.teacherId !== teacher.id)) {
    redirect("/teacher/content?error=forbidden");
  }

  await prisma.lessonNode.create({
    data: {
      unitId,
      title,
      type: "ESSAY",
      orderIndex: unit.nodes.length + 1,
      assessment: {
        create: {
          title,
          questions: {
            create: [{
              type: QuestionType.ESSAY_PARAGRAPH,
              prompt,
              answerJson: JSON.stringify(null),
              orderIndex: 1,
              points: Math.round(maxScore),
            }],
          },
        },
      },
    },
  });
  revalidatePath("/teacher/content");
  redirect("/teacher/content?ok=essay");
}

export async function enrollStudentAction(formData: FormData) {
  await requireRole("TEACHER");
  const courseId = String(formData.get("courseId"));
  const email = String(formData.get("email") || "").trim();
  const student = await prisma.user.findUnique({ where: { email } });
  if (!student || student.role !== "STUDENT") redirect("/teacher/students?error=notfound");
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student.id, courseId } },
    create: { userId: student.id, courseId },
    update: {},
  });
  revalidatePath("/teacher/students");
  redirect("/teacher/students");
}

export async function completeMilestoneAction(nodeId: string) {
  const user = await requireUser();
  await completeNode(user.id, nodeId, 100, 0);
  revalidatePath("/learn");
  redirect("/learn");
}

export async function setUserRoleAction(formData: FormData) {
  await requireRole("ADMIN");
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role")) as Role;
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/students");
  revalidatePath("/admin/teachers");
  redirect("/admin/students");
}
