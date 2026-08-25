import { createCourseAction, createFlashcardDeckAction, createUnitAction, createVideoLessonAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { submitCourseForReviewAction } from "@/lib/classroom-actions";
import { LocalUploadField } from "@/components/staff/LocalUploadField";
import { QuizBuilder } from "@/components/staff/QuizBuilder";
import { EssayBuilder } from "@/components/staff/EssayBuilder";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Fragment } from "react";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  PENDING_REVIEW: "Chờ duyệt",
  PUBLISHED: "Đã xuất bản",
  ARCHIVED: "Đã lưu trữ",
};

const STATUS_HINTS: Record<string, string> = {
  DRAFT: "Bước tiếp theo: bấm “Gửi Admin duyệt” để học viên có thể làm bài.",
  PENDING_REVIEW: "Đang chờ Admin duyệt — học viên chưa thấy bài này.",
  PUBLISHED: "Học viên đã làm được tại trang Học (/learn) sau khi ghi danh. Có thể giao kèm hạn chót ở tab Lớp học.",
  ARCHIVED: "Đã lưu trữ — học viên không còn làm bài này.",
};

const NODE_TYPE_LABELS: Record<string, string> = {
  VIDEO: "Video",
  FLASHCARD: "Flashcard",
  QUIZ: "Bài kiểm tra",
  ESSAY: "Tự luận",
  MILESTONE: "Cột mốc",
};

