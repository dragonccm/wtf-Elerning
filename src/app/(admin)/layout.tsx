import { StaffSidebar } from "@/components/layout/StaffSidebar";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { requireRole } from "@/lib/session";
import { BookOpen, ChartColumn, GraduationCap, Users, Shield, ScrollText } from "lucide-react";
import { StaffTopBar } from "@/components/layout/StaffTopBar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN");
  return (
    <div className="staff-theme flex min-h-screen">
      <StaffSidebar
        title={`Admin · ${user.name}`}
        items={[
          { href: "/admin", label: "Tổng quan", icon: <Shield className="size-4" /> },
          { href: "/admin/courses", label: "Khóa học", icon: <BookOpen className="size-4" /> },
          { href: "/admin/teachers", label: "Giáo viên", icon: <GraduationCap className="size-4" /> },
          { href: "/admin/students", label: "Học viên", icon: <Users className="size-4" /> },
          { href: "/admin/reports", label: "Báo cáo", icon: <ChartColumn className="size-4" /> },
          { href: "/admin/audit", label: "Nhật ký", icon: <ScrollText className="size-4" /> },
        ]}
        footer={<LogoutButton />}
      />
      <div className="min-w-0 flex-1"><StaffTopBar title="Quản trị hệ thống" userName={user.name} /><main className="p-5 md:p-8">{children}</main></div>
    </div>
  );
}
