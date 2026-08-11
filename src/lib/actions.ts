"use server";

import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/session";
import { gradeAnswers } from "@/lib/scoring";
import { completeNode } from "@/lib/progress";
import { homeForRole } from "@/lib/roles";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ErrorType, QuestionType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=invalid");
    }
    throw error;
  }
  const user = await prisma.user.findUnique({ where: { email } });
  redirect(homeForRole(user?.role ?? "STUDENT"));
}

export async function registerAction(formData: FormData) {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
  });
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/register?error=invalid");
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) redirect("/register?error=exists");
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "STUDENT",
    },
  });
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirect: false,
  });
  redirect("/learn");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

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
  await completeNode(user.id, nodeId, 100, 180);
  revalidatePath("/learn");
  redirect("/learn");
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

export async function submitQuizAction(assessmentId: string, nodeId: string, answersJson: string) {
  const user = await requireUser();
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  if (!assessment) throw new Error("Assessment not found");

  const answers = JSON.parse(answersJson) as { questionId: string; responseJson: string }[];
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

  if (graded.percent >= assessment.passScore) {
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
  if (!assessment) throw new Error("Not found");
  const question = assessment.questions[0];
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
            responseJson: JSON.stringify(text),
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
  if (!submission) throw new Error("Missing submission");

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
  await requireRole("ADMIN");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const level = String(formData.get("level") || "HSK1");
  const teacherId = String(formData.get("teacherId") || "") || null;
  if (!title) redirect("/admin/courses?error=title");
  await prisma.course.create({
    data: { title, description, level, teacherId },
  });
  revalidatePath("/admin/courses");
  redirect("/admin/courses");
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
  const teacherId = String(formData.get("teacherId"));
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
  if (!unit || (teacher.role !== "ADMIN" && unit.course.teacherId !== teacher.id)) {
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

export async function createVideoLessonAction(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const unitId = String(formData.get("unitId"));
  const title = String(formData.get("title") || "Bài video");
  const videoUrl = String(formData.get("videoUrl") || "");
  const summary = String(formData.get("summary") || "");
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { course: true, nodes: true },
  });
  if (!unit || (teacher.role !== "ADMIN" && unit.course.teacherId !== teacher.id)) {
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
        },
      },
    },
  });
  revalidatePath("/teacher/content");
  redirect("/teacher/content");
}

export async function createQuizAction(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const unitId = String(formData.get("unitId"));
  const title = String(formData.get("title") || "Bài tập mới");
  const prompt = String(formData.get("prompt") || "Chọn đáp án đúng");
  const options = String(formData.get("options") || "A|B|C|D").split("|").map((s) => s.trim());
  const answer = String(formData.get("answer") || options[0]);
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { course: true, nodes: true },
  });
  if (!unit || (teacher.role !== "ADMIN" && unit.course.teacherId !== teacher.id)) {
    redirect("/teacher/content?error=forbidden");
  }
  await prisma.lessonNode.create({
    data: {
      unitId,
      title,
      type: "QUIZ",
      orderIndex: unit.nodes.length + 1,
      assessment: {
        create: {
          title,
          questions: {
            create: [
              {
                type: QuestionType.SINGLE,
                prompt,
                optionsJson: JSON.stringify(options),
                answerJson: JSON.stringify(answer),
                orderIndex: 1,
                points: 1,
              },
            ],
          },
        },
      },
    },
  });
  revalidatePath("/teacher/content");
  redirect("/teacher/content");
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
