import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { CourseSwitcher } from "@/components/staff/CourseSwitcher";
import Link from "next/link";
import type { Submission } from "@prisma/client";

export default async function TeacherGradesPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; submissionId?: string }>;
}) {
  const user = await requireRole("TEACHER");
  const params = await searchParams;
  const courseScope = user.role === "ADMIN" ? {} : { teacherId: user.id };
  const courses = await prisma.course.findMany({ where: courseScope, orderBy: { createdAt: "asc" } });

  if (courses.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-extrabold">Bảng điểm</h1>
        <p className="mt-2 text-[var(--muted)]">Chưa có khóa học nào để xem điểm.</p>
      </div>
    );
  }

  const courseId = params.course && courses.some((c) => c.id === params.course) ? params.course : courses[0].id;

  const [students, nodes] = await Promise.all([
    prisma.enrollment.findMany({
      where: { courseId },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.lessonNode.findMany({
      where: { unit: { courseId }, type: { in: ["QUIZ", "ESSAY"] }, assessment: { isNot: null } },
      include: { unit: true, assessment: { include: { questions: { select: { id: true } } } } },
      orderBy: [{ unit: { orderIndex: "asc" } }, { orderIndex: "asc" }],
    }),
  ]);

  const studentIds = students.map((s) => s.user.id);
  const assessmentIds = nodes.map((n) => n.assessment!.id);
  const submissions = await prisma.submission.findMany({
    where: { userId: { in: studentIds }, assessmentId: { in: assessmentIds } },
  });
  // latest submission per student per assessment
  const byKey = new Map<string, Submission>();
  for (const s of submissions) {
    const k = `${s.userId}:${s.assessmentId}`;
    const prev = byKey.get(k);
    if (!prev || s.submittedAt > prev.submittedAt) byKey.set(k, s);
  }

  const detail = params.submissionId
    ? await prisma.submission.findFirst({
        where: {
          id: params.submissionId,
          ...(user.role === "ADMIN" ? {} : { user: { enrollments: { some: { course: { teacherId: user.id } } } } }),
        },
        include: {
          user: { select: { name: true } },
          answers: {
            include: {
              question: {
                include: { assessment: { select: { node: { select: { title: true, type: true } } } } },
              },
            },
          },
          feedback: { include: { errorMarks: true } },
        },
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Bảng điểm</h1>
          <p className="mt-1 text-[var(--muted)]">Điểm kiểm tra theo học viên — bấm điểm để xem chi tiết từng câu.</p>
        </div>
        <CourseSwitcher courses={courses.map((c) => ({ id: c.id, title: c.title }))} selected={courseId} />
      </div>

      {detail && <SubmissionDetail submission={detail} backHref={`/teacher/grades?course=${courseId}`} />}

      <div className="overflow-x-auto rounded-[22px] border border-[var(--line)] bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b-2 border-[var(--line)] text-left">
              <th className="p-4 font-extrabold">Học viên</th>
              {nodes.map((n) => (
                <th key={n.id} className="p-4 font-extrabold">
                  <span className="block leading-tight">{n.assessment!.title}</span>
                  <span className="text-xs font-bold text-[var(--muted)]">{n.type === "QUIZ" ? "Trắc nghiệm" : "Tự luận"}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((st) => (
              <tr key={st.user.id} className="border-b border-[var(--line)] last:border-0">
                <td className="p-4">
                  <p className="font-extrabold">{st.user.name}</p>
                  <p className="text-xs text-[var(--muted)]">{st.user.email}</p>
                </td>
                {nodes.map((n) => {
                  const sub = byKey.get(`${st.user.id}:${n.assessment!.id}`);
                  return (
                    <td key={n.id} className="p-4">
                      {sub ? (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/teacher/grades?course=${courseId}&submissionId=${sub.id}`}
                            className="font-extrabold text-[var(--brand-dark)] underline-offset-2 hover:underline"
                          >
                            {sub.score != null ? `${sub.score}/${sub.maxScore ?? "—"}` : "…"}
                          </Link>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              sub.status === "SUBMITTED" ? "bg-[var(--warning)]/20 text-[#9a6700]" : "bg-[var(--brand-soft)] text-[var(--brand-dark)]"
                            }`}
                          >
                            {sub.status === "SUBMITTED" ? "Chờ chấm" : "Đã chấm"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={nodes.length + 1} className="p-8 text-center text-[var(--muted)]">
                  Chưa có học viên nào trong khóa học này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type DetailAnswer = {
  responseJson: string;
  isCorrect: boolean | null;
  pointsEarned: number | null;
  question: {
    id: string;
    prompt: string;
    answerJson: string;
    points: number;
    assessment: { node: { title: string; type: string } };
  };
};

type DetailSubmission = {
  id: string;
  score: number | null;
  maxScore: number | null;
  status: string;
  autoGraded: boolean;
  user: { name: string };
  answers: DetailAnswer[];
  feedback: {
    comment: string;
    errorMarks: { type: string; excerpt: string; suggestion: string }[];
  } | null;
};

function SubmissionDetail({ submission, backHref }: { submission: DetailSubmission; backHref: string }) {
  return (
    <div className="rounded-[22px] border-2 border-[var(--line)] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Chi tiết bài nộp</p>
          <h2 className="text-xl font-extrabold">
            {submission.user.name} — {submission.answers[0]?.question.assessment.node.title ?? "Bài kiểm tra"}
          </h2>
        </div>
        <Link href={backHref} className="text-sm font-bold text-[var(--brand-dark)] hover:underline">
          ← Về bảng điểm
        </Link>
      </div>
      <div className="mt-3 flex items-center gap-3">
        {submission.score != null ? (
          <span className="text-2xl font-extrabold text-[var(--brand-dark)]">
            {submission.score}/{submission.maxScore ?? "—"}
          </span>
        ) : (
          <span className="rounded-full bg-[var(--warning)]/20 px-3 py-1 text-xs font-bold text-[#9a6700]">Chưa có điểm</span>
        )}
        <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--brand-dark)]">
          {submission.autoGraded ? "Chấm tự động" : submission.status === "GRADED" ? "Đã chấm" : "Chờ chấm"}
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {submission.answers.map((a, i) => (
          <li key={a.question.id} className="rounded-2xl border border-[var(--line)] p-4">
            <p className="font-extrabold">
              {i + 1}. {a.question.prompt}
            </p>
            <p className="mt-2 text-sm">
              <b>Học viên:</b> {displayAnswer(a.responseJson)}
            </p>
            <p className="mt-1 text-sm">
              <b>Đáp án đúng:</b> {displayAnswer(a.question.answerJson)}
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
              {a.isCorrect == null ? "Chờ giáo viên chấm" : a.isCorrect ? "✓ Đúng — " : "✗ Sai — "}
              {a.pointsEarned ?? 0}/{a.question.points} điểm
            </p>
          </li>
        ))}
      </ul>
      {submission.feedback && (
        <div className="mt-4 rounded-2xl bg-[var(--surface)] p-4">
          <p className="font-extrabold">Nhận xét của giáo viên</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{submission.feedback.comment}</p>
          {submission.feedback.errorMarks.map((m, i) => (
            <p key={i} className="mt-2 text-sm font-semibold text-[#9a6700]">
              [{m.type}] “{m.excerpt}” → {m.suggestion}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function displayAnswer(raw: string): string {
  try {
    const v: unknown = JSON.parse(raw);
    if (Array.isArray(v)) return v.join(" • ");
    if (v === null) return "(không có)";
    return String(v);
  } catch {
    return raw;
  }
}
