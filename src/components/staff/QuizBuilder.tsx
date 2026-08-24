"use client";

import { createQuizAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

type QType = "SINGLE" | "MULTI" | "FILL" | "ORDER";

type DraftQ = {
  key: string;
  type: QType;
  prompt: string;
  optionsText: string;
  correct: string[];
  fillAnswer: string;
  points: number;
};

const TYPE_LABELS: Record<QType, string> = {
  SINGLE: "Trắc nghiệm (1 đáp án)",
  MULTI: "Trắc nghiệm (nhiều đáp án)",
  FILL: "Điền khuyết",
  ORDER: "Xếp theo thứ tự",
};

const field = "w-full rounded-[14px] border-2 border-[var(--line)] px-3 py-2.5 outline-none focus:border-[var(--brand)]";
const label = "text-sm font-semibold";
const chip = "rounded-xl border-2 border-[#e5e5e5] bg-white px-3 py-1.5 text-sm font-extrabold hover:border-[var(--brand)]";
const chipActive = "rounded-xl border-2 border-[#58a700] bg-[var(--brand-soft)] px-3 py-1.5 text-sm font-extrabold";

function parseOptions(text: string): string[] {
  return text.split("|").map((s) => s.trim()).filter(Boolean);
}

function validateQuestion(q: DraftQ): string | null {
  if (!q.prompt.trim()) return "thiếu nội dung câu hỏi";
  if (q.type === "FILL") return q.fillAnswer.trim() ? null : "thiếu đáp án điền";
  const options = parseOptions(q.optionsText);
  if (options.length < 2 || new Set(options).size !== options.length) {
    return "cần ít nhất 2 lựa chọn khác nhau (cách nhau bằng |)";
  }
  if (q.type === "SINGLE") {
    return q.correct.length === 1 && options.includes(q.correct[0]) ? null : "chọn đúng 1 đáp án đúng";
  }
  if (q.type === "MULTI") {
    return q.correct.length > 0 && q.correct.every((c) => options.includes(c)) ? null : "chọn ít nhất 1 đáp án đúng";
  }
  const sorted = (a: string[]) => [...a].sort();
  return q.correct.length === options.length && JSON.stringify(sorted(q.correct)) === JSON.stringify(sorted(options))
    ? null
    : "bố trí đủ tất cả lựa chọn (bấm từng từ theo thứ tự)";
}

export function QuizBuilder({ units }: { units: { id: string; title: string; courseTitle: string }[] }) {
  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [passScore, setPassScore] = useState(70);
  const [errors, setErrors] = useState<string[]>([]);
  const keyRef = useRef(2);
  const [questions, setQuestions] = useState<DraftQ[]>([
    { key: "q1", type: "SINGLE", prompt: "", optionsText: "", correct: [], fillAnswer: "", points: 1 },
  ]);

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { key: `q${keyRef.current++}`, type: "SINGLE", prompt: "", optionsText: "", correct: [], fillAnswer: "", points: 1 },
    ]);
  }

  function updateQuestion(key: string, patch: Partial<DraftQ>) {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function removeQuestion(key: string) {
    setQuestions((prev) => prev.filter((q) => q.key !== key));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const errs: string[] = [];
    if (!unitId) errs.push("Chọn unit cho bài kiểm tra.");
    if (!title.trim()) errs.push("Nhập tiêu đề bài kiểm tra.");
    if (questions.length === 0) errs.push("Thêm ít nhất 1 câu hỏi.");
    questions.forEach((q, i) => {
      const problem = validateQuestion(q);
      if (problem) errs.push(`Câu ${i + 1}: ${problem}.`);
      if (!Number.isFinite(q.points) || q.points < 1 || q.points > 100) errs.push(`Câu ${i + 1}: điểm phải từ 1 đến 100.`);
    });
    if (errs.length > 0) {
      e.preventDefault();
      setErrors(errs);
      return;
    }
    setErrors([]);
  }

  const payload = questions.map((q) => ({
    type: q.type,
    prompt: q.prompt.trim(),
    options: q.type === "FILL" ? [] : parseOptions(q.optionsText),
    answer: q.type === "FILL" ? [q.fillAnswer.trim()] : q.correct,
    points: q.points,
  }));

  return (
    <form action={createQuizAction} onSubmit={handleSubmit} className="space-y-4">
      <select name="unitId" value={unitId} onChange={(e) => setUnitId(e.target.value)} required className={field}>
        <option value="">Chọn unit</option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.courseTitle} — {u.title}
          </option>
        ))}
      </select>
      <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề bài kiểm tra" required className={field} />
      <textarea name="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả bài (tùy chọn)" rows={2} className={field} />
      <div className="grid grid-cols-2 gap-2">
        <label className={label}>
          Điểm đỗ (%)
          <input name="passScore" type="number" min="0" max="100" value={passScore} onChange={(e) => setPassScore(Number(e.target.value))} className={`mt-1 ${field}`} />
        </label>
        <p className="self-center text-xs text-[var(--muted)]">Học viên đạt từ mức này sẽ được công nhận hoàn thành bài.</p>
      </div>

      {questions.map((q, i) => {
        const options = parseOptions(q.optionsText);
        return (
          <div key={q.key} className="space-y-3 rounded-2xl border-2 border-[var(--line)] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-lg bg-[var(--brand-soft)] px-2.5 py-1 text-xs font-extrabold text-[var(--brand-dark)]">Câu {i + 1}</span>
              <div className="flex items-center gap-2">
                <select value={q.type} onChange={(e) => updateQuestion(q.key, { type: e.target.value as QType, correct: [], fillAnswer: "" })} className="rounded-xl border-2 border-[var(--line)] px-2 py-1.5 text-sm font-bold outline-none">
                  {(Object.keys(TYPE_LABELS) as QType[]).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="ghost" onClick={() => removeQuestion(q.key)} aria-label={`Xóa câu ${i + 1}`}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <input value={q.prompt} onChange={(e) => updateQuestion(q.key, { prompt: e.target.value })} placeholder="Nội dung câu hỏi" className={field} />
            {q.type === "FILL" ? (
              <label className={label}>
                Đáp án đúng
                <input value={q.fillAnswer} onChange={(e) => updateQuestion(q.key, { fillAnswer: e.target.value })} placeholder="VD: 你好" className={`mt-1 ${field} hanzi`} />
              </label>
            ) : (
              <div className="space-y-2">
                <label className={label}>
                  Các lựa chọn (cách nhau bằng |)
                  <input value={q.optionsText} onChange={(e) => updateQuestion(q.key, { optionsText: e.target.value })} placeholder="VD: 你好 | 再见 | 谢谢" className={`mt-1 ${field}`} />
                </label>
                {q.type === "SINGLE" && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Đáp án đúng</p>
                    {options.map((o) => (
                      <label key={o} className="flex items-center gap-2 text-sm font-semibold">
                        <input type="radio" name={`correct-${q.key}`} checked={q.correct[0] === o} onChange={() => updateQuestion(q.key, { correct: [o] })} />
                        <span className="hanzi">{o}</span>
                      </label>
                    ))}
                    {q.correct[0] && !options.includes(q.correct[0]) && (
                      <p className="text-xs font-bold text-[#b45309]">Đáp án đã chọn không còn trong danh sách lựa chọn.</p>
                    )}
                  </div>
                )}
                {q.type === "MULTI" && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Đáp án đúng (có thể nhiều)</p>
                    {options.map((o) => (
                      <label key={o} className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={q.correct.includes(o)}
                          onChange={() =>
                            updateQuestion(q.key, {
                              correct: q.correct.includes(o) ? q.correct.filter((c) => c !== o) : [...q.correct, o],
                            })
                          }
                        />
                        <span className="hanzi">{o}</span>
                      </label>
                    ))}
                  </div>
                )}
                {q.type === "ORDER" && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Thứ tự đúng — bấm từng từ theo đúng trình tự</p>
                    <div className="min-h-10 rounded-xl border-2 border-dashed border-[var(--brand)] bg-[var(--brand-soft)] px-3 py-2 text-sm font-extrabold">
                      {q.correct.length > 0 ? q.correct.map((c, idx) => `${idx + 1}. ${c}`).join("    ") : "Chưa bố trí thứ tự"}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {options.filter((o) => !q.correct.includes(o)).map((o) => (
                        <button key={o} type="button" className={chip} onClick={() => updateQuestion(q.key, { correct: [...q.correct, o] })}>
                          <span className="hanzi">{o}</span>
                        </button>
                      ))}
                      {q.correct.map((c, idx) => (
                        <button key={c} type="button" className={chipActive} onClick={() => updateQuestion(q.key, { correct: q.correct.filter((x) => x !== c) })}>
                          {idx + 1}. <span className="hanzi">{c}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <label className={`${label} w-32`}>
              Điểm
              <input
                type="number"
                min="1"
                max="100"
                value={q.points}
                onChange={(e) => updateQuestion(q.key, { points: Number(e.target.value) })}
                className={`mt-1 ${field}`}
              />
            </label>
          </div>
        );
      })}

      <Button type="button" variant="secondary" onClick={addQuestion}>
        <Plus className="size-4" /> Thêm câu hỏi
      </Button>

      {errors.length > 0 && (
        <ul className="space-y-1 rounded-2xl border-2 border-[#ea2b2b]/40 bg-[#ffdfe0] p-3 text-sm font-semibold text-[#9a1f1f]">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <input type="hidden" name="questionsJson" value={JSON.stringify(payload)} />
      <Button type="submit" fullWidth>
        Tạo bài kiểm tra ({questions.length} câu)
      </Button>
    </form>
  );
}
