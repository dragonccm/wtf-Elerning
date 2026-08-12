import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export async function GET() {
  await requireRole("ADMIN");
  const courses = await prisma.course.findMany({ include: { teacher: true, classrooms: { include: { _count: { select: { members: true } } } }, units: { include: { nodes: true } } }, orderBy: { createdAt: "desc" } });
  const rows = [["Khóa học", "Loại", "Trạng thái", "Giáo viên", "Số lớp", "Học viên", "Bài học"], ...courses.map(c => [c.title, c.category, c.status, c.teacher?.name, c.classrooms.length, c.classrooms.reduce((s,x)=>s+x._count.members,0), c.units.reduce((s,u)=>s+u.nodes.length,0)])];
  const csv = "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="bao-cao-khoa-hoc.csv"' } });
}
