"use client";

import { createEssayAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type RubricRow = { key: string; name: string; points: number };

const field = "w-full rounded-[14px] border-2 border-[var(--line)] px-3 py-2.5 outline-none focus:border-[var(--brand)]";

export function EssayBuilder({ units }: { units: { id: string; title: string; courseTitle: string }[] }) {
  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [maxScore, setMaxScore] = useState(10);
  const [rubric, setRubric] = useState<RubricRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  function addRow() {
    setRubric((prev) => [...prev, { key: `r${prev.length + 1}-${Date.now()}`, name: "", points: 2 }]);
  }

  function updateRow(key: string, patch: Partial<RubricRow>) {
    setRubric((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRubric((prev) => prev.filter((r) => r.key !== key));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const errs: string[] = [];
    if (!unitId) errs.push("Chọn unit.");
    if (!title.trim()) errs.push("Nhập tiêu đề bài tự luận.");
    if (!prompt.trim()) errs.push("Nhập đề bài.");
    if (!Number.isFinite(maxScore) || maxScore <= 0) errs.push("Thang điểm phải lớn hơn 0.");
    if (rubric.length > 0) {
      const total = rubric.reduce((s, r) => s + (Number.isFinite(r.points) ? r.points : 0), 0);
      rubric.forEach((r, i) => {
        if (!r.name.trim()) errs.push(`Tiêu chí rubric ${i + 1}: nhập tên tiêu chí.`);
      });
      if (total > 0 && total !== maxScore) {
        errs.push(`Tổng điểm rubric (${total}) phải bằng thang điểm bài (${maxScore}).`);
      }
    }
    if (errs.length > 0) {
      e.preventDefault();
      setErrors(errs);
      return;
    }
    setErrors([]);
  }

  return (
    <form action={createEssayAction} onSubmit={handleSubmit} className="space-y-3">
      <select name="unitId" value={unitId} onChange={(e) => setUnitId(e.target.value)} required className={field}>
        <option value="">Chọn unit</option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.courseTitle} — {u.title}
          </option>
        ))}
      </select>
      <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề bài" required className={field} />
      <textarea name="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Đề bài tự luận" required rows={3} className={field} />
      <input name="maxScore" type="number" min="1" max="100" value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value))} className={field} />
      <div className="rounded-2xl border border-[var(--line)] p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Rubric chấm theo tiêu chí (tùy chọn)</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Tổng điểm rubric = thang điểm bài. Để trống nếu chấm tự do.</p>
          </div>
          <Button type="button" variant="secondary" onClick={addRow}>
            <Plus className="size-4" /> Tiêu chí
          </Button>
        </div>
        {rubric.length > 0 && (
          <div className="mt-3 space-y-2">
            {rubric.map((r, i) => (
              <div key={r.key} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-center text-xs font-extrabold text-[var(--muted)]">{i + 1}</span>
                <input value={r.name} onChange={(e) => updateRow(r.key, { name: e.target.value })} placeholder="VD: Từ vựng" className={field} />
                <input type="number" min="0" max="100" value={r.points} onChange={(e) => updateRow(r.key, { points: Number(e.target.value) })} className={`${field} w-24 shrink-0`} aria-label={`Điểm tiêu chí ${i + 1}`} />
                <Button type="button" variant="ghost" onClick={() => removeRow(r.key)} aria-label={`Xóa tiêu chí ${i + 1}`}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <p className="text-right text-sm font-extrabold text-[var(--brand-dark)]">
              Tổng: {rubric.reduce((s, r) => s + (Number.isFinite(r.points) ? r.points : 0), 0)}/{maxScore}
            </p>
          </div>
        )}
      </div>
      {errors.length > 0 && (
        <ul className="space-y-1 rounded-2xl border-2 border-[#ea2b2b]/40 bg-[#ffdfe0] p-3 text-sm font-semibold text-[#9a1f1f]">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
      <input
        type="hidden"
        name="rubricJson"
        value={JSON.stringify(rubric.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), maxPoints: r.points })))}
      />
      <Button type="submit" fullWidth>
        Tạo bài tự luận
      </Button>
    </form>
  );
}
