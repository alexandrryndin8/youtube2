import { useSyncExternalStore } from "react";
import { isPack, type Pack } from "./packs";

// Читкоды из поиска в шапке. Ключ — что ввести (регистр и пробелы по краям не важны).
const CHEATS: Record<string, Pack> = {
  minecraft: "minecraft",
};

export const PACK_LABELS: Record<Pack, string> = {
  minecraft: "MINECRAFT",
};

/** Набор слов, если запрос — читкод. */
export function matchCheat(query: string): Pack | null {
  return CHEATS[query.trim().toLowerCase()] ?? null;
}

// включённый чит запоминается в браузере; useSyncExternalStore — чтобы SSR и гидрация видели одно и то же
const KEY = "cheat-pack";
const listeners = new Set<() => void>();

export function getPack(): Pack | null {
  try {
    const v = localStorage.getItem(KEY);
    return isPack(v) ? v : null;
  } catch {
    return null;
  }
}

export function setPack(pack: Pack | null) {
  try {
    if (pack) localStorage.setItem(KEY, pack);
    else localStorage.removeItem(KEY);
  } catch {}
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePack(): Pack | null {
  return useSyncExternalStore(subscribe, getPack, () => null);
}
