"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Button } from "./Button";

export function BottomCTA({
  children,
  secondary,
  onPrimary,
  onSecondary,
  primaryLabel = "Kiểm tra",
  secondaryLabel,
  disabled,
  className,
}: {
  children?: ReactNode;
  secondary?: boolean;
  onPrimary?: () => void;
  onSecondary?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 border-t border-[var(--line)] bg-white/95 px-4 py-4 backdrop-blur",
        className,
      )}
    >
      {children}
      <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
        {secondaryLabel && (
          <Button variant="secondary" fullWidth onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
        <Button fullWidth disabled={disabled} onClick={onPrimary} variant={secondary ? "secondary" : "primary"}>
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}
