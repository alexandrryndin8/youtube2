const CONFETTI_COLORS = ["#ffd700", "#ff3b3b", "#ffffff", "#ffb300", "#3ea6ff", "#7cff6b", "#ff4fd8"];
const CONFETTI_COUNT = 56;

/**
 * Праздничное окно за угадывание с первой попытки: золото, конфетти и особый текст.
 * Конфетти раскиданы детерминированно по номеру — без случайности в рендере.
 */
export default function GoldenWin({
  title,
  subtitle,
  word,
  respect,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  word: string;
  respect?: number;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center overflow-hidden bg-black/70 p-4" onClick={onClose}>
      {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none absolute top-0 animate-confetti"
          style={
            {
              left: `${(i * 53) % 100}%`,
              width: i % 3 ? 8 : 12,
              height: i % 2 ? 14 : 8,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              borderRadius: i % 4 === 0 ? "50%" : 2,
              // отрицательная задержка — конфетти уже летят, когда окно появилось
              "--confetti-delay": `-${((i * 0.37) % 3).toFixed(2)}s`,
              "--confetti-time": `${2.4 + (i % 5) * 0.45}s`,
            } as React.CSSProperties
          }
        />
      ))}

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Угадано с первой попытки"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[460px] animate-gold-pop"
      >
        <div className="rounded-md animate-gold-glow">
          <div className="relative rounded-md bg-[linear-gradient(110deg,#b8860b_0%,#ffd700_25%,#fff6c2_50%,#ffd700_75%,#b8860b_100%)] bg-[length:200%_100%] px-5 pb-5 pt-8 text-center text-[#3d2400] animate-gold-shine [font-family:Impact,'Arial_Black',Arial,sans-serif]">
            <button
              onClick={onClose}
              className="absolute right-2 top-1 text-lg text-[#3d2400]/70 hover:text-black"
              aria-label="Закрыть"
            >
              ✕
            </button>
            <p className="text-[30px] uppercase leading-tight [text-shadow:0_2px_0_#fff8d6,0_4px_8px_rgba(0,0,0,0.25)] animate-gold-shake">
              {title}
            </p>
            <p className="mt-1 text-[22px] uppercase leading-tight [text-shadow:0_2px_0_#fff8d6]">{subtitle}</p>
            <p className="mt-4 text-[17px] [font-family:Arial,Helvetica,sans-serif] font-bold">
              Слово: «<span className="uppercase">{word}</span>»
            </p>
            {respect !== undefined && (
              <p className="mt-1 text-[26px] [text-shadow:0_2px_0_#fff8d6]">+{respect} RESPECT</p>
            )}
            <div className="mt-3 [font-family:Arial,Helvetica,sans-serif]">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
