import { StaffSidebar } from "@/components/layout/StaffSidebar";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { requireRole } from "@/lib/session";
import { BookOpen, ClipboardCheck, Users, ChartColumn, Layers } from "lucide-react";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("TEACHER");
  return (
    <div className="flex min-h-screen">
      <StaffSidebar
        title={`Giáo viên · ${user.name}`}
        items={[
          { href: "/teacher", label: "Tổng quan", icon: <ChartColumn className="size-4" /> },
          { href: "/teacher/students", label: "Học viên lớp", icon: <Users className="size-4" /> },
          { href: "/teacher/content", label: "Nội dung", icon: <Layers className="size-4" /> },
          { href: "/teacher/grading", label: "Chấm bài", icon: <ClipboardCheck className="size-4" /> },
          { href: "/teacher/progress", label: "Tiến độ lớp", icon: <BookOpen className="size-4" /> },
        ]}
        footer={<LogoutButton />}
      />
      <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
    </div>
  );
}
