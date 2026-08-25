"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="secondary"
      fullWidth={!compact}
      className={compact ? "shrink-0 px-4 py-2 text-sm" : undefined}
      onClick={async () => {
        localStorage.removeItem("wtf_token");
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        router.push("/login");
        router.refresh();
      }}
    >
      Đăng xuất
    </Button>
  );
}
