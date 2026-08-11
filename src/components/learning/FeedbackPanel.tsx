import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const errorLabels: Record<string, string> = {
  VOCAB: "Sai từ vựng",
  GRAMMAR: "Sai ngữ pháp",
  STRUCTURE: "Sai cấu trúc câu",
  PINYIN: "Sai chính tả Pinyin",
  EXPRESSION: "Sai cách diễn đạt",
};

export function FeedbackPanel({
  score,
  maxScore,
  comment,
  errors = [],
  className,
}: {
  score?: number | null;
  maxScore?: number | null;
  comment?: string | null;
  errors?: { type: string; excerpt: string; suggestion: string }[];
  className?: string;
}) {
  return (
    <div className={cn("rounded-[24px] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-card)]", className)}>
      <div className="flex items-center gap-3">
        <CheckCircle2 className="size-6 text-[var(--brand)]" />
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Nhận xét giáo viên</p>
          {score != null && (
            <p className="text-xl font-extrabold text-[var(--ink)]">
              {score}
              {maxScore != null ? ` / ${maxScore}` : ""} điểm
            </p>
          )}
        </div>
      </div>
      {comment && <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink)]">{comment}</p>}
      {errors.length > 0 && (
        <ul className="mt-4 space-y-3">
          {errors.map((err, i) => (
            <li key={i} className="rounded-2xl bg-[var(--surface)] p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--danger)]">
                <AlertCircle className="size-4" />
                {errorLabels[err.type] ?? err.type}
              </div>
              <p className="mt-1 text-sm text-[var(--ink)]">
                <span className="font-semibold">Lỗi:</span> {err.excerpt}
              </p>
              <p className="mt-1 text-sm text-[var(--brand-dark)]">
                <span className="font-semibold">Gợi ý:</span> {err.suggestion}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
