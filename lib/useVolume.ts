import { useSyncExternalStore } from "react";

// Громкость фрагментов видео (лёгкий режим), как в ютубе: 0–100 и отдельно «без звука».
// Запоминается в браузере; useSyncExternalStore — чтобы SSR и гидрация видели одно и то же.
export type Volume = { volume: number; muted: boolean };

const KEY = "volume";
const DEFAULT: Volume = { volume: 100, muted: false };
const listeners = new Set<() => void>();
// снимок должен быть тем же объектом, пока значение не поменялось
let cache: { raw: string | null; value: Volume } = { raw: null, value: DEFAULT };

function read(): Volume {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw === cache.raw) return cache.value;
  let value = DEFAULT;
  try {
    const v = JSON.parse(raw ?? "null");
    if (v && typeof v.volume === "number" && typeof v.muted === "boolean") {
      value = { volume: Math.min(100, Math.max(0, Math.round(v.volume))), muted: v.muted };
    }
  } catch {}
  cache = { raw, value };
  return value;
}

export function setVolume(value: Volume) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // хранилище недоступно — держим значение хотя бы в памяти
    cache = { raw: cache.raw, value };
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useVolume(): Volume {
  return useSyncExternalStore(subscribe, read, () => DEFAULT);
}
