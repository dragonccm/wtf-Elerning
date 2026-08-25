import { StaffSidebar } from "@/components/layout/StaffSidebar";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { requireRole } from "@/lib/session";
import { BookOpen, ClipboardCheck, Table, Users, ChartColumn, Layers } from "lucide-react";
import { StaffTopBar } from "@/components/layout/StaffTopBar";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("TEACHER");
  return (
    <div className="staff-theme flex min-h-screen">
      <StaffSidebar
        title={`Giáo viên · ${user.name}`}
        items={[
          { href: "/teacher", label: "Tổng quan", icon: <ChartColumn className="size-4" /> },
          { href: "/teacher/students", label: "Học viên lớp", icon: <Users className="size-4" /> },
          { href: "/teacher/classes", label: "Lớp học", icon: <BookOpen className="size-4" /> },
          { href: "/teacher/content", label: "Nội dung", icon: <Layers className="size-4" /> },
          { href: "/teacher/grading", label: "Chấm bài", icon: <ClipboardCheck className="size-4" /> },
          { href: "/teacher/grades", label: "Sổ điểm", icon: <Table className="size-4" /> },
          { href: "/teacher/progress", label: "Tiến độ lớp", icon: <BookOpen className="size-4" /> },
        ]}
        footer={<LogoutButton />}
      />
      <div className="min-w-0 flex-1">
        <StaffTopBar title="Giáo viên" userName={user.name} />
        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
