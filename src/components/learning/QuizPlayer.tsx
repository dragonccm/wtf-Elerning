"use client";

import { ChoiceCard } from "@/components/ui/ChoiceCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { submitQuizAction } from "@/lib/actions";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Check, Heart } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Q = {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  points: number;
};

export function QuizPlayer({
  assessmentId,
  nodeId,
  questions,
}: {
  assessmentId: string;
  nodeId: string;
  questions: Q[];
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [checked, setChecked] = useState(false);
  const [pending, start] = useTransition();
  const q = questions[index];
  const progress = ((index + 1) / questions.length) * 100;
  const current = answers[q.id];

  const canCheck = useMemo(() => {
    if (current == null) return false;
    if (Array.isArray(current)) return current.length > 0;
    return String(current).trim().length > 0;
  }, [current]);

  function setAnswer(value: unknown) {
    if (checked) return;
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  }

  function toggleMulti(option: string) {
    if (checked) return;
    const prev = Array.isArray(current) ? (current as string[]) : [];
    setAnswer(prev.includes(option) ? prev.filter((x) => x !== option) : [...prev, option]);
  }

  function toggleOrder(option: string) {
    if (checked) return;
    const prev = Array.isArray(current) ? (current as string[]) : [];
    if (prev.includes(option)) setAnswer(prev.filter((x) => x !== option));
    else setAnswer([...prev, option]);
  }

  function submitAll() {
    const payload = questions.map((question) => ({
      questionId: question.id,
      responseJson: JSON.stringify(answers[question.id] ?? ""),
    }));
    start(async () => {
      submitQuizAction(assessmentId, nodeId, JSON.stringify(payload));
    });
  }

  function goNext() {
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
      setChecked(false);
    } else {
      submitAll();
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-10 xl:px-12">
      <div className="flex items-center gap-4 py-4 lg:gap-6 lg:py-6">
        <Link
          href="/learn"
          aria-label="Thoát bài kiểm tra"
          className="flex size-11 items-center justify-center rounded-full text-3xl font-light text-[#afafaf] transition hover:bg-[#f7f7f7] hover:text-[#777] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#84d8ff]/50"
        >
          ×
        </Link>
        <ProgressBar value={progress} className="h-4 flex-1 lg:h-5" />
        <div className="flex items-center gap-1.5 text-base font-extrabold text-[#ff4b4b] lg:text-lg">
          <Heart className="size-5 fill-current lg:size-6" /> 5
        </div>
      </div>

      <div className="flex flex-1 flex-col py-5 lg:py-8">
        <span className="inline-flex w-fit rounded-lg bg-[#ce82ff]/15 px-2.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-[#ce82ff] lg:text-sm">
          Câu hỏi {index + 1}
        </span>
        <h2 className="mt-4 max-w-5xl text-3xl font-extrabold leading-tight text-[#3c3c3c] lg:text-4xl xl:text-[44px]">{q.prompt}</h2>

        {(q.type === "SINGLE" || q.type === "LISTEN" || q.type === "MATCH") && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-10 lg:gap-5">
            {q.type === "LISTEN" && (
              <div className="mb-2 flex justify-center sm:col-span-2">
                <Button type="button" variant="secondary" onClick={() => alert("🔊 nǐ hǎo (demo audio)")}>
                  Nghe lại
                </Button>
              </div>
            )}
            {q.options.map((opt, i) => (
              <ChoiceCard
                key={opt}
                label={opt}
                index={i + 1}
                selected={current === opt}
                correct={checked && current === opt}
                onClick={() => setAnswer(opt)}
                disabled={checked}
              />
            ))}
          </div>
        )}

        {q.type === "MULTI" && (
          <div className="mt-8 grid gap-4 lg:mt-10 lg:grid-cols-2 lg:gap-5">
            {q.options.map((opt, i) => (
              <ChoiceCard
                key={opt}
                label={opt}
                index={i + 1}
                selected={Array.isArray(current) && (current as string[]).includes(opt)}
                onClick={() => toggleMulti(opt)}
                disabled={checked}
              />
            ))}
          </div>
        )}

        {q.type === "FILL" && (
          <input
            className="mt-8 w-full rounded-2xl border-2 border-b-4 border-[#e5e5e5] px-4 py-4 text-lg font-semibold outline-none focus:border-[#84d8ff]"
            placeholder="Nhập đáp án..."
            disabled={checked}
            value={typeof current === "string" ? current : ""}
            onChange={(e) => setAnswer(e.target.value)}
          />
        )}

        {q.type === "ORDER" && (
          <div className="mt-8 space-y-4">
            <div className="min-h-16 rounded-2xl border-2 border-dashed border-[var(--brand)] bg-[var(--brand-soft)] p-3 text-lg font-extrabold">
              {(Array.isArray(current) ? (current as string[]) : []).join(" ") || "Chạm từ theo thứ tự đúng"}
            </div>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={checked}
                  onClick={() => toggleOrder(opt)}
                  className="rounded-2xl border-2 border-b-4 border-[#e5e5e5] bg-white px-4 py-2 font-extrabold"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className={cn(
          "sticky bottom-0 -mx-4 border-t-2 px-4 py-5 lg:-mx-8 lg:px-8",
          checked ? "border-[#58a700] bg-[#d7ffb8]" : "border-[#e5e5e5] bg-white",
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {checked ? (
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-full bg-white text-[var(--brand)]">
                <Check className="size-8" strokeWidth={3} />
              </div>
              <div>
                <p className="text-xl font-extrabold text-[#58a700]">Giỏi quá!</p>
                <p className="text-sm font-semibold text-[#58a700]/80">Tiếp tục chuỗi bài nhé</p>
              </div>
            </div>
          ) : (
            <div className="hidden text-sm font-bold text-[#afafaf] sm:block">Chọn đáp án rồi kiểm tra</div>
          )}
          <button
            type="button"
            disabled={(!canCheck && !checked) || pending}
            onClick={() => {
              if (!checked) setChecked(true);
              else goNext();
            }}
            className={cn(
              "h-14 min-w-[180px] rounded-2xl border-2 border-b-4 px-8 text-sm font-extrabold uppercase tracking-wide text-white transition active:translate-y-[2px] active:border-b-2 disabled:cursor-not-allowed disabled:border-[#e5e5e5] disabled:bg-[#e5e5e5] disabled:text-[#afafaf]",
              checked ? "border-[#58a700] bg-[#58cc02]" : "border-[var(--brand-dark)] bg-[var(--brand)]",
            )}
          >
            {checked ? (index < questions.length - 1 ? "Tiếp tục" : "Nộp bài") : "Kiểm tra"}
          </button>
        </div>
      </div>
    </div>
  );
}
