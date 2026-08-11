import { submitEssayAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function EssayPage({ params }: { params: Promise<{ nodeId: string }> }) {
  await requireUser();
  const { nodeId } = await params;
  const node = await prisma.lessonNode.findUnique({
    where: { id: nodeId },
    include: { assessment: { include: { questions: true } } },
  });
  if (!node?.assessment) notFound();
  const question = node.assessment.questions[0];

  async function action(formData: FormData) {
    "use server";
    await submitEssayAction(node!.assessment!.id, nodeId, String(formData.get("text") || ""));
  }

  return (
    <main className="px-4 py-4">
      <Link href="/learn" className="text-sm font-bold text-[var(--muted)]">
        ← Lộ trình
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold">{node.title}</h1>
      <p className="mt-2 text-[var(--muted)]">{question?.prompt}</p>
      <form action={action} className="mt-6 space-y-4">
        <textarea
          name="text"
          required
          rows={8}
          placeholder="Viết bài của bạn tại đây..."
          className="w-full rounded-[24px] border-2 border-[var(--line)] bg-white p-4 outline-none focus:border-[var(--brand)]"
        />
        <Button type="submit" fullWidth>
          Nộp bài tự luận
        </Button>
      </form>
    </main>
  );
}
