import { FlashcardSession } from "@/components/learning/FlashcardSession";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";
import { canAccessNode } from "@/lib/progress";
import Link from "next/link";

export default async function FlashcardsPage({ params }: { params: Promise<{ nodeId: string }> }) {
  const user = await requireUser();
  const { nodeId } = await params;
  if (!(await canAccessNode(user.id, nodeId))) notFound();
  const node = await prisma.lessonNode.findUnique({
    where: { id: nodeId },
    include: {
      flashcardDeck: {
        include: {
          cards: true,
        },
      },
    },
  });
  if (!node?.flashcardDeck) notFound();

  const cards = node.flashcardDeck.cards.map((c) => ({
    id: c.id,
    hanzi: c.hanzi,
    pinyin: c.pinyin,
    meaningVi: c.meaningVi,
    example: c.example,
  }));

  return (
    <main className="flashcard-stage grain min-h-screen overflow-hidden px-4 py-5 sm:px-6 sm:py-8">
      <div className="flashcard-header-enter relative z-10 mx-auto w-full max-w-3xl">
        <Link href="/learn" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-extrabold text-[var(--muted)] transition hover:bg-white hover:text-[var(--ink)]">
          <span aria-hidden>←</span> Lộ trình
        </Link>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--brand-dark)]">Bộ thẻ từ vựng</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{node.flashcardDeck.title}</h1>
          </div>
          <p className="max-w-xs text-sm font-semibold leading-relaxed text-[var(--muted)]">Ôn thẻ, sau đó vượt bài kiểm tra với ít nhất 80% câu đúng.</p>
        </div>
      </div>
      <div className="flashcard-session-enter relative z-10 mx-auto mt-7 w-full max-w-3xl">
        <FlashcardSession cards={cards} nodeId={nodeId} />
      </div>
    </main>
  );
}
