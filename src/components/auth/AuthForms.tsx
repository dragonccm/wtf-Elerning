"use client";

import { loginApi, registerApi, setToken } from "@/lib/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await loginApi(String(fd.get("email")), String(fd.get("password")));
      setToken(res.token);
      router.push(res.home);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="animate-rise rounded-[28px] border border-[var(--line)] bg-white p-6 shadow-[var(--shadow-card)]">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">WTF E-learning</p>
      <h1 className="mt-2 text-2xl font-extrabold">Đăng nhập</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">Backend API riêng · JWT auth</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
        {error && <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>}
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>
      <div className="mt-4 flex justify-between text-sm font-semibold text-[var(--brand)]">
        <Link href="/forgot-password">Quên mật khẩu?</Link>
        <Link href="/register">Đăng ký</Link>
      </div>
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await registerApi(String(fd.get("name")), String(fd.get("email")), String(fd.get("password")));
      setToken(res.token);
      router.push(res.home);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="animate-rise rounded-[28px] border border-[var(--line)] bg-white p-6 shadow-[var(--shadow-card)]">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">Học viên</p>
      <h1 className="mt-2 text-2xl font-extrabold">Tạo tài khoản</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
        {error && <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>}
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
