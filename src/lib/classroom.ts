import { prisma } from "@/lib/db";

export type AssignmentStudentStatus = "TO_DO" | "TURNED_IN" | "LATE";

type AssignmentWithNodes = {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date;
  status: "PUBLISHED" | "CLOSED" | "ARCHIVED";
  createdAt: Date;
  publishedAt: Date | null;
  closedAt: Date | null;
  nodes: { nodeId: string; orderIndex: number; node: { id: string; title: string; type: string; unit: { title: string } } }[];
};

type StudentAssignmentRow = AssignmentWithNodes & {
  doneCount: number;
  total: number;
  lastCompletedAt: Date | null;
  studentStatus: AssignmentStudentStatus;
};

function withStatus(
  assignment: { nodes: { nodeId: string }[]; dueAt: Date },
  doneAt: Map<string, Date>,
): Pick<StudentAssignmentRow, "doneCount" | "total" | "lastCompletedAt" | "studentStatus"> {
  const doneCount = assignment.nodes.filter((n) => doneAt.has(n.nodeId)).length;
  const total = assignment.nodes.length;
  const lastCompletedAt = assignment.nodes.reduce<Date | null>((acc, n) => {
    const t = doneAt.get(n.nodeId);
    return t && (!acc || t > acc) ? t : acc;
  }, null);
  const complete = total > 0 && doneCount === total;
  const studentStatus: AssignmentStudentStatus = complete
    ? lastCompletedAt !== null && lastCompletedAt > assignment.dueAt
      ? "LATE"
      : "TURNED_IN"
    : "TO_DO";
  return { doneCount, total, lastCompletedAt, studentStatus };
}

/**
 * Assignments of a class for one student, with derived per-student status.
 * Status is computed from ProgressEvent (single source of truth) — a node
 * completed anywhere (path or assignment) counts toward the assignment.
 */
export async function getStudentAssignments(classroomId: string, userId: string): Promise<StudentAssignmentRow[]> {
  const assignments = await prisma.assignment.findMany({
    where: { classroomId, status: { not: "ARCHIVED" } },
    include: {
      nodes: { orderBy: { orderIndex: "asc" }, include: { node: { include: { unit: { select: { title: true } } } } } },
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
  });
  const nodeIds = assignments.flatMap((a) => a.nodes.map((n) => n.nodeId));
  if (nodeIds.length === 0) return [];
  const progress = await prisma.progressEvent.findMany({
    where: { userId, nodeId: { in: nodeIds }, completed: true, completedAt: { not: null } },
    select: { nodeId: true, completedAt: true },
  });
  const doneAt = new Map(progress.map((p) => [p.nodeId, p.completedAt!]));
  return assignments.map((a) => ({ ...a, ...withStatus(a, doneAt) }));
}

/**
 * Assignments of a class for the teacher, with a per-member progress row.
 */
export async function getTeacherAssignmentBoard(classroomId: string) {
  const [assignments, members] = await Promise.all([
    prisma.assignment.findMany({
      where: { classroomId, status: { not: "ARCHIVED" } },
      include: {
        nodes: { orderBy: { orderIndex: "asc" } },
        creator: { select: { name: true } },
      },
      orderBy: [{ status: "asc" }, { dueAt: "desc" }],
    }),
    prisma.classroomMember.findMany({
      where: { classroomId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);
  const nodeIds = assignments.flatMap((a) => a.nodes.map((n) => n.nodeId));
  const progress = nodeIds.length
    ? await prisma.progressEvent.findMany({
        where: { nodeId: { in: nodeIds }, completed: true, completedAt: { not: null } },
        select: { userId: true, nodeId: true, completedAt: true },
      })
    : [];
  const perUser = new Map<string, Map<string, Date>>();
  for (const p of progress) {
    const m = perUser.get(p.userId) ?? new Map<string, Date>();
    m.set(p.nodeId, p.completedAt!);
    perUser.set(p.userId, m);
  }
  return assignments.map((a) => ({
    ...a,
    members: members.map((m) => {
      const doneAt = perUser.get(m.user.id) ?? new Map<string, Date>();
      const { doneCount, total, lastCompletedAt, studentStatus } = withStatus(a, doneAt);
      return { userId: m.user.id, name: m.user.name, email: m.user.email, doneCount, total, lastCompletedAt, studentStatus };
    }),
  }));
}
