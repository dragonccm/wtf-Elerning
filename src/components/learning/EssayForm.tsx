"use client";

import { submitEssayFormAction, type EssayFormState } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { useActionState } from "react";

const initial: EssayFormState = {};

export function EssayForm({ assessmentId, nodeId }: { assessmentId: string; nodeId: string }) {
  const [state, action, pending] = useActionState(submitEssayFormAction, initial);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <input type="hidden" name="nodeId" value={nodeId} />
      <textarea
        name="text"
        required
        minLength={10}
        rows={8}
        placeholder="Viết bài của bạn tại đây..."
        className="w-full rounded-[24px] border-2 border-[var(--line)] bg-white p-4 outline-none focus:border-[var(--brand)]"
      />
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs font-bold text-[var(--muted)]">Tối thiểu 10 ký tự.</p>
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? "Đang nộp bài…" : "Nộp bài tự luận"}
        </Button>
      </div>
      {state.message && (
        <p aria-live="polite" className="rounded-2xl border-2 border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 text-sm font-bold text-[var(--danger)]">
          {state.message}
        </p>
      )}
    </form>
  );
}
