"use client";

import { useEffect, useState } from "react";
import DifficultyPicker from "@/components/DifficultyPicker";
import type { Difficulty } from "@/lib/difficulty";

/**
 * Окно выбора сложности. Без onCancel его не закрыть — пока не выберешь, играть нельзя
 * (так в одиночной игре перед началом сессии). С onCancel закрывается крестиком, фоном и Esc.
 */
export default function DifficultyDialog({
  title,
  initial,
  action,
  note,
  onConfirm,
  onCancel,
}: {
  title: string;
  initial: Difficulty;
  action: string;
  note?: React.ReactNode;
  onConfirm: (d: Difficulty) => void;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (!onCancel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-full w-full max-w-[420px] animate-pop-in overflow-y-auto rounded-xl bg-surface p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
      >
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute right-3 top-3 text-xl leading-none text-muted hover:text-foreground"
            aria-label="Закрыть"
          >
            ✕
          </button>
        )}
        <h2 className="pb-4 pr-6 text-lg font-medium">{title}</h2>
        <DifficultyPicker value={value} onChange={setValue} />
        {note && <p className="pt-3 text-[13px] text-subscribe">{note}</p>}
        <button
          onClick={() => onConfirm(value)}
          className="mt-4 h-10 w-full rounded-[2px] bg-subscribe text-sm font-medium uppercase tracking-wide text-white hover:bg-[#b80000]"
        >
          {action}
        </button>
      </div>
    </div>
  );
}
