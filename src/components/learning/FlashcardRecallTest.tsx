"use client";

import { ChoiceCard } from "@/components/ui/ChoiceCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useMemo, useState } from "react";

type Card = {
  id: string;
  hanzi: string;
  meaningVi: string;
};

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildOptions(correct: string, allMeanings: string[]) {
  const distractors = shuffle(allMeanings.filter((m) => m !== correct)).slice(0, 3);
  return shuffle([correct, ...distractors]);
}

export type RecallResult = { flashcardId: string; correct: boolean };

export function FlashcardRecallTest({
  cards,
  onFinish,
}: {
  cards: Card[];
  onFinish: (results: RecallResult[]) => void;
}) {
  const order = useMemo(() => shuffle(cards.map((c) => c.id)), [cards]);
  const allMeanings = useMemo(() => cards.map((c) => c.meaningVi), [cards]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<RecallResult[]>([]);

  const card = cards.find((c) => c.id === order[index]);
  const options = useMemo(
    () => (card ? buildOptions(card.meaningVi, allMeanings) : []),
    [card, allMeanings],
  );

  if (!card) return null;

  const answered = selected !== null;
  const isCorrect = selected === card.meaningVi;

  function pick(option: string) {
    if (answered) return;
    setSelected(option);
    const correct = option === card!.meaningVi;
    const next = [...results, { flashcardId: card!.id, correct }];
    setResults(next);

    window.setTimeout(() => {
      if (index >= order.length - 1) {
        onFinish(next);
      } else {
        setIndex((i) => i + 1);
        setSelected(null);
      }
    }, 900);
  }

  return (
    <div>
      <ProgressBar value={((index + 1) / order.length) * 100} className="mb-4" tone="warning" />
      <p className="mb-4 text-center text-sm font-semibold text-[var(--muted)]">
        Kiểm tra {index + 1}/{order.length} · Chọn đúng nghĩa tiếng Việt
      </p>

      <div className="mx-auto max-w-md rounded-[28px] border-2 border-[var(--line)] bg-white px-6 py-10 text-center shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">Chữ Hán</p>
        <p className="hanzi mt-3 text-6xl font-extrabold text-[#3c3c3c]">{card.hanzi}</p>
      </div>

      <div className="mx-auto mt-6 grid max-w-md gap-3 sm:grid-cols-2">
        {options.map((option, i) => (
          <ChoiceCard
            key={option}
            label={option}
            index={i + 1}
            selected={selected === option}
            correct={answered && option === card.meaningVi}
            wrong={answered && selected === option && option !== card.meaningVi}
            disabled={answered}
            onClick={() => pick(option)}
          />
        ))}
      </div>

      {answered && (
        <p
          className={`mt-4 text-center text-sm font-extrabold ${isCorrect ? "text-[var(--brand-dark)]" : "text-[#ea2b2b]"}`}
        >
          {isCorrect ? "Giỏi quá!" : `Đáp án đúng: ${card.meaningVi}`}
        </p>
      )}
    </div>
  );
}
