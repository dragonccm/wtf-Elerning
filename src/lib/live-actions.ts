"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertMemberOf, assertTeacherOf } from "@/lib/live-room";
import { requireRole, requireUser } from "@/lib/session";
import { awardXp } from "@/lib/streak";

export async function createQuickQuestionAction(formData: FormData) {
  const user = await requireRole("TEACHER");
  const classroomId = String(formData.get("classroomId") || "");
  await assertTeacherOf(classroomId, user);
  const prompt = String(formData.get("prompt") || "").trim();
  if (!prompt) throw new Error("Câu hỏi là bắt buộc");
  if (prompt.length > 500) throw new Error("Câu hỏi quá dài (tối đa 500 ký tự)");
  const mode = String(formData.get("mode") || "choice") === "free" ? "FREE" : "CHOICE";

  let optionsJson: string | null = null;
  let correctOption: string | null = null;
  if (mode === "CHOICE") {
    const options = [1, 2, 3, 4].map((i) => String(formData.get(`option${i}`) || "").trim()).filter(Boolean);
    if (options.length < 2) throw new Error("Câu hỏi trắc nghiệm cần ít nhất 2 lựa chọn");
    optionsJson = JSON.stringify(options);
    const correct = String(formData.get("correctOption") || "").trim();
    if (correct && !options.includes(correct)) throw new Error("Đáp án đúng phải nằm trong danh sách lựa chọn");
    correctOption = correct || null;
  }

  // only one open question per classroom — auto-close the previous one
  await prisma.quickQuestion.updateMany({
    where: { classroomId, status: "OPEN" },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  await prisma.quickQuestion.create({
    data: { classroomId, teacherId: user.id, prompt, optionsJson, correctOption, status: "OPEN" },
  });
  revalidatePath(`/teacher/classes/${classroomId}`);
  revalidatePath(`/classes/${classroomId}`);
  redirect(`/teacher/classes/${classroomId}?ok=quickquestion`);
}

export async function closeQuickQuestionAction(formData: FormData) {
  const user = await requireRole("TEACHER");
  const classroomId = String(formData.get("classroomId") || "");
  await assertTeacherOf(classroomId, user);
  await prisma.quickQuestion.updateMany({
    where: { classroomId, status: "OPEN" },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  revalidatePath(`/teacher/classes/${classroomId}`);
  revalidatePath(`/classes/${classroomId}`);
  redirect(`/teacher/classes/${classroomId}?ok=closed`);
}

export async function respondQuickQuestionAction(formData: FormData) {
  const user = await requireUser();
  const classroomId = String(formData.get("classroomId") || "");
  await assertMemberOf(classroomId, user.id);
  const questionId = String(formData.get("questionId") || "");
  const answer = String(formData.get("answer") || "").trim();
  if (!answer) throw new Error("Cần nhập câu trả lời");
  if (answer.length > 500) throw new Error("Câu trả lời quá dài (tối đa 500 ký tự)");
  const question = await prisma.quickQuestion.findUnique({ where: { id: questionId } });
  if (!question || question.classroomId !== classroomId) throw new Error("Không tìm thấy câu hỏi");
  if (question.status !== "OPEN") throw new Error("Câu hỏi đã kết thúc");
  if (question.optionsJson) {
    let opts: unknown;
    try {
      opts = JSON.parse(question.optionsJson);
    } catch {
      opts = null;
    }
    if (Array.isArray(opts) && !opts.includes(answer)) throw new Error("Lựa chọn không hợp lệ");
  }
  const existing = await prisma.quickQuestionResponse.findUnique({
    where: { questionId_userId: { questionId, userId: user.id } },
  });
  if (!existing) {
    await prisma.quickQuestionResponse.create({ data: { questionId, userId: user.id, answer } });
    await awardXp(user.id, 2, "live-answer");
  }
  revalidatePath(`/classes/${classroomId}`);
  redirect(`/classes/${classroomId}?tab=live&ok=answered`);
}
