"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/api-client";

function GoogleCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const home = searchParams.get("home");
    if (!token) {
      router.replace("/login?error=Không thể hoàn tất đăng nhập Google.");
      return;
    }
    setToken(token);
    router.replace(home && home.startsWith("/") ? home : "/learn");
    router.refresh();
  }, [router, searchParams]);

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--paper)] p-6">
      <p className="text-center text-sm font-semibold text-[var(--muted)]">Đang hoàn tất đăng nhập Google…</p>
    </main>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[var(--paper)] p-6">
          <p className="text-center text-sm font-semibold text-[var(--muted)]">Đang hoàn tất đăng nhập Google…</p>
        </main>
      }
    >
      <GoogleCallbackHandler />
    </Suspense>
  );
}
