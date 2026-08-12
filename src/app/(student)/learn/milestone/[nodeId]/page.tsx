import { completeMilestoneAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Trophy } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { canAccessNode } from "@/lib/progress";

export default async function MilestonePage({ params }: { params: Promise<{ nodeId: string }> }) {
  const user = await requireUser();
  const { nodeId } = await params;
  if (!(await canAccessNode(user.id, nodeId))) notFound();
  const node = await prisma.lessonNode.findUnique({ where: { id: nodeId } });
  if (!node || node.type !== "MILESTONE") notFound();

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex size-24 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
        <Trophy className="size-12" />
      </div>
      <h1 className="mt-5 text-3xl font-extrabold">{node.title}</h1>
      <p className="mt-2 text-[var(--muted)]">Bạn đã đi hết chuỗi bài của unit này. +{node.xpReward} XP</p>
      <form action={completeMilestoneAction.bind(null, nodeId)} className="mt-8 w-full max-w-sm">
        <Button type="submit" fullWidth>
          Nhận thưởng & tiếp tục
        </Button>
      </form>
      <Link href="/learn" className="mt-4 text-sm font-bold text-[var(--muted)]">
        Về lộ trình
      </Link>
    </main>
  );
}
