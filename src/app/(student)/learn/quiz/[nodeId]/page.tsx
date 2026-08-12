import { QuizPlayer } from "@/components/learning/QuizPlayer";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";
import Link from "next/link";
import { canAccessNode } from "@/lib/progress";

export default async function QuizPage({ params }: { params: Promise<{ nodeId: string }> }) {
  const user = await requireUser();
  const { nodeId } = await params;
  if (!(await canAccessNode(user.id, nodeId))) notFound();
  const node = await prisma.lessonNode.findUnique({
    where: { id: nodeId },
    include: {
      assessment: {
        include: { questions: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });
  if (!node?.assessment) notFound();

  const questions = node.assessment.questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: q.optionsJson ? (JSON.parse(q.optionsJson) as string[]) : [],
    points: q.points,
  }));

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <Link href="/learn" className="text-sm font-bold text-[var(--muted)]">
          ✕ Thoát
        </Link>
        <p className="text-sm font-bold text-[var(--ink)]">{node.assessment.title}</p>
      </div>
      <QuizPlayer assessmentId={node.assessment.id} nodeId={nodeId} questions={questions} />
    </main>
  );
}
