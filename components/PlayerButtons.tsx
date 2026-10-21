"use client";

import Icon, { ICONS } from "@/components/Icon";
import { CLIP_SECONDS } from "@/lib/difficulty";
import { setVolume, useVolume } from "@/lib/useVolume";

/**
 * ▶ в панели плеера. В лёгком режиме включает первые секунды видео, в остальных — перечёркнут:
 * видно, что видео тут не посмотреть.
 */
export function ClipButton({
  enabled,
  playing,
  loading,
  onClick,
}: {
  enabled: boolean;
  playing: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  if (!enabled) {
    const label = "В этом режиме видео не включить";
    return (
      <span className="relative flex size-7 items-center justify-center opacity-50" title={label} aria-label={label} role="img">
        <Icon d={ICONS.play} className="size-7" />
        <span className="absolute h-[2.5px] w-8 -rotate-45 rounded-full bg-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.6)]" />
      </span>
    );
  }
  const label = playing ? "Остановить" : `Смотреть первые ${CLIP_SECONDS} секунды`;
  return (
    <button onClick={onClick} disabled={loading} className="disabled:opacity-40" aria-label={label} title={label}>
      <Icon d={playing ? ICONS.pause : ICONS.play} className="size-7" />
    </button>
  );
}

/**
 * Громкость как в ютубе: значок включает и выключает звук, ползунок выезжает при наведении (или фокусе).
 * enabled = false — просто значок для красоты, как было до лёгкого режима.
 */
export function VolumeControl({ enabled }: { enabled: boolean }) {
  const { volume, muted } = useVolume();
  if (!enabled) return <Icon d={ICONS.volume} className="hidden size-6 sm:block" />;
  const silent = muted || volume === 0;
  return (
    <div className="group/volume flex items-center">
      <button
        onClick={() => setVolume({ volume: volume || 100, muted: !silent })}
        aria-label={silent ? "Включить звук" : "Выключить звук"}
        title={silent ? "Включить звук" : "Выключить звук"}
      >
        <Icon d={silent ? ICONS.volumeOff : ICONS.volume} className="size-6" />
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={silent ? 0 : volume}
        onChange={(e) => {
          const v = Number(e.target.value);
          setVolume({ volume: v, muted: v === 0 });
        }}
        aria-label="Громкость"
        className="ml-0 h-1 w-0 cursor-pointer accent-white opacity-0 transition-all duration-200 group-hover/volume:ml-2 group-hover/volume:w-16 group-hover/volume:opacity-100 focus-visible:ml-2 focus-visible:w-16 focus-visible:opacity-100"
      />
    </div>
  );
}
