"use client";
import { joinClassroomAction, type ActionState } from "@/lib/classroom-actions";
import { useActionState } from "react";
const initial: ActionState = {};
export function JoinClassForm({ initialCode }: { initialCode?: string }) {
  const [state, action, pending] = useActionState(joinClassroomAction, initial);
  return (
    <form
      action={action}
      className="rounded-[24px] border-2 border-[var(--line)] bg-white p-5 shadow-[var(--shadow-card)]"
    >
      <h2 className="text-xl font-extrabold">Tham gia lớp học</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Nhập mã và mật khẩu giáo viên đã gửi. (Nếu bạn bấm link chia sẻ, mã lớp đã được điền sẵn.)
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          name="code"
          required
          defaultValue={initialCode}
          placeholder="WTF-ABC123"
          className="rounded-2xl border-2 border-[var(--line)] px-4 py-3 font-mono font-bold uppercase outline-none focus:border-[var(--brand)]"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Mật khẩu lớp"
          className="rounded-2xl border-2 border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--brand)]"
        />
      </div>
      <button
        disabled={pending}
        className="mt-4 rounded-2xl border-2 border-b-4 border-[var(--brand-dark)] bg-[var(--brand)] px-6 py-3 font-extrabold text-white"
      >
        {pending ? "Đang kiểm tra…" : "Tham gia lớp"}
      </button>
      {state.message && (
        <p aria-live="polite" className={`mt-3 text-sm font-bold ${state.ok ? "text-[var(--brand-dark)]" : "text-[var(--danger)]"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
