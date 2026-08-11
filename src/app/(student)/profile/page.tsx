import { LogoutButton } from "@/components/auth/LogoutButton";
import { updateProfileAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function ProfilePage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } });

  return (
    <main className="px-5 py-6">
      <h1 className="text-3xl font-extrabold">Hồ sơ</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">Vai trò: {user.role}</p>
      <form action={updateProfileAction} className="mt-6 space-y-4 rounded-[24px] border border-[var(--line)] bg-white p-5">
        <label className="block text-sm font-semibold">
          Họ tên
          <input name="name" defaultValue={user.name} className="mt-1 w-full rounded-2xl border-2 border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--brand)]" />
        </label>
        <label className="block text-sm font-semibold">
          Email
          <input value={user.email} disabled className="mt-1 w-full rounded-2xl border-2 border-[var(--line)] bg-[var(--surface)] px-4 py-3" />
        </label>
        <label className="block text-sm font-semibold">
          Giới thiệu
          <textarea name="bio" defaultValue={user.bio ?? ""} rows={3} className="mt-1 w-full rounded-2xl border-2 border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--brand)]" />
        </label>
        <Button type="submit" fullWidth>
          Cập nhật hồ sơ
        </Button>
      </form>
      <div className="mt-4">
        <LogoutButton />
      </div>
    </main>
  );
}
