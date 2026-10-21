"use client";

import { useEffect, useRef, useState } from "react";
import Ads, { ADS, SIDE_ADS } from "@/components/Ads";
import Avatar from "@/components/Avatar";
import Clip from "@/components/Clip";
import DifficultyDialog from "@/components/DifficultyDialog";
import GoldenWin from "@/components/GoldenWin";
import Header from "@/components/Header";
import Icon, { ICONS } from "@/components/Icon";
import Letters from "@/components/Letters";
import { ClipButton, VolumeControl } from "@/components/PlayerButtons";
import ProfileForm, { type Profile } from "@/components/ProfileForm";
import { DIFFICULTY_LABELS, HINT_COST, type Difficulty } from "@/lib/difficulty";
import { plural } from "@/lib/plural";
import type { RoomView } from "@/lib/rooms";
import { PING_MS, POLL_HIDDEN_MS, POLL_MS } from "@/lib/roomTiming";
import { siteUrl } from "@/lib/site";
import { useMounted } from "@/lib/useMounted";
import { clearSession, loadSession, saveSession, type Session } from "../session";
import Chat, { type Mode } from "./Chat";
import ProfileCard, { type ProfileTarget } from "./ProfileCard";

type Player = RoomView["players"][number];

const respectLabel = (n: number) => `${n} респект${plural(n, ["", "а", "ов"])}`;

function Badge({ code }: { code: string }) {
  return (
    <span className="whitespace-nowrap rounded-[2px] bg-line px-2 py-1 text-[13px] text-muted">
      Сервер <b className="font-medium tracking-wider text-foreground">{code}</b>
    </span>
  );
}

/** Сессия игрока живёт в sessionStorage — её можно прочитать только в браузере. */
export default function Room({ code, avatars }: { code: string; avatars: string[] }) {
  if (!useMounted()) return <Header />;
  return <RoomGate code={code} avatars={avatars} />;
}

/** Пока не выбрал ник и аватарку — форма входа, потом игра. */
function RoomGate({ code, avatars }: { code: string; avatars: string[] }) {
  const [session, setSession] = useState(() => loadSession(code));
  const [kicked, setKicked] = useState("");
  // состояние сразу из ответа на вход — не ждём первого опроса
  const [initial, setInitial] = useState<RoomView | undefined>();

  async function join(profile: Profile) {
    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) return data.error as string;
      const s = { player: data.player, key: data.key };
      saveSession(code, s);
      setKicked("");
      setInitial(data.view);
      setSession(s);
    } catch {
      return "Не удалось подключиться";
    }
  }

  if (session) {
    return (
      <Game
        code={code}
        session={session}
        initial={initial}
        onKicked={(reason) => {
          clearSession(code);
          setSession(null);
          setKicked(reason);
        }}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header>
        <Badge code={code} />
      </Header>
      <main className="w-full px-3 py-6 sm:py-10">
        {kicked && <p className="mx-auto max-w-[440px] pb-3 text-sm text-subscribe">{kicked}</p>}
        <ProfileForm
          avatars={avatars}
          title={
            <>
              Вход на сервер <b className="font-medium tracking-wider">{code}</b>
            </>
          }
          action="Войти"
          onSubmit={join}
        />
      </main>
    </div>
  );
}

