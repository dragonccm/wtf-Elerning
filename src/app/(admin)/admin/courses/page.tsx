import { assignTeacherAction, createCourseAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function AdminCoursesPage() {
  await requireRole("ADMIN");
  const [courses, teachers] = await Promise.all([
    prisma.course.findMany({
      include: { teacher: true, _count: { select: { enrollments: true, units: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { role: "TEACHER" } }),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Quản lý khóa học</h1>
      <form action={createCourseAction} className="mt-6 grid gap-3 rounded-[22px] border border-[var(--line)] bg-white p-5 md:grid-cols-2">
        <input name="title" placeholder="Tên khóa học" required className="rounded-xl border-2 border-[var(--line)] px-3 py-2 md:col-span-2" />
        <input name="description" placeholder="Mô tả" className="rounded-xl border-2 border-[var(--line)] px-3 py-2 md:col-span-2" />
        <input name="level" placeholder="Cấp độ" defaultValue="HSK1" className="rounded-xl border-2 border-[var(--line)] px-3 py-2" />
        <select name="teacherId" className="rounded-xl border-2 border-[var(--line)] px-3 py-2">
          <option value="">Chưa gán GV</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="md:col-span-2">
          <Button type="submit">Tạo khóa học</Button>
        </div>
      </form>

      <ul className="mt-6 space-y-3">
        {courses.map((course) => (
          <li key={course.id} className="rounded-[22px] border border-[var(--line)] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold">{course.title}</h2>
                <p className="text-sm text-[var(--muted)]">
                  {course.level} · {course._count.units} unit · {course._count.enrollments} HV · GV:{" "}
                  {course.teacher?.name ?? "—"}
                </p>
              </div>
              <form action={assignTeacherAction} className="flex gap-2">
                <input type="hidden" name="courseId" value={course.id} />
                <select name="teacherId" defaultValue={course.teacherId ?? ""} className="rounded-xl border-2 border-[var(--line)] px-2 py-1 text-sm">
                  <option value="">Chọn GV</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="secondary">
                  Gán
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
