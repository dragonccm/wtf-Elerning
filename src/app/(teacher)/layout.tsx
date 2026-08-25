import { requireRole } from "@/lib/session";
import { StaffTopBar } from "@/components/layout/StaffTopBar";
import { TeacherTabs } from "@/components/staff/TeacherTabs";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("TEACHER");
  return (
    <div className="staff-theme min-h-screen">
      <StaffTopBar title={`Giáo viên · ${user.name}`} userName={user.name} />
      <TeacherTabs />
      <main className="mx-auto w-full max-w-6xl p-5 pb-12 md:p-8">{children}</main>
    </div>
  );
}
