"use client";

import { useEffect, useRef, useState } from "react";
import Ads, { ADS, SIDE_ADS } from "@/components/Ads";
import CheatToast from "@/components/CheatToast";
import Clip from "@/components/Clip";
import DifficultyDialog from "@/components/DifficultyDialog";
import Icon, { ICONS } from "@/components/Icon";
import GoldenWin from "@/components/GoldenWin";
import Letters from "@/components/Letters";
import Logo from "@/components/Logo";
import { ClipButton, VolumeControl } from "@/components/PlayerButtons";
import SearchBar from "@/components/SearchBar";
import SidebarButton from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { getPack, PACK_LABELS, setPack, usePack } from "@/lib/cheats";
import { DIFFICULTY_LABELS, HINT_COST, type Difficulty } from "@/lib/difficulty";
import type { Pack } from "@/lib/packs";
import { plural } from "@/lib/plural";

const MAX_PREVIEWS = 5;

// pattern — только в лёгком: «_» на каждую букву, дефис как есть; в сложном titles пустой
type Round = { token: string; thumbs: string[]; titles: string[]; pattern?: string; difficulty: Difficulty };
type Result = { word: string; titles: string[]; ids: string[]; won: boolean };

// только русские буквы; дефис — ради «баба-яга»
const FORBIDDEN_RE = /[^а-яё-]/gi;

/** Как сервер сравнивает ответ: без регистра, лишних пробелов и разницы ё/е. */
function normalize(s: string): string {
  return s.trim().toLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ");
}

const attemptsLabel = (n: number) => `${n} ${plural(n, ["попытка", "попытки", "попыток"])}`;

/** Попытка и сколько превью было открыто, когда её сделали. */
type Attempt = { text: string; previews: number };

const MAX_RESPECT = 100;

/** Сколько респекта ушло на открытие первых n превью: 2 + 3 + … + n. */
const openedCost = (n: number) => (n * (n + 1)) / 2 - 1;

/**
 * Каждое новое превью стоит своего номера — чтобы нельзя было открыть все и угадать «с первой».
 * Каждая мимо отнимает столько респекта, сколько превью было открыто в момент ответа.
 * Угадавшая попытка бесплатная — иначе 100 было бы недостижимо. Каждая открытая буква (лёгкий) — HINT_COST.
 * Может уйти в минус.
 */
function respect(attempts: Attempt[], won: boolean, opened: number, hints: number): number {
  const misses = won ? attempts.slice(0, -1) : attempts;
  return MAX_RESPECT - openedCost(opened) - misses.reduce((sum, a) => sum + a.previews, 0) - hints * HINT_COST;
}

const TOAST_MS = 4000;

async function post(url: string, body: object) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

/** Новый раунд или текст ошибки. pack — тематический набор слов от читкода. */
async function fetchRound(pack: Pack | null, difficulty: Difficulty): Promise<Round | string> {
  try {
    const res = await fetch("/api/round", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pack, difficulty }),
    });
    const data = await res.json();
    return res.ok ? { ...data, difficulty } : data.error;
  } catch {
    return "Не удалось загрузить раунд";
  }
}

