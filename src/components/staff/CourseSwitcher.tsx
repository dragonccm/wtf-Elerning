"use client";

export function CourseSwitcher({ courses, selected }: { courses: { id: string; title: string }[]; selected: string }) {
  return (
    <form method="GET" action="/teacher/grades" className="flex items-center gap-2">
      <label htmlFor="gradebook-course" className="text-sm font-bold text-[var(--muted)]">
        Khóa học
      </label>
      <select
        id="gradebook-course"
        name="course"
        defaultValue={selected}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-[14px] border-2 border-[var(--line)] bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[var(--brand)]"
      >
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
    </form>
  );
}
