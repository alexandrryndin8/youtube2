"use client";

import { useEffect, useRef, useState } from "react";
import Icon, { ICONS } from "@/components/Icon";
import { getPack, matchCheat, setPack } from "@/lib/cheats";
import type { Pack } from "@/lib/packs";

const BACK = "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z";
const HINT_MS = 2500;

/**
 * Поиск в шапке. Найти он ничего не может — зато принимает читкоды.
 * Повторный ввод того же кода выключает чит. onCheat получает набор и включён ли он теперь.
 */
export default function SearchBar({ onCheat }: { onCheat: (pack: Pack, enabled: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setHint(""), HINT_MS);
    return () => clearTimeout(timer);
  }, [hint]);

  useEffect(() => {
    if (mobileOpen) mobileRef.current?.focus();
  }, [mobileOpen]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const pack = matchCheat(q);
    if (!pack) {
      setHint(`По запросу «${q}» ничего не найдено`);
      return;
    }
    const enabled = getPack() !== pack;
    setPack(enabled ? pack : null);
    setQuery("");
    setHint("");
    setMobileOpen(false);
    e.currentTarget.querySelector("input")?.blur();
    onCheat(pack, enabled);
  }

  const field = (ref?: React.Ref<HTMLInputElement>) => (
    <input
      ref={ref}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        setQuery("");
        setMobileOpen(false);
      }}
      placeholder="Введите запрос"
      className="min-w-0 flex-1 rounded-l-[2px] border border-field-line bg-surface px-3 text-base shadow-[inset_0_1px_2px_var(--line)] outline-none placeholder:text-muted focus:border-link"
      aria-label="Поиск"
      autoComplete="off"
      enterKeyHint="search"
    />
  );

  const button = (
    <button
      type="submit"
      className="flex w-16 shrink-0 items-center justify-center rounded-r-[2px] border border-l-0 border-field-line bg-button-bg text-foreground hover:bg-hover"
      aria-label="Искать"
    >
      <Icon d={ICONS.search} className="size-5" />
    </button>
  );

  const hintBox = hint && (
    <p className="absolute left-0 right-16 top-full mt-1 bg-surface px-3 py-2 text-sm text-muted shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
      {hint}
    </p>
  );

  return (
    <>
      <form onSubmit={submit} className="relative mx-auto hidden h-10 max-w-[640px] flex-1 sm:flex" role="search">
        {field()}
        {button}
        {hintBox}
      </form>

      {/* на телефоне — лупа, по нажатию поле раскрывается на всю шапку */}
      <button
        onClick={() => setMobileOpen(true)}
        className="ml-auto text-foreground sm:hidden"
        aria-label="Поиск"
      >
        <Icon d={ICONS.search} className="size-6" />
      </button>
      {mobileOpen && (
        <form
          onSubmit={submit}
          className="absolute inset-0 z-10 flex items-center gap-2 bg-surface px-2 sm:hidden"
          role="search"
        >
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="shrink-0 p-2 text-muted"
            aria-label="Закрыть поиск"
          >
            <Icon d={BACK} className="size-6" />
          </button>
          <div className="relative flex h-10 min-w-0 flex-1">
            {field(mobileRef)}
            {button}
            {hintBox}
          </div>
        </form>
      )}
    </>
  );
}