export default function Game() {
  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(false);
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
  const [toast, setToast] = useState<{ title: string; text: string } | null>(null);
  // счёт и сложность за сессию: живут только в памяти, обновил страницу — выбираешь режим и считаешь заново
  const [session, setSession] = useState({ rounds: 0, respect: 0 });
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  // лёгкий: открытые подсказками буквы (null — ещё закрыта) и фрагмент видео, который сейчас играет
  const [letters, setLetters] = useState<(string | null)[]>([]);
  const [hintBusy, setHintBusy] = useState(false);
  const [clip, setClip] = useState<{ index: number; id: string } | null>(null);
  const [clipLoading, setClipLoading] = useState(false);
  const clipIds = useRef<Record<number, string>>({});
  const pack = usePack();

  function applyRound(loaded: Round | string) {
    if (typeof loaded === "string") setError(loaded);
    else {
      setRound(loaded);
      setLetters(Array.from(loaded.pattern ?? "", (c) => (c === "-" ? "-" : null)));
    }
    setLoading(false);
  }

  function startRound(d = difficulty) {
    if (!d) return;
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
    setLetters([]);
    setClip(null);
    clipIds.current = {};
    // из хранилища, а не из usePack: после смены чита раунд стартует в том же обработчике
    fetchRound(getPack(), d).then(applyRound);
  }

  /** Режим выбирается один раз за сессию — и сразу первый раунд. */
  function chooseDifficulty(d: Difficulty) {
    setDifficulty(d);
    startRound(d);
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  /** Ввели читкод в поиск: показываем «достижение» и сразу начинаем раунд с новым набором слов. */
  function cheat(p: Pack, enabled: boolean) {
    setToast(
      enabled
        ? { title: "Достижение получено!", text: `Чит ${PACK_LABELS[p]}: теперь все слова оттуда` }
        : { title: "Чит выключен", text: "Снова загадываются все слова" },
    );
    startRound();
  }

  function disableCheat() {
    setPack(null);
    setToast({ title: "Чит выключен", text: "Снова загадываются все слова" });
    startRound();
  }

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

  const check = (body: object) => post("/api/guess", { token: round!.token, ...body });

  /** Лёгкий: открыть случайную ещё закрытую букву. Последнюю не открываем — слово угадывает игрок. */
  async function hint() {
    if (!round || !canHint || hintBusy) return;
    const closed = letters.flatMap((l, i) => (l === null ? [i] : []));
    const pos = closed[Math.floor(Math.random() * closed.length)];
    setHintBusy(true);
    try {
      const { letter } = await post("/api/round/hint", { token: round.token, pos });
      setLetters((ls) => ls.map((l, i) => (i === pos ? letter : l)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setHintBusy(false);
    }
  }

  /** Лёгкий: первые секунды ролика текущего превью; повторное нажатие — стоп. */
  async function toggleClip() {
    if (!round || clipLoading) return;
    if (clip) return setClip(null);
    const index = current;
    setClipLoading(true);
    try {
      const id =
        result?.ids[index] ?? clipIds.current[index] ?? (await post("/api/round/clip", { token: round.token, index })).id;
      clipIds.current[index] = id;
      setClip({ index, id });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setClipLoading(false);
    }
  }

  /** Переключиться на превью i; играющий фрагмент другого видео останавливаем. */
  function showPreview(i: number) {
    setCurrent(i);
    setClip(null);
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
        addToSession(respect([...attempts, { text, previews: opened }], true, opened, hintsUsed));
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
      // сдался — раунд засчитан, но без респекта
      addToSession(0);
      setShowModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function addToSession(points: number) {
    setSession((s) => ({ rounds: s.rounds + 1, respect: s.respect + points }));
  }

  function changeGuess(value: string) {
    // латиница, цифры, пробелы и символы просто не вводятся — слово всегда одно и русское
    const cleaned = value.replace(FORBIDDEN_RE, "");
    setBadCharTyped(cleaned !== value);
    setGuess(cleaned);
  }

  function openNext() {
    showPreview(opened);
    setOpened((n) => n + 1);
  }

  function revealRest() {
    setShowModal(false);
    setShowRest(true);
    showPreview(opened);
  }

  const isRepeat = guess.trim() !== "" && attempts.some((a) => normalize(a.text) === normalize(guess));
  const available = round ? Math.min(round.thumbs.length, MAX_PREVIEWS) : 0;
  // после конца раунда можно показать и неоткрытые превью
  const visible = showRest ? available : opened;
  const canOpenMore = !!round && !result && opened < available;
  const titles = (result ?? round)?.titles ?? [];
  const locked = !!result || !round; // ответ заблокирован, пока нет раунда или он кончился
  const easy = round?.difficulty === "easy";
  const hard = round?.difficulty === "hard";
  const hintsUsed = letters.filter((l) => l !== null && l !== "-").length;
  const closedLetters = letters.filter((l) => l === null).length;
  const canHint = easy && !result && closedLetters > 1;
  // в сложном названий нет до конца раунда
  const titleOf = (i: number) => (hard && !result ? "Название скрыто" : titles[i]);
  const score = respect(attempts, !!result?.won, opened, hintsUsed);
  const firstTry = !!result?.won && attempts.length === 1;

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 bg-surface shadow-[0_1px_0_var(--line)]">
        <div className="relative mx-auto flex h-14 items-center gap-4 px-4">
          <SidebarButton />
          <Logo />
          {/* найти ничего нельзя — зато сюда вводят читкоды */}
          <SearchBar onCheat={cheat} />
          <ThemeToggle />
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
            {clip ? (
              <Clip key={clip.id} id={clip.id} onEnd={() => setClip(null)} />
            ) : round ? (
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
                {loading ? "Ищу видео…" : error || (!difficulty && "Выбери режим игры")}
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
                {/* в лёгком ▶ показывает первые секунды ролика, в остальных — перечёркнут */}
                <ClipButton enabled={easy} playing={!!clip} loading={clipLoading} onClick={toggleClip} />
                <button
                  onClick={openNext}
                  disabled={!canOpenMore}
                  className="disabled:opacity-40"
                  aria-label="Ещё превью"
                  title="Ещё превью"
                >
                  <Icon d={ICONS.next} className="size-6" />
                </button>
                <VolumeControl enabled={easy} />
                <span className="text-[13px]">{round ? `${current + 1} / ${available}` : "0 / 0"}</span>
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
            <p className="text-[13px] text-link">
              {pack === "minecraft" ? "#майнкрафт #крипер #хиробрин" : "#ютуб #лололошка #бустэр"}
            </p>
            {/* до конца раунда загаданное слово в названии закрыто */}
            <h1 className={`pt-1 text-lg leading-snug sm:text-xl ${hard && !result ? "text-muted" : ""}`}>
              {round ? titleOf(current) : "Загрузка…"}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-2 pt-2">
              <p className="text-sm text-muted">
                {attemptsLabel(attempts.length)} • открыто превью: {opened} из {available}
                {easy && <> • подсказок: {hintsUsed}</>} • респект:{" "}
                <span className={score < 0 ? "font-medium text-subscribe" : "font-medium text-foreground"}>{score}</span>
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
                {easy && (
                  <button
                    onClick={hint}
                    disabled={!canHint || hintBusy}
                    className="flex items-center gap-1.5 whitespace-nowrap px-2 py-1.5 uppercase disabled:text-muted"
                    title={`Открыть случайную букву: −${HINT_COST} респекта`}
                  >
                    <Icon d={ICONS.help} className="size-5 text-muted" />
                    Подсказка −{HINT_COST}
                  </button>
                )}
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
                {/* включён читкод — строка про него вместо подписчиков */}
                <p className="text-xs text-muted">
                  {pack ? (
                    <>
                      чит <b className="font-medium text-foreground">{PACK_LABELS[pack]}</b> •{" "}
                      <button onClick={disableCheat} className="text-link hover:underline">
                        выключить
                      </button>
                    </>
                  ) : (
                    "1 млн активных пользователей"
                  )}
                </p>
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
                onClick={() => startRound()}
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
          {/* лёгкий: клеточки по буквам над комментариями, подсказки открывают их по одной */}
          {easy && letters.length > 0 && <Letters letters={result ? Array.from(result.word) : letters} className="pb-6" />}
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
                    className="h-9 rounded-[2px] bg-link px-4 text-sm font-medium uppercase text-white disabled:bg-disabled-bg disabled:text-disabled-fg"
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
          <Score rounds={session.rounds} respect={session.respect} difficulty={difficulty} />

          <p className="pt-2 text-base font-medium">Превью по этому слову</p>
          {Array.from({ length: available }, (_, i) => {
            const isOpen = i < visible;
            const isNext = i === visible && canOpenMore;
            return (
              <button
                key={i}
                disabled={!isOpen && !isNext}
                onClick={() => (isOpen ? showPreview(i) : openNext())}
                className={`flex gap-2 rounded-[2px] text-left ${i === current ? "bg-line" : "hover:bg-hover"}`}
              >
                <span className="relative flex aspect-video w-[168px] shrink-0 items-center justify-center overflow-hidden bg-line text-muted">
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
                    {isOpen ? titleOf(i) : isNext ? "Открыть ещё превью" : "Превью закрыто"}
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

      {toast && <CheatToast key={toast.title + toast.text} title={toast.title} text={toast.text} />}

      {/* новая сессия — сначала режим; потом его не поменять, только обновив страницу */}
      {!difficulty && (
        <DifficultyDialog
          title="Выбери режим"
          initial="normal"
          action="Начать игру"
          note="Режим выбирается на всю игру — поменять его можно, только начав заново"
          onConfirm={chooseDifficulty}
        />
      )}

      {/* угадал с первой попытки — праздник */}
      {result && round && showModal && firstTry && (
        <GoldenWin
          title="ЕБАТЬ ТЫ КРАСАВА."
          subtitle="ПРОСТО УМНИЧКА ЕБАНЫЙ"
          word={result.word}
          respect={score}
          onClose={() => setShowModal(false)}
        >
          <button onClick={() => startRound()} className="text-[18px] font-bold underline-offset-2 hover:underline">
            ХОЧЕШЬ ЕЩЁ? ЖМИ....
          </button>
          {!showRest && opened < available && (
            <button onClick={revealRest} className="mt-1 block w-full text-xs underline hover:no-underline">
              Посмотреть остальные превью »
            </button>
          )}
        </GoldenWin>
      )}

      {/* итог раунда — окно в духе рекламы из рунета 2010-х */}
      {result && round && showModal && !firstTry && (
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
                    <span className={score < 0 ? "text-[#cc0000]" : ""}>{score}</span>
                  </p>
                )}
                <p className="pt-1 text-[15px] text-[#1a1a6e]">
                  Хочешь поиграть <b>ЕЩЕ</b>?
                </p>
                <button onClick={() => startRound()} className="text-[18px] font-bold underline-offset-2 hover:underline">
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

/** Счёт за сессию — в том же виде, что рейтинг в мультиплеере. */
function Score({ rounds, respect, difficulty }: { rounds: number; respect: number; difficulty: Difficulty | null }) {
  return (
    <div className="bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
      <p className="pb-3 text-base font-medium">Счёт</p>
      <ul className="flex flex-col gap-3 text-sm">
        <li className="flex items-center justify-between gap-3">
          <span>Режим</span>
          <span className="font-bold">{difficulty ? DIFFICULTY_LABELS[difficulty] : "—"}</span>
        </li>
        <li className="flex items-center justify-between gap-3">
          <span>Сыграно раундов</span>
          <span className="font-bold">{rounds}</span>
        </li>
        <li className="flex items-center justify-between gap-3">
          <span>Респект за сессию</span>
          <span className="font-bold">{respect}</span>
        </li>
      </ul>
    </div>
  );
}
