"use client";

import { FlashcardFlip } from "@/components/learning/FlashcardFlip";
import { FlashcardRecallTest, type RecallResult } from "@/components/learning/FlashcardRecallTest";
import { completeFlashcardTestAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { useState, useTransition } from "react";

type Card = {
  id: string;
  hanzi: string;
  pinyin: string;
  meaningVi: string;
  example?: string | null;
};

type Phase = "study" | "test" | "result";

const PASS_RATE = 0.8;

export function FlashcardSession({ cards, nodeId }: { cards: Card[]; nodeId: string }) {
  const [phase, setPhase] = useState<Phase>("study");
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<RecallResult[]>([]);
  const [pending, start] = useTransition();

  const card = cards[index];
  if (!card) return <p>Không có thẻ.</p>;

  const correctCount = results.filter((r) => r.correct).length;
  const passScore = Math.ceil(cards.length * PASS_RATE);
  const passed = correctCount >= passScore;

  if (phase === "test") {
    return (
      <FlashcardRecallTest
        cards={cards}
        onFinish={(next) => {
          setResults(next);
          setPhase("result");
        }}
      />
    );
  }

  if (phase === "result") {
    return (
      <div className="mx-auto max-w-md text-center">
        <div
          className={`rounded-[28px] border-2 p-8 ${
            passed ? "border-[var(--brand-dark)] bg-[var(--brand-soft)]" : "border-[#ea2b2b] bg-[#ffdfe0]"
          }`}
        >
          {passed ? (
            <CheckCircle2 className="mx-auto size-14 text-[var(--brand-dark)]" />
          ) : (
            <RotateCcw className="mx-auto size-14 text-[#ea2b2b]" />
          )}
          <h2 className="mt-4 text-2xl font-extrabold text-[#3c3c3c]">
            {passed ? "Đã thuộc bài!" : "Cần ôn thêm"}
          </h2>
          <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
            {correctCount}/{cards.length} câu đúng · Cần {passScore} câu để qua
          </p>
          <ProgressBar
            value={(correctCount / cards.length) * 100}
            className="mt-4 h-3"
            tone={passed ? "success" : "danger"}
          />
        </div>

        <div className="mt-6 grid gap-3">
          {passed ? (
            <Button
              fullWidth
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await completeFlashcardTestAction(nodeId, JSON.stringify(results));
                })
              }
            >
              Hoàn thành · Quay lại lộ trình
            </Button>
          ) : (
            <>
              <Button fullWidth onClick={() => setPhase("study")}>
                Ôn lại bộ thẻ
              </Button>
              <Button variant="secondary" fullWidth onClick={() => setPhase("test")}>
                Thử kiểm tra lại
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <ProgressBar value={((index + 1) / cards.length) * 100} className="mb-4" />
      <p className="mb-4 text-center text-sm font-semibold text-[var(--muted)]">
        Ôn thẻ {index + 1}/{cards.length} · Nhớ nghĩa trước khi lật
      </p>
      <FlashcardFlip {...card} />
      <div className="mt-6 flex gap-3">
        <Button
          variant="secondary"
          fullWidth
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Trước
        </Button>
        {index < cards.length - 1 ? (
          <Button fullWidth onClick={() => setIndex((i) => i + 1)}>
            Thẻ tiếp
          </Button>
        ) : (
          <Button fullWidth onClick={() => setPhase("test")}>
            Kiểm tra thuộc bài
          </Button>
        )}
      </div>
    </div>
  );
}
