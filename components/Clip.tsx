"use client";

import { useEffect, useRef } from "react";
import { CLIP_SECONDS } from "@/lib/difficulty";
import { setVolume, useVolume } from "@/lib/useVolume";

// с запасом: ролик мог долго грузиться, а сообщения о времени от ютуба так и не пришли
const FALLBACK_MS = CLIP_SECONDS * 1000 + 8000;
// столько ждём, что ролик заиграл со звуком; нет — браузер запретил автоплей, включаем без звука
const UNMUTED_GRACE_MS = 2500;

/**
 * Первые CLIP_SECONDS секунд ролика в ютубовском плеере, потом onEnd. Звук и громкость — из useVolume.
 * Плеер выше контейнера: верхняя плашка с названием (выдала бы слово) и нижняя с логотипом
 * уходят за край и обрезаются. Поверх — прозрачный слой, чтобы клик не увёл на ютуб.
 * Время воспроизведения ютуб присылает через postMessage (тот же протокол, что у IFrame API),
 * им же отправляем команды.
 */
export default function Clip({ id, onEnd }: { id: string; onEnd: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const onEndRef = useRef(onEnd);
  const sound = useVolume();
  const soundRef = useRef(sound);
  const ready = useRef(false);
  useEffect(() => {
    onEndRef.current = onEnd;
    soundRef.current = sound;
  });

  const command = (func: string, args: unknown[] = []) =>
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");

  function applySound({ volume, muted }: { volume: number; muted: boolean }) {
    command("setVolume", [volume]);
    command(muted || volume === 0 ? "mute" : "unMute");
  }

  // покрутили громкость, пока играет
  useEffect(() => {
    if (ready.current) applySound(sound);
  }, [sound]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const frame = frameRef.current!;
    let playing = false;
    ready.current = false;

    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.contentWindow || typeof e.data !== "string") return;
      let info: { playerState?: number; currentTime?: number } | undefined;
      try {
        info = JSON.parse(e.data).info;
      } catch {
        return;
      }
      if (!ready.current) {
        // плеер ответил — выставляем ему громкость, как у игрока
        ready.current = true;
        applySound(soundRef.current);
      }
      if (info?.playerState === 1) playing = true;
      if ((info?.currentTime ?? 0) >= CLIP_SECONDS) {
        command("pauseVideo");
        onEndRef.current();
      }
    };
    window.addEventListener("message", onMessage);

    // подписываемся на события плеера; повторяем, пока он не загрузится и не ответит — как сам IFrame API
    const listen = setInterval(() => {
      if (ready.current) clearInterval(listen);
      else frame.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
    }, 250);
    // браузер не дал играть со звуком — играем без него, а значок громкости показывает «без звука»
    const muteTimer = setTimeout(() => {
      if (playing) return;
      setVolume({ ...soundRef.current, muted: true });
      command("mute");
      command("playVideo");
    }, UNMUTED_GRACE_MS);
    const fallback = setTimeout(() => onEndRef.current(), FALLBACK_MS);

    return () => {
      window.removeEventListener("message", onMessage);
      clearInterval(listen);
      clearTimeout(muteTimer);
      clearTimeout(fallback);
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const params = new URLSearchParams({
    autoplay: "1",
    controls: "0",
    disablekb: "1",
    fs: "0",
    rel: "0",
    playsinline: "1",
    iv_load_policy: "3",
    enablejsapi: "1",
    start: "0",
    // на случай, если сообщения о времени не дойдут, — ютуб остановится сам
    end: String(CLIP_SECONDS + 1),
  });

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <iframe
        ref={frameRef}
        src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
        title="Фрагмент видео"
        allow="autoplay; encrypted-media"
        className="pointer-events-none absolute inset-x-0 -top-[72px] h-[calc(100%+144px)] w-full border-0"
      />
      <div className="absolute inset-0" aria-hidden />
    </div>
  );
}
