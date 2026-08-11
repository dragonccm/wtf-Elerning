import { setUserRoleAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function AdminStudentsPage() {
  await requireRole("ADMIN");
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    include: {
      enrollments: { include: { course: true } },
      _count: { select: { submissions: true, progressEvents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Quản lý học viên</h1>
      <p className="mt-1 text-[var(--muted)]">Toàn hệ thống — xem ghi danh và hoạt động.</p>
      <ul className="mt-6 space-y-3">
        {students.map((s) => (
          <li key={s.id} className="rounded-[22px] border border-[var(--line)] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-extrabold">{s.name}</p>
                <p className="text-sm text-[var(--muted)]">{s.email}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {s.enrollments.map((e) => e.course.title).join(", ") || "Chưa ghi danh"} ·{" "}
                  {s._count.progressEvents} bài xong · {s._count.submissions} bài nộp
                </p>
              </div>
              <form action={setUserRoleAction} className="flex gap-2">
                <input type="hidden" name="userId" value={s.id} />
                <select name="role" defaultValue="STUDENT" className="rounded-xl border-2 border-[var(--line)] px-2 py-1 text-sm">
                  <option value="STUDENT">STUDENT</option>
                  <option value="TEACHER">TEACHER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <Button type="submit" variant="secondary">
                  Đổi role
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
