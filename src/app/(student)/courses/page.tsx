import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import Link from "next/link";

const btnPrimary =
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-2xl border-2 border-b-4 border-[var(--brand-dark)] bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white transition-all hover:brightness-105 active:translate-y-[2px] active:border-b-2";

const btnMuted =
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-2xl border-2 border-[var(--line)] bg-[var(--surface)] px-6 py-3 text-sm font-bold text-[var(--muted)]";

export default async function CoursesPage() {
  const user = await requireUser();
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    include: {
      teacher: true,
      enrollments: { where: { userId: user.id } },
      classrooms: { where: { members: { some: { userId: user.id } } } },
      _count: { select: { units: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 lg:px-8">
      <header>
        <h1 className="text-3xl font-extrabold text-[#3c3c3c]">Khóa học</h1>
        <p className="mt-2 text-[var(--muted)]">Chọn khóa để tiếp tục chuỗi bài.</p>
      </header>

      <ul className="mt-8 space-y-4">
        {courses.map((course) => {
          const enrolled = course.classrooms.length > 0 || course.enrollments.length > 0;

          return (
            <li
              key={course.id}
              className="rounded-2xl border-2 border-[var(--line)] bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <span className="inline-block rounded-lg bg-[var(--brand-soft)] px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide text-[var(--brand-dark)]">
                    {course.level}
                  </span>
                  <h2 className="mt-2 text-xl font-extrabold leading-snug text-[#3c3c3c]">{course.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{course.description}</p>
                  <p className="mt-3 text-xs font-semibold text-[var(--muted)]">
                    GV: {course.teacher?.name ?? "Chưa gán"} · {course._count.units} unit
                  </p>
                </div>

                <div className="w-full sm:w-auto sm:pl-4">
                  {enrolled ? (
                    <Link href={`/learn/${course.id}`} className={`${btnPrimary} w-full sm:w-auto`}>
                      Học tiếp
                    </Link>
                  ) : (
                    <span className={`${btnMuted} w-full sm:w-auto`}>Chưa ghi danh</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <Link href="/courses/join" className="mt-6 inline-flex font-extrabold text-[var(--brand-dark)]">Có mã lớp? Tham gia tại đây →</Link>

      {courses.length === 0 && (
        <p className="mt-8 text-center text-[var(--muted)]">Chưa có khóa học nào được xuất bản.</p>
      )}
    </main>
  );
}
