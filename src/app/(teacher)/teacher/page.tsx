import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import Link from "next/link";

export default async function TeacherHomePage() {
  const user = await requireRole("TEACHER");
  const [classrooms, members, drafts, reviews] = await Promise.all([
    prisma.classroom.count({ where: { teacherId: user.id, status: { in: ["OPEN", "ACTIVE"] } } }),
    prisma.classroomMember.count({ where: { classroom: { teacherId: user.id } } }),
    prisma.course.count({ where: { teacherId: user.id, status: "DRAFT" } }),
    prisma.course.count({ where: { teacherId: user.id, status: "PENDING_REVIEW" } }),
  ]);
  const pending = await prisma.submission.count({
    where: {
      status: "SUBMITTED",
      autoGraded: false,
      ...(user.role === "ADMIN"
        ? {}
        : { user: { enrollments: { some: { course: { teacherId: user.id } } } } }),
    },
  });

  return (
    <div className="space-y-7">
      <header><p className="text-sm font-bold text-[var(--md-primary)]">KHÔNG GIAN BIÊN SOẠN</p><h1 className="mt-1 text-3xl font-extrabold">Tổng quan giáo viên</h1><p className="mt-2 text-[var(--md-on-surface-variant)]">Chọn tab phía trên để tạo nội dung, chấm bài hoặc quản lý lớp.</p></header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Lớp hoạt động" value={String(classrooms)} />
        <Stat label="Học viên" value={String(members)} />
        <Stat label="Bài chờ chấm" value={String(pending)} />
        <Stat label="Nháp / Chờ duyệt" value={`${drafts} / ${reviews}`} />
      </div>
      <section className="md-card p-5">
        <h2 className="text-lg font-extrabold">Một bài kiểm tra đến tay học viên qua 4 bước</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["1", "Tạo trong tab Nội dung", "Quiz nhiều câu / tự luận trong unit của khóa nháp."],
            ["2", "Gửi Admin duyệt", "Nút “Gửi Admin duyệt” dưới mỗi khóa — học viên chưa thấy gì trước khi duyệt."],
            ["3", "Ghi danh học viên", "Tab Học viên (thêm học viên vào khóa) hoặc học viên tự vào lớp."],
            ["4", "Học viên làm tại /learn", "Bài hiện trong đường học; điểm tự vào Sổ điểm. Có thể giao kèm hạn chót ở tab Lớp học."],
          ].map(([n, t, d]) => (
            <li key={n} className="rounded-2xl bg-[var(--md-surface-container)] p-4">
              <span className="flex size-7 items-center justify-center rounded-full bg-[var(--md-primary)] text-xs font-extrabold text-[var(--md-on-primary)]">{n}</span>
              <h3 className="mt-2 text-sm font-extrabold">{t}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--md-on-surface-variant)]">{d}</p>
            </li>
          ))}
        </ol>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuickLink href="/teacher/content" title="Tạo nội dung" desc="Video, flashcard, bài kiểm tra, tự luận" />
        <QuickLink href="/teacher/grading" title="Chấm tự luận" desc="Nhận xét, lỗi sai, chấm lại được" />
        <QuickLink href="/teacher/grades" title="Sổ điểm" desc="Điểm kiểm tra theo học viên" />
        <QuickLink href="/teacher/classes" title="Lớp học" desc="Thông báo, giao bài, hỏi nhanh trực tiếp" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="md-card p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--md-on-surface-variant)]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="md-card p-5 transition hover:-translate-y-1 hover:shadow-lg">
      <h2 className="text-lg font-extrabold">{title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{desc}</p>
    </Link>
  );
}
