"use client";

import { closeQuickQuestionAction, createQuickQuestionAction, respondQuickQuestionAction } from "@/lib/live-actions";
import { cn, formatDateTime } from "@/lib/utils";
import { Check, Send } from "lucide-react";
import { useEffect, useState } from "react";

type Tally = { option: string; count: number; percent: number };

type QView = {
  id: string;
  prompt: string;
  mode: "CHOICE" | "FREE";
  options: string[];
  correctOption: string | null;
  status: "OPEN" | "CLOSED";
  tallies: Tally[];
  totalResponses: number;
  myAnswer: string | null;
  createdAt: string;
  closedAt: string | null;
};

type LiveData = {
  ok: true;
  memberCount: number;
  open: QView | null;
  recent: QView[];
};

const POLL_MS = 3000;

export function LiveRoom({ classroomId, role }: { classroomId: string; role: "teacher" | "student" }) {
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch(`/api/live/${classroomId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as LiveData;
      if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Không tải được dữ liệu lớp trực tiếp.");
      }
    }
    void tick();
    const timer = setInterval(() => {
      void tick();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [classroomId]);

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl bg-[#fde8e8] p-4 text-sm font-bold text-[#ba1a1a]">{error}</div>
      ) : null}

      {data?.open ? (
        <QuestionCard q={data.open} role={role} classroomId={classroomId} />
      ) : (
        <div className="rounded-2xl bg-[var(--md-surface-container)] p-5 text-sm font-semibold text-[var(--md-on-surface-variant)]">
          Chưa có câu hỏi nào đang mở.
          {role === "student" ? " Trang này tự cập nhật — hãy ở lại đây." : ""}
        </div>
      )}

      {role === "teacher" && !error ? (
        <CreateQuestionForm classroomId={classroomId} />
      ) : null}

      {data && data.recent.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--md-on-surface-variant)]">
            Câu hỏi gần đây
          </p>
          <div className="space-y-4">
            {data.recent.map((q) => (
              <QuestionCard key={q.id} q={q} role={role} classroomId={classroomId} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function QuestionCard({
  q,
  role,
  classroomId,
}: {
  q: QView;
  role: "teacher" | "student";
  classroomId: string;
}) {
  return (
    <article className="md-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={cn("md-chip", q.status === "OPEN" && "bg-[var(--md-primary)] text-[var(--md-on-primary)]")}>
          {q.status === "OPEN" ? "ĐANG MỞ" : "ĐÃ KẾT THÚC"}
        </span>
        <span className="text-xs font-bold text-[var(--md-on-surface-variant)]">
          {q.totalResponses} lượt trả lời
          {q.closedAt ? ` · ${formatDateTime(q.closedAt, false)}` : ` · ${formatDateTime(q.createdAt, false)}`}
        </span>
      </div>
      <h3 className="mt-2 text-lg font-extrabold leading-snug">{q.prompt}</h3>

      {q.tallies.length > 0 ? <Tallies q={q} /> : <p className="mt-3 text-sm text-[var(--md-on-surface-variant)]">Chưa có lượt trả lời nào.</p>}

      {q.status === "CLOSED" && q.correctOption ? (
        <p className="mt-3 text-sm font-extrabold text-[var(--md-primary)]">
          Đáp án đúng: {q.correctOption}
        </p>
      ) : null}

      {q.status === "OPEN" && role === "teacher" ? (
        <form action={closeQuickQuestionAction} className="mt-4">
          <input type="hidden" name="classroomId" value={classroomId} />
          <button type="submit" className="md-button outlined">
            Đóng câu hỏi
          </button>
        </form>
      ) : null}

      {q.status === "OPEN" && role === "student" ? (
        <StudentAnswer q={q} classroomId={classroomId} />
      ) : null}
    </article>
  );
}

function Tallies({ q }: { q: QView }) {
  return (
    <ul className="mt-3 space-y-2">
      {q.tallies.map((t) => {
        const isCorrect = q.status === "CLOSED" && q.correctOption !== null && q.correctOption === t.option;
        return (
          <li key={t.option}>
            <div className="flex items-center justify-between gap-2 text-sm font-bold">
              <span className="flex min-w-0 items-center gap-1.5">
                {isCorrect ? <Check className="size-4 shrink-0 text-[var(--md-primary)]" strokeWidth={3} /> : null}
                <span className="truncate">{t.option}</span>
                {q.myAnswer === t.option ? (
                  <span className="shrink-0 rounded-full bg-[var(--md-primary-container)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--md-on-primary-container)]">
                    BẠN
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs text-[var(--md-on-surface-variant)]">
                {t.count} · {t.percent}%
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--md-surface-container-high)]">
              <div
                className={cn("h-full rounded-full transition-all duration-500", isCorrect ? "bg-[var(--md-primary)]" : "bg-[var(--md-outline)]")}
                style={{ width: `${t.percent}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StudentAnswer({ q, classroomId }: { q: QView; classroomId: string }) {
  if (q.myAnswer) {
    return (
      <div className="mt-4 rounded-xl bg-[var(--md-primary-container)] p-3 text-sm font-extrabold text-[var(--md-on-primary-container)]">
        Đã trả lời: {q.myAnswer}
      </div>
    );
  }
  if (q.mode === "CHOICE") {
    return (
      <form action={respondQuickQuestionAction} className="mt-4 grid gap-2">
        <input type="hidden" name="classroomId" value={classroomId} />
        <input type="hidden" name="questionId" value={q.id} />
        {q.options.map((o) => (
          <button
            key={o}
            type="submit"
            name="answer"
            value={o}
            className="rounded-xl border-2 border-[var(--md-outline-variant)] bg-white px-4 py-2.5 text-left text-sm font-bold transition hover:border-[var(--md-primary)] hover:bg-white"
          >
            {o}
          </button>
        ))}
      </form>
    );
  }
  return (
    <form action={respondQuickQuestionAction} className="mt-4 space-y-2">
      <input type="hidden" name="classroomId" value={classroomId} />
      <input type="hidden" name="questionId" value={q.id} />
      <textarea
        name="answer"
        required
        maxLength={500}
        rows={2}
        placeholder="Câu trả lời của bạn..."
        className="w-full rounded-2xl border-2 border-[var(--md-outline-variant)] bg-white p-3 text-sm font-semibold outline-none focus:border-[var(--md-primary)]"
      />
      <button type="submit" className="md-button">
        <Send className="size-4" /> Gửi trả lời
      </button>
    </form>
  );
}

function CreateQuestionForm({ classroomId }: { classroomId: string }) {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"choice" | "free">("choice");
  const [opts, setOpts] = useState<string[]>(["", "", "", ""]);
  const [correct, setCorrect] = useState("");
  const filled = opts.filter((o) => o.trim().length > 0);

  return (
    <form action={createQuickQuestionAction} className="rounded-2xl bg-[var(--md-surface-container)] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--md-primary)]">HỎI NHANH</p>
      <h4 className="mt-1 text-lg font-extrabold">Đưa câu hỏi lên lớp</h4>
      <p className="mt-1 text-xs text-[var(--md-on-surface-variant)]">
        Câu hỏi hiện tại (nếu có) sẽ tự động đóng khi bạn đưa câu hỏi mới lên.
      </p>
      <input type="hidden" name="classroomId" value={classroomId} />
      <input type="hidden" name="mode" value={mode} />
      <textarea
        name="prompt"
        required
        maxLength={500}
        rows={2}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="VD: Từ 学生 có nghĩa là gì?"
        className="mt-3 w-full rounded-2xl border-2 border-[var(--md-outline-variant)] bg-white p-3 text-sm font-semibold outline-none focus:border-[var(--md-primary)]"
      />
      <div className="mt-3 flex flex-wrap gap-4 text-sm font-bold">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="modeRadio"
            checked={mode === "choice"}
            onChange={() => {
              setMode("choice");
              setCorrect("");
            }}
          />
          Trắc nghiệm
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="modeRadio"
            checked={mode === "free"}
            onChange={() => {
              setMode("free");
              setCorrect("");
            }}
          />
          Trả lời tự do
        </label>
      </div>
      {mode === "choice" ? (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {opts.map((o, i) => (
              <input
                key={i}
                name={`option${i + 1}`}
                value={o}
                onChange={(e) => {
                  const next = [...opts];
                  next[i] = e.target.value;
                  setOpts(next);
                }}
                maxLength={100}
                placeholder={`Lựa chọn ${i + 1}${i < 2 ? "" : " (tùy chọn)"}`}
                className="rounded-xl border-2 border-[var(--md-outline-variant)] bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[var(--md-primary)]"
              />
            ))}
          </div>
          {filled.length >= 2 ? (
            <select
              name="correctOption"
              value={correct}
              onChange={(e) => setCorrect(e.target.value)}
              className="mt-3 w-full rounded-xl border-2 border-[var(--md-outline-variant)] bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[var(--md-primary)] sm:w-auto"
            >
              <option value="">Không đánh dấu đáp án đúng</option>
              {filled.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : null}
        </>
      ) : null}
      <button type="submit" className="md-button mt-4">
        <Send className="size-4" /> Đưa lên lớp
      </button>
    </form>
  );
}
