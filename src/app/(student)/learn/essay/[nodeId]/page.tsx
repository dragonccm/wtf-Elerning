import { EssayForm } from "@/components/learning/EssayForm";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";
import Link from "next/link";
import { canAccessNode } from "@/lib/progress";

export default async function EssayPage({ params }: { params: Promise<{ nodeId: string }> }) {
  const user = await requireUser();
  const { nodeId } = await params;
  if (!(await canAccessNode(user.id, nodeId))) notFound();
  const node = await prisma.lessonNode.findUnique({
    where: { id: nodeId },
    include: { assessment: { include: { questions: true } } },
  });
  if (!node?.assessment) notFound();
  const question = node.assessment.questions[0];

  return (
    <main className="px-4 py-4">
      <Link href="/learn" className="text-sm font-bold text-[var(--muted)]">
        ← Lộ trình
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold">{node.title}</h1>
      <p className="mt-2 text-[var(--muted)]">{question?.prompt}</p>
      <EssayForm assessmentId={node.assessment.id} nodeId={nodeId} />
    </main>
  );
}
