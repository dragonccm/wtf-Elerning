"use client";

import { finishDrillAction } from "@/lib/actions";
import { ChoiceCard } from "@/components/ui/ChoiceCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";
import { useTransition, useMemo, useState } from "react";

type Card = {
  id: string;
  hanzi: string;
  pinyin: string;
  meaningVi: string;
  example: string | null;
  deckTitle: string;
};

type DrillResult = { flashcardId: string; correct: boolean };

/** Max attempts per card inside one session — after that the card is dropped (due in 10 min). */
const MAX_TRIES = 3;
const FEEDBACK_MS = 900;

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic shuffle. The initial queue and option order must be identical
 * on server and client (hydration), so Math.random cannot be used there. The
 * seed is stable within a day, so the order still varies between visits.
 */
function seededShuffle<T>(items: T[], seed: number) {
  const copy = [...items];
  const rand = mulberry32(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function DrillSession({ cards, distractorPool }: { cards: Card[]; distractorPool: string[] }) {
  // Order is a deterministic function of the card ids + the day, so the server
  // and client agree during hydration (no Math.random in render paths).
  const daySeed = hashSeed(new Date().toDateString());
  const [queue, setQueue] = useState<Card[]>(() =>
    seededShuffle(cards, hashSeed(cards.map((c) => c.id).join("|") + daySeed))
  );
  const [tries, setTries] = useState<Record<string, number>>({});
  const [results, setResults] = useState<DrillResult[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState<DrillResult[] | null>(null);
  const [pending, start] = useTransition();

  const card = queue[0];
  const options = useMemo(() => {
    if (!card) return [];
    // Distractors come from the full deck pool (not just the session queue) so
    // every question keeps 4 choices even when few cards are due.
    const fallback = cards.map((c) => c.meaningVi).filter((m) => m !== card.meaningVi);
    const source = distractorPool.length >= 3 ? distractorPool : fallback;
    const pool = source.filter((m) => m !== card.meaningVi);
    const distractors = seededShuffle(pool, hashSeed(card.id + pool.join("|") + daySeed)).slice(0, 3);
    return seededShuffle([card.meaningVi, ...distractors], hashSeed(card.id + distractors.join("|") + daySeed));
  }, [card, cards, distractorPool, daySeed]);

  if (!card && !finished) return null;

  const correctCount = results.filter((r) => r.correct).length;

  function submitResults(resultsToSubmit: DrillResult[]) {
    start(async () => {
      await finishDrillAction(JSON.stringify(resultsToSubmit));
    });
  }

  function pick(option: string) {
    if (selected !== null || !card) return;
    const correct = option === card.meaningVi;
    setSelected(option);
    const attempts = (tries[card.id] ?? 0) + 1;

    const nextResults = [...results];
    const nextQueue = queue.slice(1);
    let nextTries = tries;
    let done = false;

    if (correct || attempts >= MAX_TRIES) {
      nextResults.push({ flashcardId: card.id, correct });
      if (nextQueue.length === 0) done = true;
    } else {
      nextTries = { ...tries, [card.id]: attempts };
      nextQueue.push(card); // wrong card re-appears later in the session
    }

    window.setTimeout(() => {
      setResults(nextResults);
      setQueue(nextQueue);
      setTries(nextTries);
      setSelected(null);
      if (done) setFinished(nextResults);
    }, FEEDBACK_MS);
  }

  if (finished) {
    const good = finished.filter((r) => r.correct).length;
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-[28px] border-2 border-[#58a700] bg-[#d7ffb8] px-6 py-10 text-center">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#58a700]">Luyện xong!</p>
          <p className="mt-3 text-5xl font-extrabold text-[#3c3c3c]">
            {good}/{finished.length}
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
            {good === finished.length
              ? "Tuyệt vời — thẻ đã được xếp lịch ôn theo SRS."
              : "Thẻ sai sẽ quay lại sau 10 phút để bạn ôn tiếp."}
          </p>
        </div>
        <button
          onClick={() => submitResults(finished)}
          disabled={pending}
          className="mt-6 w-full rounded-2xl border-2 border-b-4 border-[#58a700] bg-[var(--brand)] px-6 py-4 text-lg font-extrabold text-white transition-all hover:brightness-105 active:translate-y-[2px] active:border-b-2 disabled:opacity-60"
        >
          {pending ? "Đang lưu…" : "Hoàn thành · Về trang học"}
        </button>
      </div>
    );
  }

  const answered = results.length;
  const attempts = tries[card.id] ?? 0;

  return (
    <div>
      <ProgressBar value={(answered / cards.length) * 100} className="mb-4" tone="warning" />
      <div className="mb-4 flex items-center justify-between text-sm font-semibold text-[var(--muted)]">
        <p>
          Thẻ {answered + 1}/{cards.length} · {card.deckTitle}
        </p>
        <p className="tabular-nums">Đúng {correctCount}</p>
      </div>

      <div className="mx-auto max-w-md rounded-[28px] border-2 border-[var(--line)] bg-white px-6 py-10 text-center shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">Chữ Hán</p>
        <p className="hanzi mt-3 text-6xl font-extrabold text-[#3c3c3c]">{card.hanzi}</p>
        <p className="mt-3 text-lg font-bold text-[var(--muted)]">{card.pinyin}</p>
      </div>

      <div className="mx-auto mt-6 grid max-w-md gap-3 sm:grid-cols-2">
        {options.map((option, i) => (
          <ChoiceCard
            key={option}
            label={option}
            index={i + 1}
            selected={selected === option}
            correct={selected !== null && option === card.meaningVi}
            wrong={selected === option && option !== card.meaningVi}
            disabled={selected !== null}
            onClick={() => pick(option)}
          />
        ))}
      </div>

      {selected !== null && (
        <p
          className={cn(
            "mt-4 text-center text-sm font-extrabold",
            selected === card.meaningVi ? "text-[var(--brand-dark)]" : "text-[#ea2b2b]",
          )}
        >
          {selected === card.meaningVi
            ? "Giỏi quá!"
            : `Đáp án đúng: ${card.meaningVi} · sẽ gặp lại thẻ này (lần ${Math.min(attempts + 1, MAX_TRIES)}/${MAX_TRIES})`}
        </p>
      )}
    </div>
  );
}