function Game({
  code,
  session,
  initial,
  onKicked,
}: {
  code: string;
  session: Session;
  initial?: RoomView;
  onKicked: (reason: string) => void;
}) {
  const [view, setView] = useState<RoomView | null>(initial ?? null);
  // версия последнего принятого состояния: опрос может принести из кэша CDN более старое — его пропускаем
  const versionRef = useRef(initial?.v ?? 0);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [showRest, setShowRest] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState("");
  const [profile, setProfile] = useState<ProfileTarget | null>(null);
  // лёгкий: какой фрагмент видео играет; хост открыл окно смены сложности
  const [clip, setClip] = useState<{ index: number; id: string } | null>(null);
  const [changingDifficulty, setChangingDifficulty] = useState(false);
  /** Свежее состояние с сервера: из опроса, отметки или ответа на своё действие. */
  function accept(next: RoomView) {
    if (next.v < versionRef.current) return;
    versionRef.current = next.v;
    // сервер убрал нас из комнаты — например, долго не было связи
    if (!next.players.some((p) => p.id === session.player)) {
      onKicked("Тебя нет на этом сервере — долго не было связи");
      return;
    }
    setView(next);
  }

  const kickedRef = useRef(onKicked);
  const acceptRef = useRef(accept);
  useEffect(() => {
    kickedRef.current = onKicked;
    acceptRef.current = accept;
  });

  // Новости — опросом: состояние раз в POLL_MS (его кэширует CDN, одно на всех игроков),
  // а раз в PING_MS отмечаемся, что мы ещё тут, — иначе сервер решит, что мы ушли
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/rooms/${code}/state`, { cache: "no-store" });
        if (res.status === 404) return kickedRef.current((await res.json()).error);
        if (!res.ok) throw new Error(String(res.status));
        setOffline(false);
        acceptRef.current(await res.json());
      } catch {
        setOffline(true);
      }
      // вкладка в фоне — спрашиваем реже, это экономит запросы к CDN
      if (!stopped) timer = setTimeout(poll, document.hidden ? POLL_HIDDEN_MS : POLL_MS);
    }

    async function ping() {
      try {
        const res = await fetch(`/api/rooms/${code}/ping`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(session),
        });
        if (res.status === 403 || res.status === 404) return kickedRef.current((await res.json()).error);
        if (res.ok) acceptRef.current(await res.json());
      } catch {}
    }

    void poll();
    void ping();
    const pinger = setInterval(ping, PING_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(pinger);
    };
  }, [code, session]);

  // окно итога закрывается по Esc
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShowModal(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal]);

  const round = view?.round ?? null;

  // хост открыл ещё превью или начался новый раунд — всем показываем свежее превью;
  // кто-то угадал — всплывает итог
  const roundKey = round ? `${round.n}:${round.opened}:${round.finished}` : "";
  const [seenKey, setSeenKey] = useState(roundKey);
  if (seenKey !== roundKey) {
    const [prevN, prevOpened] = seenKey.split(":").map(Number);
    setSeenKey(roundKey);
    if (round && (round.n !== prevN || round.opened !== prevOpened)) {
      setCurrent(round.opened - 1);
      setClip(null);
    }
    if (round && round.n !== prevN) setShowRest(false);
    // итог — когда кто-то угадал или все сдались; пропуск хостом окно не показывает
    setShowModal(!!round?.finished && (!!round.winner || round.gaveUp) && seenKey !== "");
  }

  /** Действие на сервере; возвращает текст ошибки, если не вышло. */
  async function request(body: object): Promise<string | void> {
    try {
      const res = await fetch(`/api/rooms/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...session, ...body }),
      });
      const data = await res.json();
      if (!res.ok) return data.error;
      // ответ — уже свежее состояние: своё действие видно сразу, не дожидаясь опроса
      accept(data);
    } catch {
      return "Нет связи с сервером";
    }
  }

  async function act(body: object) {
    setError("");
    const err = await request(body);
    if (err) setError(err);
  }

  function revealRest() {
    setShowModal(false);
    setShowRest(true);
    showPreview(round!.opened);
  }

  /** Переключиться на превью i; играющий фрагмент другого видео останавливаем. */
  function showPreview(i: number) {
    setCurrent(i);
    setClip(null);
  }

  /** Лёгкий: первые секунды ролика текущего превью; повторное нажатие — стоп. */
  function toggleClip() {
    if (clip) return setClip(null);
    const id = round?.ids?.[current];
    if (id) setClip({ index: current, id });
  }

  function changeDifficulty(difficulty: Difficulty) {
    setChangingDifficulty(false);
    if (difficulty !== view?.difficulty) act({ type: "difficulty", difficulty });
  }

  function newRound() {
    setShowModal(false);
    act({ type: "round" });
  }

  async function copy(value: string, what: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
    } catch {
      setCopied("fail");
    }
    setTimeout(() => setCopied(""), 1500);
  }

  if (!view) {
    return (
      <div className="flex flex-1 flex-col">
        <Header>
          <Badge code={code} />
        </Header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted">
          <span className="size-10 animate-spin rounded-full border-4 border-line border-t-muted" />
          Подключаюсь к серверу…
        </div>
      </div>
    );
  }

  const isHost = view.hostId === session.player;
  const players = new Map(view.players.map((p) => [p.id, p]));
  const host = players.get(view.hostId);
  const me = players.get(session.player);
  const available = round?.available ?? 0;
  const visible = round ? (showRest ? round.thumbs.length : round.opened) : 0;
  const active = !!round && !round.finished;
  const canOpenMore = isHost && active && round.opened < available;
  const titles = round?.titles ?? [];
  const easy = round?.difficulty === "easy";
  // в сложном названий нет до конца раунда
  const titleOf = (i: number) => (round?.difficulty === "hard" && active ? "Название скрыто" : (titles[i] ?? ""));
  const canHint = isHost && active && easy && (round.letters?.filter((l) => l === null).length ?? 0) > 1;
  const winner = round?.winner ? players.get(round.winner) : undefined;
  const winMessage = view.chat.find((m) => m.kind === "win" && m.round === round?.n);
  const vote = active ? round.vote : null;
  const myVote = vote?.yes.includes(session.player) ? "yes" : vote?.no.includes(session.player) ? "no" : null;
  const link = `${siteUrl()}/room/${code}`;
  const roundButton = view.loading ? "Ищу видео…" : !round ? "Начать игру" : active ? "Пропустить" : "Ещё раунд";

  return (
    <div className="flex flex-1 flex-col">
      <Header>
        <Badge code={code} />
      </Header>

      {offline && (
        <p className="bg-warn-bg px-4 py-2 text-center text-[13px] text-warn-fg">Связь потеряна, переподключаюсь…</p>
      )}

      <main className="mx-auto grid w-full max-w-[1280px] gap-6 py-0 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_402px] lg:grid-rows-[auto_1fr] 2xl:max-w-none 2xl:grid-cols-[minmax(200px,1fr)_minmax(0,1100px)_402px]">
        {/* плеер + описание */}
        <section className="min-w-0 lg:col-start-1 lg:row-start-1 2xl:col-start-2">
          <div className="relative aspect-video w-full overflow-hidden bg-player">
            {clip && !view.loading ? (
              <Clip key={clip.id} id={clip.id} onEnd={() => setClip(null)} />
            ) : round && !view.loading ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={round.thumbs[current]}
                src={round.thumbs[current]}
                alt={`Превью ${current + 1}`}
                className="size-full object-contain"
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-3 px-4 text-center text-sm text-[#aaa]">
                {view.loading && <span className="size-10 animate-spin rounded-full border-4 border-[#444] border-t-[#ddd]" />}
                {view.loading
                  ? "Ищу видео…"
                  : view.error ||
                    (isHost ? "Скинь друзьям ссылку или код и жми «Начать игру»" : "Ждём, пока хост начнёт игру")}
                {isHost && !view.loading && !round && (
                  <button
                    onClick={newRound}
                    className="mt-2 h-9 rounded-[2px] bg-subscribe px-4 text-sm font-medium uppercase tracking-wide text-white hover:bg-[#b80000]"
                  >
                    Начать игру
                  </button>
                )}
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
                <ClipButton enabled={easy && !!round?.ids?.[current]} playing={!!clip} loading={false} onClick={toggleClip} />
                <button
                  onClick={() => act({ type: "next" })}
                  disabled={!canOpenMore}
                  className="disabled:opacity-40"
                  aria-label="Ещё превью"
                  title={isHost ? "Ещё превью" : "Превью открывает хост"}
                >
                  <Icon d={ICONS.next} className="size-6" />
                </button>
                <VolumeControl enabled={easy} />
                <span className="text-[13px]">{round ? `${current + 1} / ${available}` : "0 / 0"}</span>
              </div>
            </div>
          </div>

          <div className="px-3 pt-3 sm:px-0 sm:pt-4">
            <p className="text-[13px] text-link">#мультиплеер #сервер{code} #респект</p>
            <h1 className={`pt-1 text-lg leading-snug sm:text-xl ${round?.difficulty === "hard" && active ? "text-muted" : ""}`}>
              {round ? titleOf(current) : `Сервер ${code}`}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-2 pt-2">
              <p className="text-sm text-muted">
                {round
                  ? `Раунд ${round.n} • открыто превью: ${round.opened} из ${available}${easy ? ` • подсказок: ${round.hints}` : ""}`
                  : "Игра ещё не началась"}
              </p>
              <div className="-mx-2 flex flex-wrap items-center text-sm font-medium uppercase text-foreground">
                {isHost ? (
                  <button
                    onClick={() => act({ type: "next" })}
                    disabled={!canOpenMore}
                    className="flex items-center gap-1.5 whitespace-nowrap px-2 py-1.5 uppercase disabled:text-muted"
                  >
                    <Icon d={ICONS.like} className="size-5 text-muted" />
                    Ещё превью
                  </button>
                ) : (
                  <span className="px-2 py-1.5 text-[13px] font-normal normal-case text-muted">
                    Превью открывает хост
                  </span>
                )}
                {isHost && easy && (
                  <button
                    onClick={() => act({ type: "hint" })}
                    disabled={!canHint}
                    className="flex items-center gap-1.5 whitespace-nowrap px-2 py-1.5 uppercase disabled:text-muted"
                    title={`Открыть случайную букву: приз у всех −${HINT_COST} респекта`}
                  >
                    <Icon d={ICONS.help} className="size-5 text-muted" />
                    Подсказка −{HINT_COST}
                  </button>
                )}
                {isHost && (
                  <button
                    onClick={() => act({ type: "giveup" })}
                    disabled={!active || !!vote}
                    className="flex items-center gap-1.5 whitespace-nowrap px-2 py-1.5 uppercase disabled:text-muted"
                    title="Сдадимся, если согласится больше половины игроков"
                  >
                    <Icon d={ICONS.dislike} className="size-5 text-muted" />
                    Сдаюсь
                  </button>
                )}
                {round?.finished && round.ids && (
                  <a
                    href={`https://www.youtube.com/watch?v=${round.ids[current]}`}
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

            {error && <p className="pt-2 text-xs text-subscribe">{error}</p>}

            {/* хост предложил сдаться — голосуют все */}
            {vote && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 bg-warn-bg px-4 py-3 text-sm text-warn-fg">
                <p className="min-w-0 flex-1">
                  <b>{host?.name}</b> предлагает сдаться. За: {vote.yes.length}, нужно {vote.need} из{" "}
                  {view.players.length}
                </p>
                {myVote && <span className="text-[13px]">{myVote === "yes" ? "Ты за" : "Ты против"}</span>}
                {myVote !== "yes" && (
                  <button
                    onClick={() => act({ type: "vote", yes: true })}
                    className="h-8 rounded-[2px] bg-subscribe px-3 text-[13px] font-medium uppercase text-white hover:bg-[#b80000]"
                  >
                    Сдаёмся
                  </button>
                )}
                {myVote !== "no" && !isHost && (
                  <button
                    onClick={() => act({ type: "vote", yes: false })}
                    className="h-8 rounded-[2px] border border-warn-line px-3 text-[13px] font-medium uppercase hover:bg-warn-hover"
                  >
                    Играем дальше
                  </button>
                )}
              </div>
            )}

            {/* строка «канала» — хост сервера */}
            <div className="flex gap-3 border-b border-line py-4">
              <button onClick={() => host && setProfile(host)} className="self-start" aria-label={`Профиль ${host?.name}`}>
                <Avatar id={host?.avatar ?? ""} />
              </button>
              <div className="min-w-0 flex-1">
                <button onClick={() => host && setProfile(host)} className="block max-w-full truncate text-sm font-medium hover:underline">
                  {host?.name}
                </button>
                <p className="text-xs text-muted">
                  Хост сервера • {view.players.length} {plural(view.players.length, ["игрок", "игрока", "игроков"])}
                </p>
                {round?.finished && round.word && (
                  <p className="pt-2 text-sm">
                    Было загадано: <b>«{round.word}»</b>
                    {winner && <> — угадал(а) {winner.name}</>}
                  </p>
                )}
                {round?.finished && !showRest && round.opened < available && (
                  <button
                    onClick={revealRest}
                    className="pt-3 text-[13px] font-medium uppercase text-muted hover:text-foreground"
                  >
                    Показать остальные
                  </button>
                )}
              </div>
              {isHost && (
                <button
                  onClick={newRound}
                  disabled={view.loading}
                  className="h-9 shrink-0 self-start rounded-[2px] bg-subscribe px-4 text-sm font-medium uppercase tracking-wide text-white hover:bg-[#b80000] disabled:opacity-60"
                >
                  {roundButton}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* «комментарии» — общий чат, он же поле для ответов */}
        <section className="px-3 pb-8 sm:px-0 lg:col-start-1 lg:row-start-2 2xl:col-start-2">
          {/* лёгкий: клеточки по буквам над комментариями, хост открывает их подсказками */}
          {easy && round.letters && <Letters letters={round.letters} className="pb-6" />}
          <Chat
            chat={view.chat}
            round={active ? round.n : null}
            hostId={view.hostId}
            me={session.player}
            myAvatar={me?.avatar ?? ""}
            onProfile={setProfile}
            onSend={(text: string, mode: Mode) => request({ type: "chat", mode, text })}
          />
        </section>

        {/* левая колонка на месте ютубовского меню — реклама */}
        <Ads
          ads={ADS}
          className="hidden w-[200px] justify-self-center 2xl:col-start-1 2xl:row-span-2 2xl:row-start-1 2xl:block"
          columns="grid-cols-1"
          textSize="text-[13px]"
        />

        <aside className="flex flex-col gap-4 px-3 sm:px-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 2xl:col-start-3">
          <Rating
            players={view.players}
            hostId={view.hostId}
            me={session.player}
            difficulty={view.difficulty}
            onChangeDifficulty={isHost ? () => setChangingDifficulty(true) : undefined}
            onProfile={setProfile}
          />

          {/* приглашение */}
          <div className="bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
            <p className="pb-3 text-base font-medium">Позвать друзей</p>
            <div className="flex items-center gap-2 pb-2">
              <span className="flex-1 text-2xl font-medium tracking-[0.2em]">{code}</span>
              <button
                onClick={() => copy(code, "code")}
                className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium uppercase text-link"
              >
                <Icon d={ICONS.copy} className="size-4" />
                {copied === "code" ? "Готово" : "Код"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={link}
                onFocus={(e) => e.target.select()}
                className="h-8 min-w-0 flex-1 rounded-[2px] border border-field-line px-2 text-[13px] text-muted outline-none"
                aria-label="Ссылка на сервер"
              />
              <button
                onClick={() => copy(link, "link")}
                className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium uppercase text-link"
              >
                <Icon d={ICONS.copy} className="size-4" />
                {copied === "link" ? "Готово" : "Ссылка"}
              </button>
            </div>
            {copied === "fail" && <p className="pt-2 text-xs text-subscribe">Не вышло — выдели и скопируй вручную</p>}
          </div>

          {/* «рекомендации» — превью раунда */}
          {round && (
            <div className="flex flex-col gap-2">
              <p className="text-base font-medium">Превью по этому слову</p>
              {Array.from({ length: available }, (_, i) => {
                const isOpen = i < visible;
                const isNext = i === visible && canOpenMore;
                return (
                  <button
                    key={i}
                    disabled={!isOpen && !isNext}
                    onClick={() => (isOpen ? showPreview(i) : act({ type: "next" }))}
                    className={`flex gap-2 rounded-[2px] text-left ${i === current ? "bg-line" : "hover:bg-hover"}`}
                  >
                    <span className="relative flex aspect-video w-[168px] shrink-0 items-center justify-center overflow-hidden bg-line text-muted">
                      {isOpen ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={round.thumbs[i]} alt="" className="size-full object-cover" />
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
                        {isOpen
                          ? i === current
                            ? "Сейчас смотрите"
                            : "Открыто"
                          : isNext
                            ? "Нажмите, чтобы открыть"
                            : isHost
                              ? "Закрыто"
                              : "Откроет хост"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* на очень широких экранах (2xl) основная реклама уезжает в левую колонку, здесь остаётся только своя */}
          <Ads ads={[...ADS, ...SIDE_ADS]} className="mt-2 2xl:hidden" columns="grid-cols-2" textSize="text-[15px]" />
          <Ads ads={SIDE_ADS} className="mt-2 hidden 2xl:block" columns="grid-cols-2" textSize="text-[15px]" />
        </aside>
      </main>

      {changingDifficulty && (
        <DifficultyDialog
          title="Сложность сервера"
          initial={view.difficulty}
          action="Сменить"
          note={`Респект у всех игроков обнулится${active ? ", а идущий раунд прервётся" : ""}`}
          onConfirm={changeDifficulty}
          onCancel={() => setChangingDifficulty(false)}
        />
      )}

      {profile && (
        <ProfileCard
          target={profile}
          players={view.players}
          hostId={view.hostId}
          me={session.player}
          onClose={() => setProfile(null)}
        />
      )}

      {/* итог раунда — окно в духе рекламы из рунета 2010-х */}
      {/* кто-то угадал с первой попытки — праздник для всех */}
      {showModal && round?.finished && winner && winMessage?.firstTry && (
        <GoldenWin
          title={winner.id === session.player ? "ЕБАТЬ ТЫ КРАСАВА." : `ЕБАТЬ ${winner.name} КРАСАВА.`}
          subtitle="ПРОСТО УМНИЧКА ЕБАНЫЙ"
          word={round.word ?? ""}
          respect={winMessage.respect}
          onClose={() => setShowModal(false)}
        >
          {isHost ? (
            <button onClick={newRound} className="text-[18px] font-bold underline-offset-2 hover:underline">
              ХОЧЕШЬ ЕЩЁ? ЖМИ....
            </button>
          ) : (
            <p className="text-[15px]">Ждём, пока хост запустит новый раунд</p>
          )}
          {!showRest && round.opened < available && (
            <button onClick={revealRest} className="mt-1 block w-full text-xs underline hover:no-underline">
              Посмотреть остальные превью »
            </button>
          )}
        </GoldenWin>
      )}

      {showModal && round?.finished && (winner || round.gaveUp) && !winMessage?.firstTry && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
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
              {round.ids && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://i.ytimg.com/vi/${round.ids[current]}/mqdefault.jpg`}
                  alt=""
                  className="aspect-[4/5] w-[44%] shrink-0 border-2 border-white object-fill shadow-md"
                />
              )}
              <div className="flex flex-1 flex-col items-center gap-1 text-center leading-tight">
                {winner ? (
                  <>
                    <Avatar id={winner.avatar} className="size-12" />
                    <p className="text-[20px] font-bold">
                      {winner.id === session.player ? "ТЫ угадал" : `${winner.name} угадал(а)`} слово «{round.word}»
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[17px] font-bold">Загадано было</p>
                    <p className="text-[22px] font-bold uppercase">«{round.word}»</p>
                  </>
                )}
                <p className="pt-1 text-[15px] text-[#1a1a6e]">
                  Открыто превью: <b>{round.opened}</b> из {available}
                </p>
                {winner && winMessage?.respect && (
                  <p className="pt-1 text-[17px] font-bold">+{winMessage.respect} RESPECT</p>
                )}
                {isHost ? (
                  <>
                    <p className="pt-1 text-[15px] text-[#1a1a6e]">
                      Хочешь поиграть <b>ЕЩЕ</b>?
                    </p>
                    <button onClick={newRound} className="text-[18px] font-bold underline-offset-2 hover:underline">
                      ЖМИ....
                    </button>
                  </>
                ) : (
                  <p className="pt-1 text-[15px] text-[#1a1a6e]">Ждём, пока хост запустит новый раунд</p>
                )}
              </div>
            </div>
            {!showRest && round.opened < available && (
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

/** Отдельный виджет: кто сколько респекта набрал на этом сервере. */
function Rating({
  players,
  hostId,
  me,
  difficulty,
  onChangeDifficulty,
  onProfile,
}: {
  players: Player[];
  hostId: string;
  me: string;
  difficulty: Difficulty;
  onChangeDifficulty?: () => void; // есть только у хоста
  onProfile: (p: Player) => void;
}) {
  const sorted = players.slice().sort((a, b) => b.respect - a.respect);
  return (
    <div className="bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
      <div className="flex items-center gap-2 pb-3">
        <p className="text-base font-medium">Рейтинг</p>
        <span className="rounded-full bg-line px-2 py-0.5 text-xs font-medium">{DIFFICULTY_LABELS[difficulty]}</span>
        {onChangeDifficulty && (
          <button onClick={onChangeDifficulty} className="ml-auto text-[13px] font-medium uppercase text-link">
            Сменить
          </button>
        )}
      </div>
      <ol className="flex flex-col gap-3">
        {sorted.map((p, i) => (
          <li key={p.id} className={`flex items-center gap-3 ${p.online ? "" : "opacity-50"}`}>
            <span className="w-5 text-right text-sm font-medium text-muted">{i + 1}</span>
            <button onClick={() => onProfile(p)} aria-label={`Профиль ${p.name}`}>
              <Avatar id={p.avatar} className="size-8" />
            </button>
            <span className="flex min-w-0 flex-1 items-center gap-1 text-sm">
              <button onClick={() => onProfile(p)} className="min-w-0 truncate hover:underline">
                {p.name}
              </button>
              {p.id === me && <span className="shrink-0 text-muted">(вы)</span>}
              {p.id === hostId && (
                <span title="Хост">
                  <Icon d={ICONS.crown} className="size-4 shrink-0 text-[#f4b400]" />
                </span>
              )}
              {!p.online && <span className="shrink-0 text-xs text-muted">не в сети</span>}
            </span>
            <span className="text-sm font-bold" title={respectLabel(p.respect)}>
              {p.respect}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
