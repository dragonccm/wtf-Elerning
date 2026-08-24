import { GradeForm } from "@/components/staff/GradeForm";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

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

export default async function TeacherGradingPage() {
  const user = await requireRole("TEACHER");
  const scope =
    user.role === "ADMIN" ? {} : { user: { enrollments: { some: { course: { teacherId: user.id } } } } };
  const [pending, graded] = await Promise.all([
    prisma.submission.findMany({
      where: { autoGraded: false, status: "SUBMITTED", ...scope },
      include: {
        user: true,
        answers: { include: { question: { select: { rubricJson: true, prompt: true } } } },
      },
      orderBy: { submittedAt: "asc" },
    }),
    prisma.submission.findMany({
      where: { autoGraded: false, status: "GRADED", ...scope },
      include: {
        user: true,
        answers: { include: { question: { select: { rubricJson: true, prompt: true } } } },
        feedback: { include: { errorMarks: true } },
      },
      orderBy: { gradedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">Chấm bài tự luận</h1>
        <p className="mt-1 text-[var(--muted)]">
          Nhập điểm (hoặc chấm theo tiêu chí rubric), nhận xét và đánh dấu lỗi sai. Bài đã chấm có thể chấm lại — điểm mới thay thế điểm cũ.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-extrabold">
          Chờ chấm <span className="text-[var(--muted)]">({pending.length})</span>
        </h2>
        {pending.map((s) => (
          <article key={s.id} className="rounded-[22px] border border-[var(--line)] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold">{s.user.name}</h3>
                <p className="text-sm text-[var(--muted)]">{s.answers[0]?.question.prompt}</p>
              </div>
              <span className="rounded-full bg-[var(--warning)]/20 px-3 py-1 text-xs font-bold text-[#9a6700]">Chờ chấm</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-[var(--surface)] p-4 text-sm">
              {safe(s.answers[0]?.responseJson ?? '""')}
            </p>
            <div className="mt-4">
              <GradeForm
                submissionId={s.id}
                maxScore={s.maxScore ?? 10}
                rubric={parseRubric(s.answers[0]?.question.rubricJson)}
                existing={null}
              />
            </div>
          </article>
        ))}
        {pending.length === 0 && (
          <p className="rounded-[22px] border border-dashed border-[var(--line)] bg-white p-8 text-center text-[var(--muted)]">
            Không có bài chờ chấm.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-extrabold">
          Đã chấm gần đây <span className="text-[var(--muted)]">({graded.length})</span>
        </h2>
        {graded.map((s) => (
          <article key={s.id} className="rounded-[22px] border border-[var(--line)] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold">{s.user.name}</h3>
                <p className="text-sm text-[var(--muted)]">{s.answers[0]?.question.prompt}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-dark)]">
                  {s.score ?? "—"}/{s.maxScore ?? "—"}
                </span>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-[var(--surface)] p-4 text-sm">
              {safe(s.answers[0]?.responseJson ?? '""')}
            </p>
            <div className="mt-4">
              <GradeForm
                submissionId={s.id}
                maxScore={s.maxScore ?? 10}
                rubric={parseRubric(s.answers[0]?.question.rubricJson)}
                existing={
                  s.feedback
                    ? {
                        score: s.feedback.score,
                        comment: s.feedback.comment,
                        marks: s.feedback.errorMarks.map((m) => ({ type: m.type, excerpt: m.excerpt, suggestion: m.suggestion })),
                        rubric: parseRubricScores(s.feedback.rubricJson),
                      }
                    : null
                }
              />
            </div>
          </article>
        ))}
        {graded.length === 0 && (
          <p className="rounded-[22px] border border-dashed border-[var(--line)] bg-white p-8 text-center text-[var(--muted)]">
            Chưa có bài nào được chấm.
          </p>
        )}
      </section>
    </div>
  );
}
