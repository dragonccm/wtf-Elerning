import { GradeForm } from "@/components/staff/GradeForm";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDateTime } from "@/lib/utils";

type RubricDef = { name: string; maxPoints: number };

function parseRubric(raw: string | null | undefined): RubricDef[] | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return null;
    const rows = v
      .filter((it): it is Record<string, unknown> => typeof it === "object" && it !== null)
      .map((it) => ({ name: String(it.name ?? ""), maxPoints: Math.round(Number(it.maxPoints ?? 0)) }))
      .filter((c) => c.name && c.maxPoints > 0);
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

function parseRubricScores(raw: string | null | undefined): { name: string; maxPoints: number; points: number }[] | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return null;
    const rows = v
      .filter((it): it is Record<string, unknown> => typeof it === "object" && it !== null)
      .map((it) => ({ name: String(it.name ?? ""), maxPoints: Math.round(Number(it.maxPoints ?? 0)), points: Number(it.points ?? 0) }))
      .filter((c) => c.name && Number.isFinite(c.points));
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

function safe(raw: string): string {
  try {
    const v: unknown = JSON.parse(raw);
    if (Array.isArray(v)) return v.join(" • ");
    if (v === null) return "";
    return String(v);
  } catch {
    return raw;
  }
}

const PER_PAGE = 15;

