"use client";

import { clearToken } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="secondary"
      fullWidth
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        clearToken();
        router.push("/login");
        router.refresh();
      }}
    >
      Đăng xuất
    </Button>
  );
}
