"use client";

import { useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";

const MAX_PREVIEWS = 5;

type Round = { token: string; thumbs: string[]; titles: string[] };
type Result = { word: string; titles: string[]; ids: string[]; won: boolean };

// только русские буквы; дефис — ради «баба-яга»
const FORBIDDEN_RE = /[^а-яё-]/gi;

/** Как сервер сравнивает ответ: без регистра, лишних пробелов и разницы ё/е. */
function normalize(s: string): string {
  return s.trim().toLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ");
}

/** 1 попытка, 2 попытки, 5 попыток */
function plural(n: number, [one, few, many]: [string, string, string]): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few;
  return many;
}

const attemptsLabel = (n: number) => `${n} ${plural(n, ["попытка", "попытки", "попыток"])}`;

/** Попытка и сколько превью было открыто, когда её сделали. */
type Attempt = { text: string; previews: number };

const MAX_RESPECT = 100;

/**
 * Каждая мимо отнимает столько респекта, сколько превью было открыто в момент ответа.
 * Угадавшая попытка бесплатная — иначе 100 было бы недостижимо. Может уйти в минус.
 */
function respect(attempts: Attempt[], won: boolean): number {
  const misses = won ? attempts.slice(0, -1) : attempts;
  return MAX_RESPECT - misses.reduce((sum, a) => sum + a.previews, 0);
}

type Ad = { text: React.ReactNode; link: string; href: string; image: string | null };

// реклама левой колонки (на узких экранах — под превью); image — путь в public, null → заглушка
const ADS: Ad[] = [
  {
    text: (
      <>
        <b>ДАЖЕ КОНЧЕННЫЙ ДЕБИЛ</b> сейчас живет в топовом доме. Секрет <b>ОХУИТЕЛЬНЫХ</b> домов в майне простой,
        нужно всего-лишь..
      </>
    ),
    link: "ЧИТАТЬ ДАЛЕЕ",
    href: "https://%D1%81%D1%82%D1%80%D0%BE%D0%B8%D0%BC%D0%B4%D0%BE%D0%BC%D0%B0%D0%B2%D0%BC%D0%B0%D0%B9%D0%BD%D0%B5.%D1%80%D1%84",
    image: "/build.jpg",
  },
  {
    text: (
      <>
        Только <b>СЕГОДНЯ</b>. Акция на <b>БЕСПЛАТНОЕ</b> прослушивание музыки онлайн по сети. Только на этой странице,
        не упусти возможность!
      </>
    ),
    link: "СЛУШАЙ МУЗЫКУ ОНЛАЙН БЕСПЛАТНО",
    href: "https://music.yandex.ru/artist/19352472",
    image: "/dj.jpg",
  },
  {
    text: (
      <>
        ТОЛЬКО сегодня И завтРА НА этой ебеЙШЕЙ странице - SOFTKEY.STORE можно прикупИТЬ АХУЕННЫХ ЛиценЗий. ДАЖЕ
        самый пиздолобый ДАЛБАЁБ разберётся как купить ЕБЕЙШУЮ лицензию. ПОКУПАЙ ЛиценЗИИ прям ща ПРЯМ тут!!
      </>
    ),
    link: "",
    href: "https://softkey.store",
    image: "/softkey.jpg",
  },
];

// реклама под превью, на всех экранах
const SIDE_ADS: Ad[] = [
  {
    text: (
      <>
        я был НИЩИМ УËБКОМ и мне не давали телки 3 года. ПОСЛЕ ПРОСЛУШИВАНИЯ этого трека они не дают мне прохода!
      </>
    ),
    link: "СЕКРЕТНЫЙ ЗАРАБОТОК В ИНТЕРНЕТЕ ->",
    href: "https://t.me/diphth3riaa",
    image: "/geroy.jpg",
  },
  {
    text: (
      <>
        Мальчик очень сильно хотел попасть под ПИСЕЧНО ПОПОЧНЫЙ ТРИБУНАЛ, но он не ожидал что его встретит ЭТО
        БЕЗУМИЕ...
      </>
    ),
    link: "",
    href: "https://band.link/IS4v8",
    image: "/dengi1.jpg",
  },
  {
    text: <>ХИТРЫЙ СПОСОБ БРОСИТЬ КУРИТЬ ОТ МАКСИМА ПЛАКИНА! КУРИЛ 30 ЛЕТ, БРОСИЛ ЗА ТРИ ДНЯ!</>,
    link: "",
    href: "http://band.link/clinteastwood",
    image: "/max.jpg",
  },
];