export default async function TeacherGradingPage({
  searchParams,
}: {
  searchParams: Promise<{ submission?: string; page?: string; gpage?: string }>;
}) {
  const user = await requireRole("TEACHER");
  const params = await searchParams;
  const scope =
    user.role === "ADMIN" ? {} : { user: { enrollments: { some: { course: { teacherId: user.id } } } } };

  // ---- detail view: single submission with the grading form ----
  if (params.submission) {
    const sub = await prisma.submission.findFirst({
      where: { id: params.submission, ...scope },
      include: {
        user: true,
        answers: { include: { question: { select: { rubricJson: true, prompt: true } } } },
        feedback: { include: { errorMarks: true } },
      },
    });
    if (!sub) redirect("/teacher/grading");
    return (
      <div className="space-y-6">
        <div>
          <Link href="/teacher/grading" className="text-sm font-bold text-[var(--brand-dark)] hover:underline">
            ← Về danh sách chấm bài
          </Link>
          <h1 className="mt-2 text-3xl font-extrabold">Chấm bài</h1>
          <p className="mt-1 text-[var(--muted)]">
            Nhập điểm (hoặc chấm theo tiêu chí rubric), nhận xét và đánh dấu lỗi sai. Bài đã chấm có thể chấm lại — điểm mới thay thế điểm cũ.
          </p>
        </div>
        <article className="rounded-[22px] border border-[var(--line)] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-extrabold">{sub.user.name}</h2>
              <p className="text-sm text-[var(--muted)]">
                {sub.user.email} · {sub.answers[0]?.question.prompt}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                sub.status === "GRADED"
                  ? "bg-[var(--brand-soft)] text-[var(--brand-dark)]"
                  : "bg-[var(--warning)]/20 text-[#9a6700]"
              }`}
            >
              {sub.status === "GRADED" ? `Đã chấm ${sub.score ?? "—"}/${sub.maxScore ?? "—"}` : "Chờ chấm"}
            </span>
          </div>
          <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-[var(--surface)] p-4 text-sm">
            {safe(sub.answers[0]?.responseJson ?? '""')}
          </p>
          <div className="mt-4">
            <GradeForm
              submissionId={sub.id}
              maxScore={sub.maxScore ?? 10}
              rubric={parseRubric(sub.answers[0]?.question.rubricJson)}
              existing={
                sub.feedback
                  ? {
                      score: sub.feedback.score,
                      comment: sub.feedback.comment,
                      marks: sub.feedback.errorMarks.map((m) => ({ type: m.type, excerpt: m.excerpt, suggestion: m.suggestion })),
                      rubric: parseRubricScores(sub.feedback.rubricJson),
                    }
                  : null
              }
            />
          </div>
        </article>
      </div>
    );
  }

  // ---- list view: compact tables + pagination (scales to hundreds of students) ----
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const gpage = Math.max(1, Number.parseInt(params.gpage ?? "1", 10) || 1);

  const [pending, pendingCount, graded, gradedCount] = await Promise.all([
    prisma.submission.findMany({
      where: { autoGraded: false, status: "SUBMITTED", ...scope },
      select: { id: true, submittedAt: true, user: { select: { name: true, email: true } }, answers: { select: { question: { select: { prompt: true } } }, take: 1 } },
      orderBy: { submittedAt: "asc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.submission.count({ where: { autoGraded: false, status: "SUBMITTED", ...scope } }),
    prisma.submission.findMany({
      where: { autoGraded: false, status: "GRADED", ...scope },
      select: {
        id: true,
        gradedAt: true,
        score: true,
        maxScore: true,
        user: { select: { name: true, email: true } },
        answers: { select: { question: { select: { prompt: true } } }, take: 1 },
      },
      orderBy: { gradedAt: "desc" },
      skip: (gpage - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.submission.count({ where: { autoGraded: false, status: "GRADED", ...scope } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">Chấm bài tự luận</h1>
        <p className="mt-1 text-[var(--muted)]">
          Bấm “Chấm bài” để mở form điểm + nhận xét. Bài đã chấm có thể chấm lại — điểm mới thay thế điểm cũ.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">
          Chờ chấm <span className="text-[var(--muted)]">({pendingCount})</span>
        </h2>
        {pending.length > 0 ? (
          <div className="overflow-x-auto rounded-[22px] border border-[var(--line)] bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--line)] text-left">
                  <th className="p-4 font-extrabold">Học viên</th>
                  <th className="p-4 font-extrabold">Câu hỏi</th>
                  <th className="p-4 font-extrabold">Nộp lúc</th>
                  <th className="p-4 font-extrabold" />
                </tr>
              </thead>
              <tbody>
                {pending.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="p-4">
                      <p className="font-extrabold">{s.user.name}</p>
                      <p className="text-xs text-[var(--muted)]">{s.user.email}</p>
                    </td>
                    <td className="max-w-[280px] p-4">
                      <p className="truncate font-semibold" title={s.answers[0]?.question.prompt}>
                        {s.answers[0]?.question.prompt ?? "—"}
                      </p>
                    </td>
                    <td className="p-4 text-[var(--muted)]">{s.submittedAt ? formatDateTime(s.submittedAt) : "—"}</td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/teacher/grading?submission=${s.id}`}
                        className="inline-block rounded-full bg-[var(--brand)] px-4 py-1.5 text-xs font-extrabold text-white hover:brightness-105"
                      >
                        Chấm bài
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-[22px] border border-dashed border-[var(--line)] bg-white p-8 text-center text-[var(--muted)]">
            Không có bài chờ chấm.
          </p>
        )}
        {pendingCount > PER_PAGE && (
          <Pager page={page} total={pendingCount} hrefFor={(p) => `/teacher/grading?page=${p}&gpage=${gpage}`} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">
          Đã chấm <span className="text-[var(--muted)]">({gradedCount})</span>
        </h2>
        {graded.length > 0 ? (
          <div className="overflow-x-auto rounded-[22px] border border-[var(--line)] bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--line)] text-left">
                  <th className="p-4 font-extrabold">Học viên</th>
                  <th className="p-4 font-extrabold">Câu hỏi</th>
                  <th className="p-4 font-extrabold">Điểm</th>
                  <th className="p-4 font-extrabold">Chấm lúc</th>
                  <th className="p-4 font-extrabold" />
                </tr>
              </thead>
              <tbody>
                {graded.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="p-4">
                      <p className="font-extrabold">{s.user.name}</p>
                      <p className="text-xs text-[var(--muted)]">{s.user.email}</p>
                    </td>
                    <td className="max-w-[280px] p-4">
                      <p className="truncate font-semibold" title={s.answers[0]?.question.prompt}>
                        {s.answers[0]?.question.prompt ?? "—"}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-dark)]">
                        {s.score ?? "—"}/{s.maxScore ?? "—"}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--muted)]">{s.gradedAt ? formatDateTime(s.gradedAt) : "—"}</td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/teacher/grading?submission=${s.id}`}
                        className="inline-block rounded-full bg-[var(--surface)] px-4 py-1.5 text-xs font-extrabold text-[var(--brand-dark)] hover:bg-[var(--brand-soft)]"
                      >
                        Xem / Chấm lại
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-[22px] border border-dashed border-[var(--line)] bg-white p-8 text-center text-[var(--muted)]">
            Chưa có bài nào được chấm.
          </p>
        )}
        {gradedCount > PER_PAGE && (
          <Pager page={gpage} total={gradedCount} hrefFor={(p) => `/teacher/grading?page=${page}&gpage=${p}`} />
        )}
      </section>
    </div>
  );
}

function Pager({ page, total, hrefFor }: { page: number; total: number; hrefFor: (p: number) => string }) {
  const pages = Math.ceil(total / PER_PAGE);
  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-[var(--muted)]">
        Trang {page}/{pages} · {total} bài
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={hrefFor(page - 1)} className="rounded-full border-2 border-[var(--line)] px-4 py-1.5 font-extrabold hover:bg-[var(--surface)]">
            ← Trang trước
          </Link>
        )}
        {page < pages && (
          <Link href={hrefFor(page + 1)} className="rounded-full border-2 border-[var(--line)] px-4 py-1.5 font-extrabold hover:bg-[var(--surface)]">
            Trang sau →
          </Link>
        )}
      </div>
    </div>
  );
}
