import { DIFFICULTIES, DIFFICULTY_INFO, DIFFICULTY_LABELS, type Difficulty } from "@/lib/difficulty";

/** Выбор сложности карточками: у каждой — чем режим отличается от остальных. */
export default function DifficultyPicker({
  value,
  onChange,
}: {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
}) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label="Сложность">
      {DIFFICULTIES.map((d) => {
        const selected = value === d;
        return (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(d)}
            className={`flex gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
              selected ? "border-link bg-link/10" : "border-line hover:bg-hover"
            }`}
          >
            {/* кружок радиокнопки */}
            <span
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                selected ? "border-link" : "border-field-line"
              }`}
              aria-hidden
            >
              {selected && <span className="size-2.5 rounded-full bg-link" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{DIFFICULTY_LABELS[d]}</span>
              <ul className="pt-1 text-[13px] leading-snug text-muted">
                {DIFFICULTY_INFO[d].map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </span>
          </button>
        );
      })}
    </div>
  );
}