/** Новый раунд или текст ошибки. */
async function fetchRound(): Promise<Round | string> {
  try {
    const res = await fetch("/api/round", { method: "POST" });
    const data = await res.json();
    return res.ok ? data : data.error;
  } catch {
    return "Не удалось загрузить раунд";
  }
}

// иконки в духе Material Icons, как на старом ютубе
const ICONS = {
  menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  search:
    "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  play: "M8 5v14l11-7z",
  next: "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",
  volume:
    "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
  fullscreen: "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",
  fullscreenExit: "M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z",
  like: "M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z",
  dislike:
    "M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z",
  share: "M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z",
  lock: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
  heart:
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
};

function Icon({ d, className = "size-6" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** Тизерная реклама в духе рунета 2010-х: картинка сверху, синий подчёркнутый текст — всё одна ссылка. */
function Ads({ ads, className, columns, textSize }: { ads: Ad[]; className: string; columns: string; textSize: string }) {
  return (
    <div className={className}>
      <p className="pb-1 text-[11px] text-muted">Реклама</p>
      <div className={`grid gap-3 ${columns}`}>
        {ads.map((ad) => (
          <a
            key={ad.href}
            href={ad.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex flex-col gap-1.5 bg-white p-1.5 text-center ${textSize} leading-tight text-[#1f1fa0] underline decoration-1 underline-offset-2 [font-family:Arial,Helvetica,sans-serif] hover:text-[#cc0000]`}
          >
            {ad.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.image} alt="" className="aspect-[6/5] w-full object-fill" />
            ) : (
              <span className="flex aspect-[6/5] w-full items-center justify-center border border-dashed border-[#bbb] bg-[#f3f3f3] text-xs text-[#999]">
                {/* inline-block — чтобы подчёркивание ссылки не цеплялось к заглушке */}
                <span className="inline-block">картинка</span>
              </span>
            )}
            <span>
              {ad.text} {ad.link}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function Game() {
  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(1);
  const [current, setCurrent] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [showRest, setShowRest] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [badCharTyped, setBadCharTyped] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  // запасной вариант для iPhone, где Safari не умеет разворачивать на весь экран не-видео
  const [fakeFullscreen, setFakeFullscreen] = useState(false);

  function applyRound(loaded: Round | string) {
    if (typeof loaded === "string") setError(loaded);
    else setRound(loaded);
    setLoading(false);
  }

  function startRound() {
    setLoading(true);
    setError("");
    setRound(null);
    setOpened(1);
    setCurrent(0);
    setAttempts([]);
    setGuess("");
    setBadCharTyped(false);
    setResult(null);
    setShowModal(false);
    setShowRest(false);
    fetchRound().then(applyRound);
  }

  useEffect(() => {
    fetchRound().then(applyRound);
  }, []);

  // на десктопе сразу ставим курсор в поле ответа; на телефоне не дёргаем клавиатуру
  useEffect(() => {
    if (round && matchMedia("(pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true });
  }, [round]);

  // окно итога закрывается по Esc
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShowModal(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal]);

  useEffect(() => {
    const onChange = () => setNativeFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!fakeFullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFakeFullscreen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fakeFullscreen]);

  /** Превью на весь экран — рассмотреть детали. */
  async function toggleFullscreen() {
    if (document.fullscreenElement) return document.exitFullscreen();
    if (fakeFullscreen) return setFakeFullscreen(false);
    try {
      await playerRef.current!.requestFullscreen();
    } catch {
      setFakeFullscreen(true);
    }
  }

  /** Поиск в шапке — декорация: ведёт к полю ответа под видео. */
  function focusGuess() {
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    inputRef.current?.focus({ preventScroll: true });
  }

  async function check(body: object) {
    const res = await fetch("/api/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: round!.token, ...body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }

  async function submitGuess(e: React.FormEvent) {
    e.preventDefault();
    const text = guess.trim();
    if (!round || result || !text || isRepeat) return;
    setAttempts((a) => [...a, { text, previews: opened }]);
    setGuess("");
    setBadCharTyped(false);
    try {
      const data = await check({ guess: text });
      if (data.correct) {
        setResult({ word: data.word, titles: data.titles, ids: data.ids, won: true });
        setShowModal(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function giveUp() {
    if (!round || result) return;
    try {
      const data = await check({ giveUp: true });
      setGuess("");
      setBadCharTyped(false);
      setResult({ word: data.word, titles: data.titles, ids: data.ids, won: false });
      setShowModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function changeGuess(value: string) {
    // латиница, цифры, пробелы и символы просто не вводятся — слово всегда одно и русское
    const cleaned = value.replace(FORBIDDEN_RE, "");
    setBadCharTyped(cleaned !== value);
    setGuess(cleaned);
  }

  function openNext() {
    setCurrent(opened);
    setOpened((n) => n + 1);
  }

  function revealRest() {
    setShowModal(false);
    setShowRest(true);
    setCurrent(opened);
  }

  const isRepeat = guess.trim() !== "" && attempts.some((a) => normalize(a.text) === normalize(guess));
  const available = round ? Math.min(round.thumbs.length, MAX_PREVIEWS) : 0;
  // после конца раунда можно показать и неоткрытые превью
  const visible = showRest ? available : opened;
  const canOpenMore = !!round && !result && opened < available;
  const titles = (result ?? round)?.titles ?? [];
  const locked = !!result || !round; // ответ заблокирован, пока нет раунда или он кончился

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 bg-surface shadow-[0_1px_0_var(--line)]">
        <div className="mx-auto flex h-14 items-center gap-4 px-4">
          <Icon d={ICONS.menu} className="size-6 shrink-0 text-muted" />
          <Logo />
          {/* поиск только для вида: отвечают в комментариях под видео */}
          <div className="mx-auto hidden h-10 max-w-[640px] flex-1 sm:flex">
            <input
              readOnly
              onFocus={focusGuess}
              placeholder="Введите запрос"
              className="min-w-0 flex-1 cursor-pointer rounded-l-[2px] border border-field-line bg-surface px-3 text-base shadow-[inset_0_1px_2px_#eee] outline-none placeholder:text-[#888]"
              aria-label="Перейти к полю ответа"
            />
            <button
              onClick={focusGuess}
              className="flex w-16 items-center justify-center rounded-r-[2px] border border-l-0 border-[#d3d3d3] bg-button-bg text-[#333] hover:bg-[#f0f0f0]"
              aria-label="Перейти к полю ответа"
            >
              <Icon d={ICONS.search} className="size-5" />
            </button>
          </div>
          <button onClick={focusGuess} className="ml-auto text-[#333] sm:hidden" aria-label="Перейти к полю ответа">
            <Icon d={ICONS.search} className="size-6" />
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1280px] gap-6 py-0 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_402px] lg:grid-rows-[auto_1fr] 2xl:max-w-none 2xl:grid-cols-[minmax(200px,1fr)_minmax(0,1100px)_402px]">
        {/* плеер + описание */}
        <section className="min-w-0 lg:col-start-1 lg:row-start-1 2xl:col-start-2">
          <div
            ref={playerRef}
            className={`overflow-hidden bg-player ${
              fakeFullscreen ? "fixed inset-0 z-30" : "relative aspect-video w-full"
            }`}
          >
            {round ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={round.thumbs[current]}
                src={round.thumbs[current]}
                alt={`Превью ${current + 1}`}
                className="size-full object-contain"
                onDoubleClick={toggleFullscreen}
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-3 text-sm text-[#aaa]">
                {loading && <span className="size-10 animate-spin rounded-full border-4 border-[#444] border-t-[#ddd]" />}
                {loading ? "Ищу видео…" : error}
              </div>
            )}

            {/* панель управления плеера: полоса прогресса = сколько превью открыто */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 text-white">
              <div className="relative h-[3px] bg-white/30">
                <div className="h-full bg-yt-red" style={{ width: `${available ? (visible / available) * 100 : 0}%` }} />
                <div
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yt-red"
                  style={{ left: `${available ? (visible / available) * 100 : 0}%` }}
                />
              </div>
              <div className="flex h-10 items-center gap-3">
                <Icon d={ICONS.play} className="size-7" />
                <button
                  onClick={openNext}
                  disabled={!canOpenMore}
                  className="disabled:opacity-40"
                  aria-label="Ещё превью"
                  title="Ещё превью"
                >
                  <Icon d={ICONS.next} className="size-6" />
                </button>
                <Icon d={ICONS.volume} className="hidden size-6 sm:block" />
                <span className="text-[13px]">
                  {round ? `${current + 1} / ${available}` : "0 / 0"}
                </span>
                <button
                  onClick={toggleFullscreen}
                  className="ml-auto"
                  aria-label={nativeFullscreen || fakeFullscreen ? "Выйти из полноэкранного режима" : "Во весь экран"}
                  title={nativeFullscreen || fakeFullscreen ? "Выйти из полноэкранного режима" : "Во весь экран"}
                >
                  <Icon d={nativeFullscreen || fakeFullscreen ? ICONS.fullscreenExit : ICONS.fullscreen} className="size-6" />
                </button>
              </div>
            </div>
          </div>

          <div className="px-3 pt-3 sm:px-0 sm:pt-4">
            <p className="text-[13px] text-link">#ютуб #лололошка #бустэр</p>
            {/* до конца раунда загаданное слово в названии закрыто */}
            <h1 className="pt-1 text-lg leading-snug sm:text-xl">{titles[current] ?? "Загрузка…"}</h1>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-2 pt-2">
              <p className="text-sm text-muted">
                {attemptsLabel(attempts.length)} • открыто превью: {opened} из {available}
              </p>
              <div className="-mx-2 flex flex-wrap items-center text-sm font-medium uppercase text-foreground">
                <button
                  onClick={openNext}
                  disabled={!canOpenMore}
                  className="flex items-center gap-1.5 whitespace-nowrap px-2 py-1.5 uppercase disabled:text-muted"
                >
                  <Icon d={ICONS.like} className="size-5 text-muted" />
                  Ещё превью
                </button>
                <button
                  onClick={giveUp}
                  disabled={locked}
                  className="flex items-center gap-1.5 whitespace-nowrap px-2 py-1.5 uppercase disabled:text-muted"
                >
                  <Icon d={ICONS.dislike} className="size-5 text-muted" />
                  Сдаюсь
                </button>
                {result && (
                  <a
                    href={`https://www.youtube.com/watch?v=${result.ids[current]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 whitespace-nowrap px-2 py-1.5"
                  >
                    <Icon d={ICONS.share} className="size-5 text-muted" />
                    Смотреть
                  </a>
                )}
              </div>
            </div>

            {/* строка канала; итог раунда — во всплывающем окне */}
            <div className="flex gap-3 border-b border-line py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ava.jpg" alt="Ютуб 2" className="size-10 shrink-0 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Ютуб 2</p>
                <p className="text-xs text-muted">Загадано одно существительное</p>
                {result && !showRest && opened < available && (
                  <button
                    onClick={revealRest}
                    className="pt-3 text-[13px] font-medium uppercase text-muted hover:text-foreground"
                  >
                    Показать остальные
                  </button>
                )}
              </div>
              <button
                onClick={startRound}
                disabled={loading}
                className="h-9 shrink-0 self-start rounded-[2px] bg-subscribe px-4 text-sm font-medium uppercase tracking-wide text-white hover:bg-[#b80000] disabled:opacity-60"
              >
                {result ? "Ещё раунд" : "Пропустить"}
              </button>
            </div>
          </div>
        </section>

        {/* «комментарии» — попытки */}
        <section className="px-3 pb-8 sm:px-0 lg:col-start-1 lg:row-start-2 2xl:col-start-2">
          <p className="pb-6 text-base">{attempts.length ? attemptsLabel(attempts.length) : "Попыток пока нет"}</p>

          {result ? (
            <p className="pb-8 text-sm text-muted">Раунд окончен. Новые ответы не принимаются.</p>
          ) : (
            <form onSubmit={submitGuess} className="flex gap-4 pb-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/vsevolodi4.jpg" alt="" className="size-10 shrink-0 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <input
                  ref={inputRef}
                  className={`w-full border-b bg-transparent pb-1 pt-2 text-sm outline-none placeholder:text-muted focus:-mb-px focus:border-b-2 ${
                    isRepeat ? "border-yt-red" : "border-field-line focus:border-foreground"
                  }`}
                  value={guess}
                  onChange={(e) => changeGuess(e.target.value)}
                  placeholder="Ваш вариант слова…"
                  disabled={locked}
                  autoComplete="off"
                  autoCapitalize="off"
                  enterKeyHint="send"
                />
                {isRepeat && <p className="pt-1 text-xs text-subscribe">Этот вариант уже был</p>}
                {badCharTyped && <p className="pt-1 text-xs text-subscribe">Только русские буквы, без цифр, пробелов и символов</p>}
                <div className="flex justify-end gap-2 pt-2">
                  {guess && (
                    <button
                      type="button"
                      onClick={() => changeGuess("")}
                      className="h-9 px-4 text-sm font-medium uppercase text-muted hover:text-foreground"
                    >
                      Отмена
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={locked || isRepeat || !guess.trim()}
                    className="h-9 rounded-[2px] bg-link px-4 text-sm font-medium uppercase text-white disabled:bg-[#ececec] disabled:text-[#909090]"
                  >
                    Ответить
                  </button>
                </div>
              </div>
            </form>
          )}
          <ul className="flex flex-col gap-4">
            {attempts
              .map((a, i) => ({ a, n: i + 1 }))
              .reverse()
              .map(({ a, n }) => {
                const correct = result?.won && n === attempts.length;
                return (
                  <li key={n} className="flex gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/vsevolodi4.jpg" alt="" className="size-10 shrink-0 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">
                        Вы <span className="font-normal text-muted">попытка #{n}</span>
                      </p>
                      <p className="text-sm">{a.text}</p>
                      <p className="flex items-center gap-1 pt-1 text-xs text-muted">
                        {correct ? (
                          <>
                            <Icon d={ICONS.heart} className="size-4 text-yt-red" /> Угадано!
                          </>
                        ) : (
                          `мимо • −${a.previews} респект${plural(a.previews, ["", "а", "ов"])}`
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>

        {/* левая колонка на месте ютубовского меню — реклама */}
        <Ads
          ads={ADS}
          className="hidden w-[200px] justify-self-center 2xl:col-start-1 2xl:row-span-2 2xl:row-start-1 2xl:block"
          columns="grid-cols-1"
          textSize="text-[13px]"
        />

        {/* «рекомендации» — превью раунда */}
        <aside className="flex flex-col gap-2 px-3 sm:px-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 2xl:col-start-3">
          <p className="text-base font-medium">Превью по этому слову</p>
          {Array.from({ length: available }, (_, i) => {
            const isOpen = i < visible;
            const isNext = i === visible && canOpenMore;
            return (
              <button
                key={i}
                disabled={!isOpen && !isNext}
                onClick={() => (isOpen ? setCurrent(i) : openNext())}
                className={`flex gap-2 rounded-[2px] text-left ${i === current ? "bg-line" : "hover:bg-[#f0f0f0]"}`}
              >
                <span className="relative flex aspect-video w-[168px] shrink-0 items-center justify-center overflow-hidden bg-[#e5e5e5] text-muted">
                  {isOpen ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={round!.thumbs[i]} alt="" className="size-full object-cover" />
                  ) : (
                    <Icon d={ICONS.lock} className="size-6" />
                  )}
                  <span className="absolute bottom-1 right-1 rounded-[2px] bg-black/80 px-1 text-xs font-medium text-white">
                    {i + 1}/{available}
                  </span>
                </span>
                <span className="flex min-w-0 flex-col py-0.5">
                  <span className="line-clamp-2 text-sm font-medium leading-5">
                    {isOpen ? titles[i] : isNext ? "Открыть ещё превью" : "Превью закрыто"}
                  </span>
                  <span className="pt-1 text-[13px] text-muted">
                    {isOpen ? (i === current ? "Сейчас смотрите" : "Открыто") : isNext ? "Нажмите, чтобы открыть" : "Закрыто"}
                  </span>
                </span>
              </button>
            );
          })}

          {/* на очень широких экранах (2xl) основная реклама уезжает в левую колонку, здесь остаётся только своя */}
          <Ads ads={[...ADS, ...SIDE_ADS]} className="mt-4 2xl:hidden" columns="grid-cols-2" textSize="text-[15px]" />
          <Ads ads={SIDE_ADS} className="mt-4 hidden 2xl:block" columns="grid-cols-2" textSize="text-[15px]" />
        </aside>

      </main>

      {/* итог раунда — окно в духе рекламы из рунета 2010-х */}
      {result && round && showModal && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Итог раунда"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[440px] border border-[#8fb3d9] bg-[linear-gradient(#eef5fd,#c3daf2)] p-2 pt-5 text-[#1f3fbf] shadow-[0_6px_30px_rgba(0,0,0,0.4)] [font-family:Arial,Helvetica,sans-serif]"
          >
            <span className="absolute left-2 top-1 text-[10px] text-[#7a8ca3]">реклама</span>
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-2 top-0.5 text-sm text-[#7a8ca3] hover:text-black"
              aria-label="Закрыть"
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              {/* mqdefault — 16:9 без чёрных полос, которые бывают у hqdefault */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://i.ytimg.com/vi/${result.ids[current]}/mqdefault.jpg`}
                alt=""
                className="aspect-[4/5] w-[44%] shrink-0 border-2 border-white object-fill shadow-md"
              />
              <div className="flex flex-1 flex-col items-center gap-1 text-center leading-tight">
                {result.won ? (
                  <>
                    <p className="text-[20px] font-bold">Угадал слово «{result.word}»</p>
                    <p className="text-[17px] font-bold">с {attempts.length}-й попытки!</p>
                  </>
                ) : (
                  <>
                    <p className="text-[17px] font-bold">Загадано было</p>
                    <p className="text-[22px] font-bold uppercase">«{result.word}»</p>
                  </>
                )}
                <p className="pt-1 text-[15px] text-[#1a1a6e]">
                  Открыто превью: <b>{opened}</b> из {available}
                </p>
                <p className="text-[15px] text-[#1a1a6e]">
                  {result.won ? "Попыток" : "Попыток потрачено"}: <b>{attempts.length}</b>
                </p>
                {result.won && (
                  <p className="pt-1 text-[17px] font-bold">
                    RESPECT:{" "}
                    <span className={respect(attempts, true) < 0 ? "text-[#cc0000]" : ""}>
                      {respect(attempts, true)}
                    </span>
                  </p>
                )}
                <p className="pt-1 text-[15px] text-[#1a1a6e]">
                  Хочешь поиграть <b>ЕЩЕ</b>?
                </p>
                <button onClick={startRound} className="text-[18px] font-bold underline-offset-2 hover:underline">
                  ЖМИ....
                </button>
              </div>
            </div>
            {!showRest && opened < available && (
              <button
                onClick={revealRest}
                className="mt-2 block w-full text-right text-xs text-[#1f3fbf] underline hover:no-underline"
              >
                Посмотреть остальные превью »
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
