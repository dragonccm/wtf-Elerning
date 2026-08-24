"use client";

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
