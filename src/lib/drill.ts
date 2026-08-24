import { prisma } from "@/lib/db";

/**
 * Leitner-style SRS for flashcard drills.
 * Stage 0 = new/lapsed (next review in SRS_LAPSE_MINUTES after a miss).
 * Stages 1..4 = learned boxes; a correct answer moves up one stage, a wrong
 * answer drops to stage 0. SRS_INTERVAL_DAYS is indexed by (stage - 1).
 */
export const SRS_INTERVAL_DAYS = [1, 3, 7, 14] as const;
export const SRS_MAX_STAGE = 4;
export const SRS_LAPSE_MINUTES = 10;

export type DueCard = {
  id: string;
  hanzi: string;
  pinyin: string;
  meaningVi: string;
  example: string | null;
  deckTitle: string;
};

/** Flashcard decks the user can see: PUBLISHED nodes in PUBLISHED courses of the user's classrooms. */
async function getAccessibleDecks(userId: string) {
  const memberships = await prisma.classroomMember.findMany({
    where: { userId },
    select: { classroomId: true },
  });
  const classIds = memberships.map((m) => m.classroomId);
  if (classIds.length === 0) return [];

  return prisma.flashcardDeck.findMany({
    where: {
      node: {
        status: "PUBLISHED",
        unit: { course: { published: true, classrooms: { some: { id: { in: classIds } } } } },
      },
    },
    include: { cards: true },
  });
}

/**
 * Cards due for a quick drill session: from decks whose node is PUBLISHED in a
 * PUBLISHED course the user is a classroom member of. A card is due when it has
 * no mark yet (new) or its SRS dueAt has passed.
 */
export async function getDueCards(userId: string, limit = 20): Promise<DueCard[]> {
  const decks = await getAccessibleDecks(userId);

  const pool = decks.flatMap((d) => d.cards.map((c) => ({ card: c, deckTitle: d.title })));
  if (pool.length === 0) return [];

  const marks = await prisma.flashcardMark.findMany({
    where: { userId, flashcardId: { in: pool.map((p) => p.card.id) } },
  });
  const markByCard = new Map(marks.map((m) => [m.flashcardId, m]));
  const now = Date.now();

  return pool
    .filter(({ card }) => {
      const mark = markByCard.get(card.id);
      return !mark || (mark.dueAt !== null && mark.dueAt.getTime() <= now);
    })
    .slice(0, limit)
    .map(({ card, deckTitle }) => ({
      id: card.id,
      hanzi: card.hanzi,
      pinyin: card.pinyin,
      meaningVi: card.meaningVi,
      example: card.example,
      deckTitle,
    }));
}

/** Number of cards currently due (dashboard badge). */
export async function countDueCards(userId: string): Promise<number> {
  const cards = await getDueCards(userId, Number.MAX_SAFE_INTEGER);
  return cards.length;
}

/**
 * Distinct card meanings across all accessible decks — the distractor pool for
 * drills, so a session keeps 4 answer choices even when few cards are due.
 */
export async function getDistractorPool(userId: string, limit = 50): Promise<string[]> {
  const decks = await getAccessibleDecks(userId);
  const meanings = decks.flatMap((d) => d.cards.map((c) => c.meaningVi));
  return [...new Set(meanings)].slice(0, limit);
}
