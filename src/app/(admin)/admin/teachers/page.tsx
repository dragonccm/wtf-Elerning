import { createTeacherAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { toggleUserActiveAction } from "@/lib/classroom-actions";

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
      <form action={createTeacherAction} className="md-card mt-6 grid gap-3 p-5 md:grid-cols-3">
        <input name="name" placeholder="Họ tên" required className="md-field" />
        <input name="email" type="email" placeholder="Email" required className="md-field" />
        <input name="password" placeholder="Mật khẩu (mặc định password123)" className="md-field" />
        <div className="md:col-span-3">
          <Button type="submit">Tạo tài khoản giáo viên</Button>
        </div>
      </form>
      <ul className="md-card mt-6 divide-y divide-[var(--md-outline-variant)]">
        {teachers.map((t) => (
          <li key={t.id} className="flex items-center justify-between px-5 py-4 text-sm">
            <div>
              <p className="font-bold">{t.name}</p>
              <p className="text-[var(--muted)]">{t.email}</p>
            </div>
            <div className="flex items-center gap-3"><p className="text-[var(--md-on-surface-variant)]">{t.taughtCourses.length} khóa</p><form action={toggleUserActiveAction}><input type="hidden" name="userId" value={t.id}/><button className={`md-button ${t.isActive?"outlined":"tonal"}`}>{t.isActive?"Khóa":"Mở"}</button></form></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
