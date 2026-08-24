"use client";

import { gradeEssayAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type RubricDef = { name: string; maxPoints: number };

type ExistingGrade = {
  score: number;
  comment: string;
  marks: { type: string; excerpt: string; suggestion: string }[];
  rubric: { name: string; maxPoints: number; points: number }[] | null;
} | null;

type ErrorMarkRow = { key: string; type: string; excerpt: string; suggestion: string };

const ERROR_TYPES: [string, string][] = [
  ["VOCAB", "Sai từ vựng"],
  ["GRAMMAR", "Sai ngữ pháp"],
  ["STRUCTURE", "Sai cấu trúc câu"],
  ["PINYIN", "Sai Pinyin"],
  ["EXPRESSION", "Sai diễn đạt"],
];

const field = "w-full rounded-xl border-2 border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--brand)]";

export function GradeForm({
  submissionId,
  maxScore,
  rubric,
  existing,
}: {
  submissionId: string;
  maxScore: number;
  rubric: RubricDef[] | null;
  existing: ExistingGrade;
}) {
  const hasRubric = rubric !== null && rubric.length > 0;
  const [score, setScore] = useState(existing?.score ?? Math.min(8, maxScore));
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [marks, setMarks] = useState<ErrorMarkRow[]>(
    (existing?.marks ?? []).map((m, i) => ({ key: `m${i}`, type: m.type, excerpt: m.excerpt, suggestion: m.suggestion }))
  );
  const [rubricPoints, setRubricPoints] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    if (hasRubric) {
      rubric!.forEach((c, i) => {
        init[c.name] = existing?.rubric?.[i]?.points ?? 0;
      });
    }
    return init;
  });
  const [errors, setErrors] = useState<string[]>([]);

  const rubricTotal = hasRubric ? rubric!.reduce((s, c) => s + (rubricPoints[c.name] ?? 0), 0) : 0;
  const effectiveScore = hasRubric ? Math.round(rubricTotal * 2) / 2 : score;

  function addMark() {
    setMarks((prev) => [...prev, { key: `m${Date.now()}`, type: "GRAMMAR", excerpt: "", suggestion: "" }]);
  }

  function updateMark(key: string, patch: Partial<ErrorMarkRow>) {
    setMarks((prev) => prev.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const errs: string[] = [];
    if (!comment.trim()) errs.push("Nhập nhận xét cho học viên.");
    if (hasRubric) {
      for (const c of rubric!) {
        const v = rubricPoints[c.name];
        if (v === undefined || !Number.isFinite(v) || v < 0 || v > c.maxPoints) {
          errs.push(`Tiêu chí "${c.name}": điểm phải từ 0 đến ${c.maxPoints}.`);
        }
      }
      if (rubricTotal > maxScore) errs.push("Tổng điểm rubric vượt quá thang điểm bài.");
    } else if (!Number.isFinite(score) || score < 0 || score > maxScore) {
      errs.push(`Điểm phải từ 0 đến ${maxScore}.`);
    }
    if (errs.length > 0) {
      e.preventDefault();
      setErrors(errs);
      return;
    }
    setErrors([]);
  }

  const activeMarks = marks.filter((m) => m.excerpt.trim() || m.suggestion.trim());

  return (
    <form action={gradeEssayAction} onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="score" value={effectiveScore} />

      <label className="text-sm font-semibold">
        {hasRubric ? "Điểm (tổng rubric)" : "Điểm"}
        {hasRubric ? (
          <span className="mt-1 block rounded-xl border-2 border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-extrabold">
            {effectiveScore}/{maxScore}
          </span>
        ) : (
          <input name="scoreDirect" type="number" min={0} max={maxScore} step="0.5" value={score} onChange={(e) => setScore(Number(e.target.value))} required className={`mt-1 ${field}`} />
        )}
        <span className="mt-1 block text-xs text-[var(--muted)]">Tối đa {maxScore} điểm</span>
      </label>

      {hasRubric && (
        <div className="rounded-xl border border-[var(--line)] p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Chấm theo tiêu chí</p>
          <div className="mt-2 space-y-1.5">
            {rubric!.map((c) => (
              <label key={c.name} className="flex items-center justify-between gap-2 text-sm font-semibold">
                <span>
                  {c.name} <span className="text-xs text-[var(--muted)]">/ {c.maxPoints}</span>
                </span>
                <input
                  type="number"
                  min={0}
                  max={c.maxPoints}
                  step="0.5"
                  value={rubricPoints[c.name] ?? 0}
                  onChange={(e) => setRubricPoints((prev) => ({ ...prev, [c.name]: Number(e.target.value) }))}
                  className={`${field} w-24`}
                  aria-label={`Điểm ${c.name}`}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <label className="text-sm font-semibold md:col-span-2">
        Nhận xét
        <textarea name="comment" required rows={2} value={comment} onChange={(e) => setComment(e.target.value)} className={`mt-1 ${field}`} />
      </label>

      <div className="md:col-span-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Đánh dấu lỗi sai</p>
          <Button type="button" variant="ghost" onClick={addMark} aria-label="Thêm lỗi sai">
            <Plus className="size-4" /> Thêm lỗi
          </Button>
        </div>
        {marks.length > 0 && (
          <div className="mt-2 space-y-2">
            {marks.map((m) => (
              <div key={m.key} className="flex flex-wrap items-center gap-2">
                <select value={m.type} onChange={(e) => updateMark(m.key, { type: e.target.value })} className={`${field} w-44`} aria-label="Loại lỗi">
                  {ERROR_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input value={m.excerpt} onChange={(e) => updateMark(m.key, { excerpt: e.target.value })} placeholder="Đoạn lỗi" className={field} />
                <input value={m.suggestion} onChange={(e) => updateMark(m.key, { suggestion: e.target.value })} placeholder="Gợi ý sửa" className={field} />
                <Button type="button" variant="ghost" onClick={() => setMarks((prev) => prev.filter((x) => x.key !== m.key))} aria-label="Xóa lỗi">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {marks.length === 0 && <p className="mt-2 text-xs text-[var(--muted)]">Chưa có lỗi được đánh dấu (tùy chọn).</p>}
      </div>

      {errors.length > 0 && (
        <ul className="space-y-1 rounded-xl border-2 border-[#ea2b2b]/40 bg-[#ffdfe0] p-3 text-sm font-semibold text-[#9a1f1f] md:col-span-2">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <input
        type="hidden"
        name="marksJson"
        value={JSON.stringify(activeMarks.map((m) => ({ type: m.type, excerpt: m.excerpt.trim(), suggestion: m.suggestion.trim() })))}
      />
      <input
        type="hidden"
        name="rubricScores"
        value={JSON.stringify(
          hasRubric ? rubric!.map((c) => ({ name: c.name, maxPoints: c.maxPoints, points: rubricPoints[c.name] ?? 0 })) : []
        )}
      />

      <div className="md:col-span-2">
        <Button type="submit">
          {existing ? "Cập nhật điểm & nhận xét" : "Lưu điểm & nhận xét"}
        </Button>
      </div>
    </form>
  );
}
