import { FlashcardSession } from "@/components/learning/FlashcardSession";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function FlashcardsPage({ params }: { params: Promise<{ nodeId: string }> }) {
  const user = await requireUser();
  const { nodeId } = await params;
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
    <main className="px-4 py-4">
      <Link href="/learn" className="text-sm font-bold text-[var(--muted)]">
        ← Lộ trình
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold">{node.flashcardDeck.title}</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">Ôn thẻ → Kiểm tra trắc nghiệm · cần 80% đúng để qua</p>
      <div className="mt-6">
        <FlashcardSession cards={cards} nodeId={nodeId} />
      </div>
    </main>
  );
}
