"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon, { ICONS } from "@/components/Icon";
import Logo from "@/components/Logo";
import { CODE_ALPHABET, CODE_LENGTH, parseRoomCode } from "@/lib/roomCode";

const AUTO_CLOSE_MS = 8000;

function Item({ href, icon, children, onClick }: { href: string; icon: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex h-10 items-center gap-6 px-6 text-sm hover:bg-line">
      <Icon d={icon} className="size-6 text-muted" />
      {children}
    </Link>
  );
}

/** Кнопка ☰ в шапке и выезжающее ютубовское меню: одиночная игра, создать сервер, подключиться. */
export default function SidebarButton() {
  const [open, setOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const close = () => {
    setOpen(false);
    setJoinOpen(false);
    setError("");
  };

  // раскрыли поле — сразу ставим в него курсор
  useEffect(() => {
    if (joinOpen) inputRef.current?.focus();
  }, [joinOpen]);

  // закрывается по Esc и само — если провисело без дела дольше 8 секунд (ввод кода таймер сбрасывает)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const timer = setTimeout(close, AUTO_CLOSE_MS);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [open, joinOpen, code, error]);

  // перед переходом спрашиваем сервер, есть ли такая комната и есть ли в ней места
  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== CODE_LENGTH || checking) return;
    setChecking(true);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${code}`);
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      close();
      setCode("");
      router.push(`/room/${data.code}`);
    } catch {
      setError("Не удалось проверить сервер");
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="shrink-0 text-muted hover:text-foreground" aria-label="Меню">
        <Icon d={ICONS.menu} className="size-6" />
      </button>

      {/* всегда в DOM, чтобы меню выезжало и уезжало плавно; закрытое — inert, фокус в него не попадёт */}
      <div
        inert={!open}
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <nav
          onClick={(e) => e.stopPropagation()}
          className={`flex h-full w-[240px] flex-col overflow-y-auto bg-surface shadow-[2px_0_12px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-label="Меню"
        >
          <div className="flex h-14 shrink-0 items-center gap-4 px-4">
            <button onClick={close} className="text-muted hover:text-foreground" aria-label="Закрыть меню">
              <Icon d={ICONS.menu} className="size-6" />
            </button>
            <Logo />
          </div>

          <div className="border-b border-line py-3">
            <Item href="/" icon={ICONS.help} onClick={close}>
              Правила
            </Item>
            <Item href="/play" icon={ICONS.home} onClick={close}>
              Одиночная игра
            </Item>
          </div>

          <div className="py-3">
            <p className="px-6 pb-2 text-sm font-medium uppercase text-muted">Мультиплеер</p>
            <Item href="/room" icon={ICONS.add} onClick={close}>
              Создать сервер
            </Item>
            <button
              type="button"
              onClick={() => setJoinOpen((v) => !v)}
              aria-expanded={joinOpen}
              className="flex h-10 w-full items-center gap-6 px-6 text-sm hover:bg-line"
            >
              <Icon d={ICONS.login} className="size-6 text-muted" />
              Подключиться
              <Icon
                d={ICONS.expand}
                className={`ml-auto size-5 text-muted transition-transform duration-200 ${joinOpen ? "rotate-180" : ""}`}
              />
            </button>
            {/* grid-rows 0fr → 1fr плавно раскрывает блок на его собственную высоту */}
            <div
              inert={!joinOpen}
              className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                joinOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <form onSubmit={join} className="overflow-hidden px-6 pt-2">
                <input
                  ref={inputRef}
                  value={code}
                  onChange={(e) => {
                    // в поле остаётся только чистый код; вставленная ссылка тоже превращается в код
                    const raw = e.target.value;
                    setCode(parseRoomCode(raw));
                    const junk = !raw.includes("/") && Array.from(raw.toUpperCase()).some((c) => !CODE_ALPHABET.includes(c));
                    setError(junk ? "Только латинские буквы и цифры, без 0, O, 1, I, L" : "");
                  }}
                  placeholder="Код или ссылка"
                  aria-invalid={!!error}
                  className={`h-8 w-full rounded-[2px] border px-2 text-sm outline-none ${
                    error ? "border-subscribe" : "border-field-line focus:border-link"
                  }`}
                  autoComplete="off"
                  autoCapitalize="characters"
                />
                {error && <p className="pt-1 text-xs text-subscribe">{error}</p>}
                <button
                  type="submit"
                  disabled={code.length !== CODE_LENGTH || checking}
                  className="mt-2 h-8 w-full rounded-[2px] bg-link text-sm font-medium uppercase text-white disabled:bg-disabled-bg disabled:text-disabled-fg"
                >
                  {checking ? "Проверяем…" : "Войти"}
                </button>
              </form>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
