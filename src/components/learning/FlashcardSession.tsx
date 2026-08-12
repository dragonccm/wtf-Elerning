"use client";

import { FlashcardFlip } from "@/components/learning/FlashcardFlip";
import { FlashcardRecallTest, type RecallResult } from "@/components/learning/FlashcardRecallTest";
import { completeFlashcardTestAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LessonActor } from "@/components/learning/LessonActor";
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
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
    <section aria-label="Phiên ôn flashcard" className="flashcard-session-shell rounded-[32px] border border-white/80 bg-white/70 p-4 shadow-[0_24px_80px_rgba(31,65,53,0.12)] backdrop-blur-sm sm:p-7">
      <LessonActor
        className="mb-4 sm:-mb-6 sm:-mr-2 sm:ml-auto"
        message="Nhìn chữ, đoán nghĩa trong đầu rồi mới lật thẻ nhé!"
      />
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--brand-dark)]"><Sparkles className="size-4"/>Đang ôn</div>
          <p className="text-sm font-extrabold text-[var(--muted)]"><span className="text-[var(--ink)]">{index + 1}</span> / {cards.length}</p>
        </div>
        <ProgressBar value={((index + 1) / cards.length) * 100} className="mt-3 h-3" />
        <p className="mb-5 mt-4 text-center text-sm font-semibold text-[var(--muted)]">Đoán nghĩa trước, rồi chạm vào thẻ để lật</p>
      </div>
      <div key={card.id} className="flashcard-swap"><FlashcardFlip {...card} /></div>
      <div className="flashcard-controls mx-auto mt-7 grid max-w-xl grid-cols-[auto_1fr] gap-3 sm:grid-cols-2">
        <Button
          variant="secondary"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Thẻ trước</span>
        </Button>
        {index < cards.length - 1 ? (
          <Button onClick={() => setIndex((i) => i + 1)}>
            Thẻ tiếp <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={() => setPhase("test")}>
            Kiểm tra thuộc bài
          </Button>
        )}
      </div>
    </section>
  );
}
