import { getOptionalUser } from "@/lib/session";
import { homeForRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function HomePage() {
  const user = await getOptionalUser();
  if (user) redirect(homeForRole(user.role));

  return (
    <main className="grain relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
      <div className="animate-rise max-w-xl">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--brand)]">WTF E-learning</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight text-[var(--ink)] md:text-5xl">
          Học tiếng Trung theo chuỗi bài — nhìn là biết bước tiếp theo
        </h1>
        <p className="mt-4 text-lg text-[var(--muted)]">
          Flashcard Hán-Pinyin-Việt, video bài giảng, bài tập tự chấm và nhận xét từ giáo viên — giao diện sạch, tập trung.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login">
            <Button>Đăng nhập</Button>
          </Link>
          <Link href="/register">
            <Button variant="secondary">Đăng ký học viên</Button>
          </Link>
        </div>
        <p className="mt-6 text-sm text-[var(--muted)]">
          Demo: student@wtf.edu / teacher@wtf.edu / admin@wtf.edu — mật khẩu <strong>password123</strong>
        </p>
      </div>
      <div className="pointer-events-none absolute right-8 top-24 hidden h-72 w-72 rounded-[40px] bg-[var(--brand)]/15 blur-2xl md:block" />
    </main>
  );
}
