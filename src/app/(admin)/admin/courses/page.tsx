import { assignTeacherAction, createCourseAction, createUnitAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { reviewCourseAction } from "@/lib/classroom-actions";

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
    <div className="space-y-7">
      <h1 className="text-3xl font-extrabold">Quản lý khóa học</h1>
      <form action={createCourseAction} className="md-card grid gap-3 p-5 md:grid-cols-2">
        <input name="title" placeholder="Tên khóa học" required className="md-field md:col-span-2" />
        <input name="description" placeholder="Mô tả" className="md-field md:col-span-2" />
        <input name="level" placeholder="Cấp độ" defaultValue="HSK1" className="md-field" />
        <select name="category" className="md-field"><option value="HSK">HSK</option><option value="COMMUNICATION">Giao tiếp</option><option value="EXAM">Luyện thi</option></select>
        <select name="teacherId" className="md-field">
          <option value="">Chưa gán GV</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="md:col-span-2">
          <button type="submit" className="md-button">Tạo bản nháp</button>
        </div>
      </form>

      <ul className="mt-6 space-y-3">
        {courses.map((course) => (
          <li key={course.id} className="md-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><h2 className="text-lg font-extrabold">{course.title}</h2><span className="md-chip">{course.status}</span></div>
                <p className="text-sm text-[var(--muted)]">
                  {course.level} · {course._count.units} unit · {course._count.enrollments} HV · GV:{" "}
                  {course.teacher?.name ?? "—"}
                </p>
              </div>
              <form action={assignTeacherAction} className="flex gap-2">
                <input type="hidden" name="courseId" value={course.id} />
                <select name="teacherId" defaultValue={course.teacherId ?? ""} className="md-field min-h-10 py-1 text-sm">
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
            {course.status === "PENDING_REVIEW" && <form action={reviewCourseAction} className="mt-4 flex flex-wrap gap-2 border-t border-[var(--md-outline-variant)] pt-4"><input type="hidden" name="courseId" value={course.id}/><input name="note" placeholder="Nhận xét duyệt" className="md-field min-w-64 flex-1"/><button name="decision" value="approve" className="md-button">Duyệt & xuất bản</button><button name="decision" value="reject" className="md-button outlined">Yêu cầu sửa</button></form>}
            <form action={createUnitAction} className="mt-4 grid gap-2 border-t border-[var(--line)] pt-4 md:grid-cols-[1fr_1.5fr_auto]">
              <input type="hidden" name="courseId" value={course.id} />
              <input
                name="title"
                required
                placeholder="Tên unit mới"
                className="md-field text-sm"
              />
              <input
                name="objective"
                placeholder="Mục tiêu học tập"
                className="md-field text-sm"
              />
              <Button type="submit" variant="secondary">Thêm unit</Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