const TABS = [
  { key: "course", label: "Tạo khóa học" },
  { key: "unit", label: "Thêm unit" },
  { key: "video", label: "Video" },
  { key: "flashcard", label: "Flashcard" },
  { key: "quiz", label: "Bài kiểm tra" },
  { key: "essay", label: "Tự luận" },
  { key: "list", label: "Danh sách khóa" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function TeacherContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; ok?: string }>;
}) {
  const user = await requireRole("TEACHER");
  const { tab: rawTab, ok } = await searchParams;
  // after creating content, land on the list tab so the next step (submit for review) is visible
  const tab: TabKey = (TABS.some((t) => t.key === rawTab) ? rawTab : ok ? "list" : "course") as TabKey;
  const courses = await prisma.course.findMany({
    where: user.role === "ADMIN" ? undefined : { teacherId: user.id },
    include: {
      units: {
        orderBy: { orderIndex: "asc" },
        include: { nodes: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });
  const units = courses.flatMap((c) => c.units.map((u) => ({ ...u, courseTitle: c.title })));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Nội dung bài học</h1>
        <p className="mt-1 text-[var(--muted)]">Chọn tab để tạo từng loại nội dung.</p>
      </div>

      {ok ? (
        <div className="rounded-2xl bg-[var(--brand-soft)] p-4 text-sm font-bold text-[var(--brand-dark)]">
          Đã tạo nội dung. Xem ở tab “Danh sách khóa” và nhớ bấm “Gửi Admin duyệt” để học viên có thể làm bài.
        </div>
      ) : null}

      <section className="rounded-[22px] border border-[var(--line)] bg-white p-5">
        <h2 className="text-lg font-extrabold">Quy trình đưa bài đến học viên</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["1", "Tạo nội dung", "Chọn tab bên dưới: quiz, tự luận, video, flashcard trong unit của khóa nháp."],
            ["2", "Gửi Admin duyệt", "Vào tab “Danh sách khóa” — bấm nút “Gửi Admin duyệt” dưới mỗi khóa."],
            ["3", "Admin duyệt", "Khóa học + bài học chuyển sang ĐÃ XUẤT BẢN — học viên mới nhìn thấy."],
            ["4", "Học viên làm bài", "Tại trang Học (/learn) sau khi ghi danh — hoặc nhận qua “Giao bài tập” có hạn chót ở tab Lớp học."],
          ].map(([n, t, d]) => (
            <li key={n} className="rounded-2xl bg-[var(--surface)] p-4">
              <span className="flex size-7 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-extrabold text-white">{n}</span>
              <h3 className="mt-2 text-sm font-extrabold">{t}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <nav aria-label="Chức năng nội dung" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/teacher/content?tab=${t.key}`}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-extrabold transition",
              tab === t.key
                ? "bg-[var(--brand)] text-white"
                : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)]",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "course" && (
        <form action={createCourseAction} className="md-card grid gap-3 p-5">
          <div>
            <h2 className="text-xl font-extrabold">Tạo khóa học nháp</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Khóa học mới ở trạng thái Nháp — học viên không thấy cho đến khi Admin duyệt.</p>
          </div>
          <input name="title" required placeholder="Tên khóa học" className="md-field" />
          <textarea name="description" placeholder="Mô tả" className="md-field" />
          <div className="grid grid-cols-2 gap-2">
            <input name="level" defaultValue="HSK1" className="md-field" />
            <select name="category" className="md-field">
              <option value="HSK">HSK</option>
              <option value="COMMUNICATION">Giao tiếp</option>
              <option value="EXAM">Luyện thi</option>
            </select>
          </div>
          <button className="md-button w-fit">Tạo bản nháp</button>
        </form>
      )}

      {tab === "unit" && (
        <form action={createUnitAction} className="md-card grid gap-3 p-5">
          <div>
            <h2 className="text-xl font-extrabold">Thêm unit</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Unit là nhóm các bài học (video, flashcard, quiz...) trong một khóa nháp.</p>
          </div>
          <select name="courseId" required className="md-field">
            <option value="">Chọn khóa nháp</option>
            {courses.filter((c) => c.status === "DRAFT").map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <input name="title" required placeholder="Tên unit" className="md-field" />
          <input name="objective" placeholder="Mục tiêu học tập" className="md-field" />
          <button className="md-button tonal w-fit">Thêm unit</button>
        </form>
      )}

      {tab === "video" && (units.length === 0 ? (
        <NoUnits />
      ) : (
        <FormCard title="Thêm video">
          <form action={createVideoLessonAction} className="space-y-3">
            <UnitSelect units={units} />
            <input name="title" placeholder="Tiêu đề" required className="field" />
            <LocalUploadField name="videoUrl" label="Tải video MP4" accept="video/mp4" />
            <textarea name="summary" placeholder="Tóm tắt" className="field" rows={2} />
            <div className="rounded-2xl border border-[var(--line)] p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Chapters (tùy chọn)</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Dòng để trống sẽ bỏ qua. Thời gian: giây hoặc m:ss (vd 1:30).</p>
              <div className="mt-2 grid grid-cols-[1fr_76px] gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Fragment key={i}>
                    <input name={`chapters[${i}][title]`} placeholder={i === 0 ? "VD: Phần chào hỏi" : `Chapter ${i + 1}`} className="field" />
                    <input name={`chapters[${i}][startSec]`} placeholder="m:ss" className="field" />
                  </Fragment>
                ))}
              </div>
            </div>
            <Button type="submit" fullWidth>
              Đăng tải
            </Button>
          </form>
        </FormCard>
      ))}

      {tab === "flashcard" && (units.length === 0 ? (
        <NoUnits />
      ) : (
        <FormCard title="Tạo Flashcard">
          <form action={createFlashcardDeckAction} className="space-y-3">
            <UnitSelect units={units} />
            <input name="title" placeholder="Tên bộ thẻ" required className="field" />
            <input name="hanzi" placeholder="Hán tự" className="field hanzi" />
            <input name="pinyin" placeholder="Pinyin" className="field" />
            <input name="meaningVi" placeholder="Nghĩa tiếng Việt" className="field" />
            <input name="example" placeholder="Ví dụ" className="field" />
            <Button type="submit" fullWidth>
              Tạo bộ thẻ
            </Button>
          </form>
        </FormCard>
      ))}

      {tab === "quiz" && (units.length === 0 ? (
        <NoUnits />
      ) : (
        <FormCard title="Tạo bài kiểm tra">
          <p className="mb-3 text-sm text-[var(--muted)]">
            Trắc nghiệm, điền khuyết hoặc xếp thứ tự — nhiều câu hỏi, tự động chấm điểm.
            Sau khi Admin duyệt + học viên ghi danh, bài sẽ hiện trong trang Học của học viên.
          </p>
          <QuizBuilder units={units} />
        </FormCard>
      ))}

      {tab === "essay" && (units.length === 0 ? (
        <NoUnits />
      ) : (
        <FormCard title="Tạo bài tự luận">
          <p className="mb-3 text-sm text-[var(--muted)]">Đề bài tự luận — có thể kèm rubric chấm theo tiêu chí.</p>
          <EssayBuilder units={units} />
        </FormCard>
      ))}

      {tab === "list" && (
        <section className="space-y-4">
          <h2 className="text-xl font-extrabold">Khóa học của bạn</h2>
          {courses.length === 0 && (
            <p className="rounded-2xl bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">Chưa có khóa học nào — tạo ở tab “Tạo khóa học”.</p>
          )}
          {courses.map((course) => (
            <div key={course.id} className="rounded-[22px] border border-[var(--line)] bg-white p-5">
              <h2 className="text-xl font-extrabold">{course.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="md-chip">{STATUS_LABELS[course.status] ?? course.status}</span>
                {course.status === "DRAFT" && (
                  <form action={submitCourseForReviewAction}>
                    <input type="hidden" name="courseId" value={course.id} />
                    <button className="md-button outlined">Gửi Admin duyệt</button>
                  </form>
                )}
              </div>
              <p className="mt-2 text-sm font-semibold text-[var(--muted)]">{STATUS_HINTS[course.status]}</p>
              {course.units.map((unit) => (
                <div key={unit.id} className="mt-4">
                  <h3 className="font-bold text-[var(--brand-dark)]">{unit.title}</h3>
                  <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                    {unit.nodes.map((n) => (
                      <li key={n.id}>
                        #{n.orderIndex} · {NODE_TYPE_LABELS[n.type] ?? n.type} · {n.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}
      <style>{`.field{width:100%;border-radius:14px;border:2px solid var(--line);padding:10px 12px;outline:none} .field:focus{border-color:var(--brand)}`}</style>
    </div>
  );
}

function NoUnits() {
  return (
    <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-white p-8 text-center">
      <h2 className="font-extrabold">Chưa có unit để thêm bài học</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Hãy tạo khóa học + unit trước, rồi quay lại tab này.</p>
      <Link href="/teacher/content?tab=unit" className="mt-4 inline-block rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-extrabold text-white">
        Thêm unit
      </Link>
    </div>
  );
}

function UnitSelect({ units }: { units: { id: string; title: string; courseTitle: string }[] }) {
  return (
    <select name="unitId" required className="field">
      <option value="">Chọn unit</option>
      {units.map((u) => (
        <option key={u.id} value={u.id}>
          {u.courseTitle} — {u.title}
        </option>
      ))}
    </select>
  );
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white p-5">
      <h2 className="mb-3 font-extrabold">{title}</h2>
      {children}
    </div>
  );
}
