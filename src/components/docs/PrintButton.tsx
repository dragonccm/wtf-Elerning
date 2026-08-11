"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-2xl border-2 border-b-4 border-[var(--brand-dark)] bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white transition-all hover:brightness-105 active:translate-y-[2px] active:border-b-2"
    >
      In / Lưu PDF
    </button>
  );
}
