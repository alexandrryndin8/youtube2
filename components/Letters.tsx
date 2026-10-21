import { plural } from "@/lib/plural";

const lettersLabel = (n: number) => `${n} ${plural(n, ["буква", "буквы", "букв"])}`;

/**
 * Лёгкий режим: клеточка на каждую букву загаданного слова. null — ещё закрыта, «-» — дефис (баба-яга).
 * Открытая подсказкой буква появляется с анимацией.
 */
export default function Letters({ letters, className = "" }: { letters: (string | null)[]; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      <div className="flex flex-wrap gap-1">
        {letters.map((l, i) =>
          l === "-" ? (
            <span key={i} className="flex h-9 w-3 items-center justify-center text-lg font-medium">
              -
            </span>
          ) : (
            <span
              key={i}
              className={`flex size-9 items-center justify-center rounded-[4px] border-2 text-lg font-bold uppercase ${
                l ? "animate-pop-in border-link text-foreground" : "border-field-line"
              }`}
            >
              {l ?? ""}
            </span>
          ),
        )}
      </div>
      <span className="text-sm text-muted">{lettersLabel(letters.filter((l) => l !== "-").length)}</span>
    </div>
  );
}
