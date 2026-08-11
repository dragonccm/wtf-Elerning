import { gradeEssayAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function TeacherGradingPage() {
  const user = await requireRole("TEACHER");
  const submissions = await prisma.submission.findMany({
    where: {
      autoGraded: false,
      status: "SUBMITTED",
      ...(user.role === "ADMIN"
        ? {}
        : { user: { enrollments: { some: { course: { teacherId: user.id } } } } }),
    },
    include: {
      user: true,
      answers: { include: { question: true } },
    },
    orderBy: { submittedAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Chấm bài tự luận</h1>
      <p className="mt-1 text-[var(--muted)]">Nhập điểm, nhận xét và đánh dấu lỗi sai.</p>
      <div className="mt-6 space-y-4">
        {submissions.map((s) => (
          <article key={s.id} className="rounded-[22px] border border-[var(--line)] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-extrabold">{s.user.name}</h2>
                <p className="text-sm text-[var(--muted)]">{s.answers[0]?.question.prompt}</p>
              </div>
              <span className="rounded-full bg-[var(--warning)]/20 px-3 py-1 text-xs font-bold text-[#9a6700]">
                Chờ chấm
              </span>
            </div>
            <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-[var(--surface)] p-4 text-sm">
              {safe(s.answers[0]?.responseJson ?? '""')}
            </p>
            <form action={gradeEssayAction} className="mt-4 grid gap-3 md:grid-cols-2">
              <input type="hidden" name="submissionId" value={s.id} />
              <label className="text-sm font-semibold">
                Điểm
                <input name="score" type="number" min={0} max={10} defaultValue={8} required className="mt-1 w-full rounded-xl border-2 border-[var(--line)] px-3 py-2" />
              </label>
              <label className="text-sm font-semibold">
                Loại lỗi
                <select name="errorType" className="mt-1 w-full rounded-xl border-2 border-[var(--line)] px-3 py-2">
                  <option value="VOCAB">Sai từ vựng</option>
                  <option value="GRAMMAR">Sai ngữ pháp</option>
                  <option value="STRUCTURE">Sai cấu trúc câu</option>
                  <option value="PINYIN">Sai Pinyin</option>
                  <option value="EXPRESSION">Sai diễn đạt</option>
                </select>
              </label>
              <label className="text-sm font-semibold md:col-span-2">
                Nhận xét
                <textarea name="comment" required rows={2} className="mt-1 w-full rounded-xl border-2 border-[var(--line)] px-3 py-2" />
              </label>
              <label className="text-sm font-semibold">
                Đoạn lỗi
                <input name="excerpt" className="mt-1 w-full rounded-xl border-2 border-[var(--line)] px-3 py-2" />
              </label>
              <label className="text-sm font-semibold">
                Gợi ý sửa
                <input name="suggestion" className="mt-1 w-full rounded-xl border-2 border-[var(--line)] px-3 py-2" />
              </label>
              <div className="md:col-span-2">
                <Button type="submit">Lưu điểm & nhận xét</Button>
              </div>
            </form>
          </article>
        ))}
        {submissions.length === 0 && (
          <p className="rounded-[22px] border border-dashed border-[var(--line)] bg-white p-8 text-center text-[var(--muted)]">
            Không có bài chờ chấm.
          </p>
        )}
      </div>
    </div>
  );
}

function safe(raw: string) {
  try {
    return String(JSON.parse(raw));
  } catch {
    return raw;
  }
}
