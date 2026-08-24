import { FeedbackPanel } from "@/components/learning/FeedbackPanel";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ResultsPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const user = await requireUser();
  const { submissionId } = await params;
  const submission = await prisma.submission.findFirst({
    where: { id: submissionId, userId: user.id },
    include: {
      answers: { include: { question: true } },
      feedback: { include: { errorMarks: true } },
    },
  });
  if (!submission || submission.userId !== user.id) notFound();

  const percent =
    submission.maxScore && submission.score != null
      ? Math.round((submission.score / submission.maxScore) * 100)
      : null;

  return (
    <main className="px-4 py-6">
      <h1 className="text-3xl font-extrabold">Kết quả</h1>
      <p className="mt-1 text-[var(--muted)]">
        {submission.autoGraded ? "Chấm tự động" : submission.status === "GRADED" ? "Giáo viên đã chấm" : "Đang chờ giáo viên chấm"}
      </p>

      {submission.score != null && (
        <div className="mt-5 rounded-[24px] bg-[var(--brand)] p-6 text-white shadow-[0_12px_30px_rgba(31,169,122,0.35)]">
          <p className="text-sm font-bold uppercase tracking-wide text-white/80">Điểm</p>
          <p className="mt-1 text-4xl font-extrabold">
            {submission.score}/{submission.maxScore}
            {percent != null && <span className="ml-2 text-2xl">({percent}%)</span>}
          </p>
          <p className="mt-2 text-sm">
            Đúng {submission.answers.filter((a) => a.isCorrect).length}/{submission.answers.length} câu
          </p>
        </div>
      )}

      {submission.autoGraded && (
        <ul className="mt-6 space-y-3">
          {submission.answers.map((a) => (
            <li key={a.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
              <div className="flex items-start gap-3">
                {a.isCorrect ? (
                  <Check className="mt-0.5 size-5 text-[var(--brand)]" />
                ) : (
                  <X className="mt-0.5 size-5 text-[var(--danger)]" />
                )}
                <div>
                  <p className="font-semibold">{a.question.prompt}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Bạn chọn: {safeParse(a.responseJson)} · Đáp án: {safeParse(a.question.answerJson)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!submission.autoGraded && (
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-4">
          <p className="text-sm font-bold text-[var(--muted)]">Bài làm</p>
          <p className="mt-2 whitespace-pre-wrap">{safeParse(submission.answers[0]?.responseJson ?? '""')}</p>
        </div>
      )}

      {submission.feedback && (
        <FeedbackPanel
          className="mt-6"
          score={submission.feedback.score}
          maxScore={submission.maxScore}
          comment={submission.feedback.comment}
          errors={submission.feedback.errorMarks}
        />
      )}

      {submission.feedback && submission.feedback.rubricJson && rubricScores(submission.feedback.rubricJson).length > 0 && (
        <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white p-4">
          <p className="text-sm font-bold text-[var(--muted)]">Điểm theo tiêu chí</p>
          <ul className="mt-2 space-y-1">
            {rubricScores(submission.feedback.rubricJson).map((c) => (
              <li key={c.name} className="flex items-center justify-between text-sm font-semibold">
                <span>{c.name}</span>
                <span className="font-extrabold text-[var(--brand-dark)]">
                  {c.points}/{c.maxPoints}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href="/learn" className="mt-8 block">
        <Button fullWidth>Về lộ trình</Button>
      </Link>
    </main>
  );
}

function safeParse(raw: string) {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.join(", ") : String(v);
  } catch {
    return raw;
  }
}

function rubricScores(raw: string): { name: string; maxPoints: number; points: number }[] {
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .filter((it): it is Record<string, unknown> => typeof it === "object" && it !== null)
      .map((it) => ({
        name: String(it.name ?? ""),
        maxPoints: Math.round(Number(it.maxPoints ?? 0)),
        points: Number(it.points ?? 0),
      }))
      .filter((c) => c.name && Number.isFinite(c.points));
  } catch {
    return [];
  }
}
