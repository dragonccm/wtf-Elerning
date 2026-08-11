"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "locked";

const styles: Record<Variant, string> = {
  primary:
    "bg-[var(--brand)] text-white border-2 border-b-4 border-[var(--brand-dark)] hover:brightness-105 active:translate-y-[2px] active:border-b-2",
  secondary:
    "bg-white text-[#3c3c3c] border-2 border-b-4 border-[#e5e5e5] hover:bg-[#f7f7f7] active:translate-y-[2px] active:border-b-2",
  ghost: "bg-transparent text-[#777] hover:bg-[#f7f7f7] hover:text-[#3c3c3c]",
  danger:
    "bg-[#ff4b4b] text-white border-2 border-b-4 border-[#ea2b2b] active:translate-y-[2px] active:border-b-2",
  locked: "bg-[#e5e5e5] text-[#afafaf] border-2 border-b-4 border-[#e5e5e5] cursor-not-allowed",
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", fullWidth, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[15px] font-bold tracking-wide transition-all duration-150",
        styles[disabled ? "locked" : variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
});
