import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLiveData } from "@/lib/live-room";
import { getOptionalUser } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ classroomId: string }> }) {
  const user = await getOptionalUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { classroomId } = await params;
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isTeacherSide = user.role === "ADMIN" || classroom.teacherId === user.id;
  if (!isTeacherSide) {
    const member = await prisma.classroomMember.findUnique({
      where: { classroomId_userId: { classroomId, userId: user.id } },
    });
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(await getLiveData(classroomId, user.id));
}
