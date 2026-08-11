import { enrollStudentAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function TeacherStudentsPage() {
  const user = await requireRole("TEACHER");
  const courses = await prisma.course.findMany({
    where: user.role === "ADMIN" ? undefined : { teacherId: user.id },
    include: {
      enrollments: { include: { user: true } },
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Học viên lớp</h1>
      <form action={enrollStudentAction} className="mt-6 flex flex-wrap gap-3 rounded-[22px] border border-[var(--line)] bg-white p-4">
        <select name="courseId" className="rounded-xl border-2 border-[var(--line)] px-3 py-2" required>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <input name="email" placeholder="email học viên" required className="min-w-[220px] flex-1 rounded-xl border-2 border-[var(--line)] px-3 py-2" />
        <Button type="submit">Ghi danh</Button>
      </form>
      <div className="mt-6 space-y-4">
        {courses.map((course) => (
          <section key={course.id} className="rounded-[22px] border border-[var(--line)] bg-white p-5">
            <h2 className="font-extrabold">{course.title}</h2>
            <ul className="mt-3 divide-y divide-[var(--line)]">
              {course.enrollments.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-semibold">{e.user.name}</span>
                  <span className="text-[var(--muted)]">{e.user.email}</span>
                </li>
              ))}
              {course.enrollments.length === 0 && <li className="py-3 text-sm text-[var(--muted)]">Chưa có học viên</li>}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
