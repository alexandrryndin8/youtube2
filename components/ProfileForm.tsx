"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import CheatToast from "@/components/CheatToast";
import { DEFAULT_AVATAR, NAME_MAX, SECRET_AVATARS } from "@/lib/avatars";
import { useMounted } from "@/lib/useMounted";

export type Profile = { name: string; avatar: string };

const PROFILE_KEY = "profile";
const TOAST_MS = 4000;
const CHEAT_BUFFER = 32;

/** Сохранённый профиль; нет профиля или его аватарки больше нет в папке — аватарка по умолчанию. Секретная остаётся, раз уже открыта. */
function loadProfile(avatars: string[]): Profile {
  const fallback = avatars.includes(DEFAULT_AVATAR) ? DEFAULT_AVATAR : (avatars[0] ?? "");
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
    if (saved && typeof saved.name === "string") {
      return { name: saved.name.slice(0, NAME_MAX), avatar: avatars.includes(saved.avatar) || saved.avatar in SECRET_AVATARS ? saved.avatar : fallback };
    }
  } catch {}
  return { name: "", avatar: fallback };
}

type Props = {
  avatars: string[]; // имена файлов из public/avatarki
  title: React.ReactNode;
  action: string;
  onSubmit: (profile: Profile) => Promise<string | void>;
  children?: React.ReactNode; // доп. поля перед кнопкой — например, сложность при создании сервера
};

/**
 * Выбор аватарки и ника перед входом на сервер. Профиль запоминается в браузере.
 * onSubmit возвращает текст ошибки или ничего.
 */
export default function ProfileForm(props: Props) {
  // сохранённый профиль есть только в браузере — на сервере рисуем пустую карточку
  if (!useMounted()) return <div className="mx-auto h-[720px] w-full max-w-[440px] bg-surface" />;
  return <Form {...props} />;
}

