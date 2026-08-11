import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import Link from "next/link";

export default async function TeacherHomePage() {
  const user = await requireRole("TEACHER");
  const courses = await prisma.course.findMany({
    where: user.role === "ADMIN" ? undefined : { teacherId: user.id },
    include: {
      _count: { select: { enrollments: true, units: true } },
    },
  });
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
    <div>
      <h1 className="text-3xl font-extrabold">Bảng giáo viên</h1>
      <p className="mt-1 text-[var(--muted)]">Tầng 2 — quản lý lớp và nội dung được giao.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Khóa phụ trách" value={String(courses.length)} />
        <Stat label="Học viên (tổng)" value={String(courses.reduce((s, c) => s + c._count.enrollments, 0))} />
        <Stat label="Bài chờ chấm" value={String(pending)} />
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <QuickLink href="/teacher/content" title="Tạo nội dung" desc="Video, flashcard, bài tập" />
        <QuickLink href="/teacher/grading" title="Chấm tự luận" desc="Nhận xét & đánh dấu lỗi" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-[22px] border border-[var(--line)] bg-white p-5 transition hover:border-[var(--brand)]">
      <h2 className="text-lg font-extrabold">{title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{desc}</p>
    </Link>
  );
}
