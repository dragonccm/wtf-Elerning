import { forgotPasswordAction } from "@/lib/actions";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="animate-rise rounded-[28px] border border-[var(--line)] bg-white p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-extrabold">Quên mật khẩu</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Nhập email để nhận hướng dẫn (bản demo).</p>
        <form action={forgotPasswordAction} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">
            Email
            <input name="email" type="email" required className="mt-1 w-full rounded-2xl border-2 border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--brand)]" />
          </label>
          <Button type="submit" fullWidth>
            Gửi hướng dẫn
          </Button>
        </form>
        <Link href="/login" className="mt-4 block text-center text-sm font-bold text-[var(--brand)]">
          Quay lại đăng nhập
        </Link>
      </div>
    </main>
  );
}
