import { ClassroomSecurityActions, CreateClassroomForm, InviteStudentForm } from "@/components/staff/ClassroomForms";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import Link from "next/link";

export default async function TeacherClassesPage() {
  const user = await requireRole("TEACHER");
  const [courses, classrooms] = await Promise.all([
    prisma.course.findMany({ where: { teacherId: user.id, status: "PUBLISHED" }, select: { id: true, title: true } }),
    prisma.classroom.findMany({
      where: user.role === "ADMIN" ? {} : { teacherId: user.id },
      include: { course: true, _count: { select: { members: true, invitations: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-bold text-[var(--md-primary)]">QUẢN LÝ LỚP</p>
        <h1 className="mt-1 text-3xl font-extrabold">Lớp học của bạn</h1>
        <p className="mt-2 text-[var(--md-on-surface-variant)]">Mở lớp, chia sẻ mã tham gia và theo dõi danh sách học viên.</p>
      </header>
      <CreateClassroomForm courses={courses} />
      <section className="grid gap-4">
        {classrooms.map((c) => (
          <article key={c.id} className="md-card p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <span className="md-chip">{c.status}</span>
                <h2 className="mt-2 text-xl font-extrabold">{c.name}</h2>
                <p className="text-sm text-[var(--md-on-surface-variant)]">
                  {c.course.title} · {c._count.members} học viên · {c._count.invitations} lời mời
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="rounded-2xl bg-[var(--md-surface-container)] px-4 py-3 text-center">
                  <p className="text-xs font-bold uppercase">Mã lớp</p>
                  <strong className="font-mono text-lg">{c.code}</strong>
                </div>
                <Link href={`/teacher/classes/${c.id}`} className="md-button tonal">Quản lý lớp</Link>
              </div>
            </div>
            {c.status !== "ENDED" && <InviteStudentForm classroomId={c.id} />}
            <ClassroomSecurityActions classroomId={c.id} ended={c.status === "ENDED"} />
          </article>
        ))}
        {classrooms.length === 0 && (
          <div className="md-card p-10 text-center text-[var(--md-on-surface-variant)]">Chưa có lớp học nào.</div>
        )}
      </section>
    </div>
  );
}
