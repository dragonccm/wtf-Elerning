"use client";

import { loginAction, registerAction } from "@/lib/auth-actions";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <div className="animate-rise rounded-[28px] border border-[var(--line)] bg-white p-6 shadow-[var(--shadow-card)]">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">WTF E-learning</p>
      <h1 className="mt-2 text-2xl font-extrabold">Đăng nhập</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">JWT auth · server actions</p>
      <form action={formAction} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold">
          Email
          <input
            name="email"
            type="email"
            required
            defaultValue="student@wtf.edu"
            className="mt-1 w-full rounded-2xl border-2 border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--brand)]"
          />
        </label>
        <label className="block text-sm font-semibold">
          Mật khẩu
          <input
            name="password"
            type="password"
            required
            defaultValue="password123"
            className="mt-1 w-full rounded-2xl border-2 border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--brand)]"
          />
        </label>
        {state?.error && <p className="text-sm font-semibold text-[var(--danger)]">{state.error}</p>}
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>
      <a
        href="/api/auth/google"
        className="mt-3 flex w-full items-center justify-center rounded-2xl border-2 border-[var(--line)] px-4 py-3 text-sm font-extrabold text-[var(--ink)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]"
      >
        Tiếp tục với Google
      </a>
      <div className="mt-4 flex justify-between text-sm font-semibold text-[var(--brand)]">
        <Link href="/forgot-password">Quên mật khẩu?</Link>
        <Link href="/register">Đăng ký</Link>
      </div>
    </div>
  );
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, {});

  return (
    <div className="animate-rise rounded-[28px] border border-[var(--line)] bg-white p-6 shadow-[var(--shadow-card)]">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">Học viên</p>
      <h1 className="mt-2 text-2xl font-extrabold">Tạo tài khoản</h1>
      <form action={formAction} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold">
          Họ tên
          <input name="name" required className="mt-1 w-full rounded-2xl border-2 border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--brand)]" />
        </label>
        <label className="block text-sm font-semibold">
          Email
          <input name="email" type="email" required className="mt-1 w-full rounded-2xl border-2 border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--brand)]" />
        </label>
        <label className="block text-sm font-semibold">
          Mật khẩu
          <input name="password" type="password" required minLength={6} className="mt-1 w-full rounded-2xl border-2 border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--brand)]" />
        </label>
        {state?.error && <p className="text-sm font-semibold text-[var(--danger)]">{state.error}</p>}
        <Button type="submit" fullWidth disabled={pending}>
          Đăng ký
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-bold text-[var(--brand)]">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
