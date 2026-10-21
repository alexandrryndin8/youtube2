// голова крипера 8×8: 1 — тёмные пиксели лица
const CREEPER = ["00000000", "00000000", "01100110", "01100110", "00011000", "00111100", "00111100", "00100100"];

/** Плашка в духе майнкрафтовского «Достижение получено!» — выезжает справа сверху. */
export default function CheatToast({ title, text }: { title: string; text: string }) {
  return (
    <div
      role="status"
      className="fixed right-4 top-[72px] z-30 flex w-[min(320px,calc(100vw-32px))] animate-toast-in items-center gap-3 border-2 border-[#555] bg-[#212121] p-2 pr-3 shadow-[inset_0_0_0_2px_#000,0_6px_20px_rgba(0,0,0,0.4)] [font-family:'Courier_New',monospace] [image-rendering:pixelated]"
    >
      <svg viewBox="0 0 8 8" className="size-10 shrink-0" shapeRendering="crispEdges" aria-hidden>
        <rect width="8" height="8" fill="#4caf50" />
        {CREEPER.flatMap((row, y) =>
          [...row].map((c, x) => (c === "1" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0b1f0b" /> : null)),
        )}
      </svg>
      <div className="min-w-0 leading-tight">
        <p className="text-[14px] font-bold text-[#ffff55]">{title}</p>
        <p className="text-[13px] text-white">{text}</p>
      </div>
    </div>
  );
}
