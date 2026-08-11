import { createTeacherAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function AdminTeachersPage() {
  await requireRole("ADMIN");
  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    include: { taughtCourses: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Quản lý giáo viên</h1>
      <form action={createTeacherAction} className="mt-6 grid gap-3 rounded-[22px] border border-[var(--line)] bg-white p-5 md:grid-cols-3">
        <input name="name" placeholder="Họ tên" required className="rounded-xl border-2 border-[var(--line)] px-3 py-2" />
        <input name="email" type="email" placeholder="Email" required className="rounded-xl border-2 border-[var(--line)] px-3 py-2" />
        <input name="password" placeholder="Mật khẩu (mặc định password123)" className="rounded-xl border-2 border-[var(--line)] px-3 py-2" />
        <div className="md:col-span-3">
          <Button type="submit">Tạo tài khoản giáo viên</Button>
        </div>
      </form>
      <ul className="mt-6 divide-y divide-[var(--line)] rounded-[22px] border border-[var(--line)] bg-white">
        {teachers.map((t) => (
          <li key={t.id} className="flex items-center justify-between px-5 py-4 text-sm">
            <div>
              <p className="font-bold">{t.name}</p>
              <p className="text-[var(--muted)]">{t.email}</p>
            </div>
            <p className="text-[var(--muted)]">{t.taughtCourses.length} khóa</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
