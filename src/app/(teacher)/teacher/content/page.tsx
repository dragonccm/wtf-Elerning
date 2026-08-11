import { createFlashcardDeckAction, createQuizAction, createVideoLessonAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function TeacherContentPage() {
  const user = await requireRole("TEACHER");
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">Nội dung bài học</h1>
        <p className="mt-1 text-[var(--muted)]">Tạo video, flashcard và bài tập trong unit được giao.</p>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <FormCard title="Thêm video">
          <form action={createVideoLessonAction} className="space-y-3">
            <UnitSelect units={units} />
            <input name="title" placeholder="Tiêu đề" required className="field" />
            <input name="videoUrl" placeholder="URL video" className="field" />
            <textarea name="summary" placeholder="Tóm tắt" className="field" rows={2} />
            <Button type="submit" fullWidth>
              Đăng tải
            </Button>
          </form>
        </FormCard>
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
        <FormCard title="Tạo bài tập">
          <form action={createQuizAction} className="space-y-3">
            <UnitSelect units={units} />
            <input name="title" placeholder="Tiêu đề bài" required className="field" />
            <input name="prompt" placeholder="Câu hỏi" required className="field" />
            <input name="options" placeholder="Đáp án cách nhau |" defaultValue="A|B|C|D" className="field" />
            <input name="answer" placeholder="Đáp án đúng" className="field" />
            <Button type="submit" fullWidth>
              Tạo quiz
            </Button>
          </form>
        </FormCard>
      </section>

      <section className="space-y-4">
        {courses.map((course) => (
          <div key={course.id} className="rounded-[22px] border border-[var(--line)] bg-white p-5">
            <h2 className="text-xl font-extrabold">{course.title}</h2>
            {course.units.map((unit) => (
              <div key={unit.id} className="mt-4">
                <h3 className="font-bold text-[var(--brand-dark)]">{unit.title}</h3>
                <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                  {unit.nodes.map((n) => (
                    <li key={n.id}>
                      #{n.orderIndex} · {n.type} · {n.title}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </section>
      <style>{`.field{width:100%;border-radius:14px;border:2px solid var(--line);padding:10px 12px;outline:none} .field:focus{border-color:var(--brand)}`}</style>
    </div>
  );
}

function UnitSelect({ units }: { units: { id: string; title: string; courseTitle: string }[] }) {
  return (
    <select name="unitId" required className="field">
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