function Form({ avatars, title, action, onSubmit, children }: Props) {
  const [profile, setProfile] = useState<Profile>(() => loadProfile(avatars));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = profile.name.trim();
  const gridRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const ringPlaced = useRef(false);
  const [toast, setToast] = useState("");
  // открытая секретная аватарка показывается в сетке последней
  const shown = profile.avatar in SECRET_AVATARS ? [...avatars, profile.avatar] : avatars;

  // читкод секретной аватарки: просто набрать его на клавиатуре, где угодно на странице.
  // Буквы берём по физической клавише (e.code), так что и в русской раскладке «ьщкпутыреуко» сработает
  useEffect(() => {
    let typed = "";
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const letter = /^Key([A-Z])$/.exec(e.code)?.[1];
      if (!letter) return;
      typed = (typed + letter.toLowerCase()).slice(-CHEAT_BUFFER);
      const id = Object.keys(SECRET_AVATARS).find((a) => typed.endsWith(SECRET_AVATARS[a]));
      if (!id) return;
      typed = "";
      // код набирали в поле ника — последнюю букву не пускаем, а уже введённые стираем
      const inNick = e.target instanceof HTMLInputElement && e.target.id === "nick";
      if (inNick) e.preventDefault();
      const typedInNick = SECRET_AVATARS[id].length - 1;
      setProfile((p) => ({
        name: inNick && p.name.length >= typedInNick ? p.name.slice(0, -typedInNick) : p.name,
        avatar: id,
      }));
      setToast(SECRET_AVATARS[id].toUpperCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // обводка — отдельный элемент поверх сетки: при выборе она переезжает к новой аватарке
  useLayoutEffect(() => {
    const grid = gridRef.current;
    const ring = ringRef.current;
    if (!grid || !ring) return;
    const place = () => {
      const target = grid.querySelector<HTMLElement>(`[data-avatar="${CSS.escape(profile.avatar)}"]`);
      if (!target) {
        ring.style.opacity = "0";
        return;
      }
      // первый раз — сразу на место, без полёта из угла
      if (!ringPlaced.current) ring.style.transition = "none";
      ring.style.width = ring.style.height = `${target.offsetWidth}px`;
      ring.style.transform = `translate(${target.offsetLeft}px, ${target.offsetTop}px)`;
      ring.style.opacity = "1";
      if (!ringPlaced.current) {
        void ring.offsetWidth; // применить позицию до того, как вернуть анимацию
        ring.style.transition = "";
        ringPlaced.current = true;
      }
    };
    place();
    // при изменении ширины формы ячейки сдвигаются — ставим обводку заново
    const observer = new ResizeObserver(place);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [profile.avatar]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !profile.avatar || busy) return;
    const p = { name, avatar: profile.avatar };
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch {}
    setBusy(true);
    setError("");
    const err = await onSubmit(p);
    if (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-[440px] bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.15)]">
      <h1 className="pb-5 text-xl">{title}</h1>

      <p className="pb-2 text-sm font-medium">Аватарка</p>
      {avatars.length === 0 && <p className="pb-5 text-sm text-subscribe">Нет картинок в public/avatarki</p>}
      <div ref={gridRef} className="relative grid grid-cols-4 gap-3 pb-5" role="radiogroup" aria-label="Аватарка">
        {shown.map((id) => {
          const selected = profile.avatar === id;
          return (
            <button
              key={id}
              data-avatar={id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={id.replace(/\.[^.]+$/, "")}
              onClick={() => setProfile((p) => ({ ...p, avatar: id }))}
              className="group aspect-square w-full rounded-full p-1.5 outline-none"
            >
              <Avatar
                id={id}
                className={`size-full transition duration-300 ease-out ${
                  selected ? "scale-100 opacity-100" : "scale-90 opacity-60 group-hover:scale-95 group-hover:opacity-90"
                }`}
              />
            </button>
          );
        })}
        <span
          ref={ringRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-full opacity-0 shadow-[0_0_0_3px_var(--link),0_0_14px_2px_color-mix(in_srgb,var(--link)_45%,transparent)] transition-[transform,width,height,opacity] duration-[450ms] ease-[cubic-bezier(0.34,1.4,0.64,1)]"
        />
      </div>

      <label className="block pb-1 text-sm font-medium" htmlFor="nick">
        Ник
      </label>
      <input
        id="nick"
        value={profile.name}
        onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value.slice(0, NAME_MAX) }))}
        maxLength={NAME_MAX}
        placeholder="Как тебя называть"
        className="w-full border-b border-field-line bg-transparent pb-1 pt-2 text-sm outline-none focus:-mb-px focus:border-b-2 focus:border-foreground"
        autoComplete="nickname"
        autoFocus
      />
      <p className="pt-1 text-right text-xs text-muted">
        {profile.name.length}/{NAME_MAX}
      </p>

      {/* как тебя увидят на сервере: аватарка и ник вместе */}
      <p className="pb-2 pt-4 text-sm font-medium">Предпросмотр профиля</p>
      <div className="flex items-center gap-3 rounded-[2px] bg-background p-3">
        <Avatar key={profile.avatar} id={profile.avatar} className="size-12 animate-pop-in" />
        <div className="min-w-0">
          <p className={`truncate text-sm font-medium ${name ? "" : "text-muted"}`}>{name || "Твой ник"}</p>
          <p className="text-xs text-muted">0 респектов • в сети</p>
        </div>
      </div>

      {children}

      {error && <p className="pt-2 text-sm text-subscribe">{error}</p>}

      <button
        type="submit"
        disabled={!name || !profile.avatar || busy}
        className="mt-4 h-9 w-full rounded-[2px] bg-subscribe text-sm font-medium uppercase tracking-wide text-white hover:bg-[#b80000] disabled:opacity-60"
      >
        {busy ? "Секунду…" : action}
      </button>

      {toast && <CheatToast key={toast} title="Достижение получено!" text={`Секретная аватарка ${toast}`} />}
    </form>
  );
}
