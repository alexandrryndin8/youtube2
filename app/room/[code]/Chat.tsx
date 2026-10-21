"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import Icon, { ICONS } from "@/components/Icon";
import type { RoomView } from "@/lib/rooms";
import { plural } from "@/lib/plural";

export type Mode = "guess" | "chat";
type Message = RoomView["chat"][number];

const MESSAGE_MAX = 200;
const TOAST_MS = 4000;
// в ответе только русские буквы; дефис — ради «баба-яга»
const FORBIDDEN_RE = /[^а-яё-]/gi;

const MODES: { mode: Mode; label: string }[] = [
  { mode: "guess", label: "Угадывание" },
  { mode: "chat", label: "Чат" },
];

const normalize = (s: string) => s.trim().toLowerCase().replaceAll("ё", "е");
const respectLabel = (n: number) => `${n} респект${plural(n, ["", "а", "ов"])}`;
const isGuess = (m: Message) => m.kind === "miss" || m.kind === "close" || m.kind === "win";

/**
 * «Комментарии» под видео: режим угадывания (ответы и их итог) и обычный чат.
 * Режим переключается кнопкой, как сортировка комментариев на ютубе.
 * Пока ты угадываешь, новые сообщения чата всплывают снизу уведомлением.
 */
export default function Chat({
  chat,
  round,
  hostId,
  me,
  myAvatar,
  onProfile,
  onSend,
}: {
  chat: Message[];
  round: number | null; // номер идущего раунда, null — раунд не идёт
  hostId: string;
  me: string;
  myAvatar: string;
  onProfile: (author: NonNullable<Message["author"]>) => void;
  onSend: (text: string, mode: Mode) => Promise<string | void>;
}) {
  const [mode, setMode] = useState<Mode>("guess");
  const [menuOpen, setMenuOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<Mode, string>>({ guess: "", chat: "" });
  const [badChar, setBadChar] = useState(false);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState<Message | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const text = drafts[mode];
  const locked = mode === "guess" && round === null;

  // пришли новые сообщения чужого чата, а ты в угадывании — считаем непрочитанные и показываем последнее
  const lastId = chat.at(-1)?.id ?? 0;
  const [seenId, setSeenId] = useState(lastId);
  if (seenId !== lastId) {
    setSeenId(lastId);
    const fresh = chat.filter((m) => m.id > seenId && m.kind === "chat" && m.author?.id !== me);
    if (mode === "guess" && fresh.length) {
      setUnread((n) => n + fresh.length);
      setToast(fresh.at(-1)!);
    }
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // поле растёт вместе с текстом до max-h, дальше — прокрутка внутри
  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text, mode]);

  function switchMode(next: Mode) {
    setMode(next);
    setMenuOpen(false);
    setError("");
    setBadChar(false);
    if (next === "chat") {
      setUnread(0);
      setToast(null);
    }
  }

  function change(value: string) {
    // в угадывании латиница, цифры, пробелы и символы просто не вводятся, как в одиночной игре
    const cleaned = mode === "guess" ? value.replace(FORBIDDEN_RE, "") : value;
    setBadChar(cleaned !== value);
    setError("");
    setDrafts((d) => ({ ...d, [mode]: cleaned }));
  }

  const myGuesses = chat.filter((m) => m.round === round && m.author?.id === me && isGuess(m)).map((m) => normalize(m.text));
  const isRepeat = mode === "guess" && text.trim() !== "" && myGuesses.includes(normalize(text));

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const t = text.trim();
    if (!t || locked || isRepeat) return;
    const sentMode = mode;
    setDrafts((d) => ({ ...d, [sentMode]: "" }));
    setBadChar(false);
    const err = await onSend(t, sentMode);
    if (err) {
      setError(err);
      setDrafts((d) => ({ ...d, [sentMode]: d[sentMode] || t }));
    }
  }

  const list = chat.filter((m) => m.kind === "system" || (mode === "guess" ? isGuess(m) : m.kind === "chat"));
  const count = list.filter((m) => m.kind !== "system").length;
  const countLabel =
    mode === "guess"
      ? `${count} ${plural(count, ["попытка", "попытки", "попыток"])}`
      : `${count} ${plural(count, ["сообщение", "сообщения", "сообщений"])}`;

  return (
    <>
      <div className="flex items-center gap-8 pb-6">
        <p className="text-base">{countLabel}</p>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 text-sm font-medium uppercase text-muted hover:text-foreground"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Icon d={ICONS.sort} className="size-6" />
            {MODES.find((m) => m.mode === mode)!.label}
            {unread > 0 && (
              <span className="min-w-5 rounded-full bg-yt-red px-1.5 text-center text-xs leading-5 text-white">
                {unread}
              </span>
            )}
          </button>
          {menuOpen && (
            <>
              {/* клик мимо меню закрывает его */}
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <ul
                role="menu"
                className="absolute left-0 top-full z-20 mt-1 w-[200px] bg-surface py-2 shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
              >
                {MODES.map((m) => (
                  <li key={m.mode}>
                    <button
                      role="menuitemradio"
                      aria-checked={mode === m.mode}
                      onClick={() => switchMode(m.mode)}
                      className={`flex h-12 w-full items-center justify-between px-4 text-left text-sm ${
                        mode === m.mode ? "bg-line" : "hover:bg-hover"
                      }`}
                    >
                      {m.label}
                      {m.mode === "chat" && unread > 0 && (
                        <span className="text-xs text-muted">новых: {unread}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="flex gap-4 pb-8">
        <Avatar id={myAvatar} />
        <div className="min-w-0 flex-1">
          <div className="flex items-end gap-3">
            <textarea
              ref={fieldRef}
              rows={1}
              value={text}
              onChange={(e) => change(e.target.value)}
              onKeyDown={(e) => {
                // Enter отправляет, Shift+Enter — перенос строки
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              maxLength={MESSAGE_MAX}
              disabled={locked}
              placeholder={
                mode === "chat"
                  ? "Написать в чат…"
                  : locked
                    ? "Раунд не идёт — ответы не принимаются"
                    : "Твой вариант слова…"
              }
              className={`max-h-[120px] min-w-0 flex-1 resize-none overflow-y-auto border-b bg-transparent pb-1 pt-2 text-sm outline-none placeholder:text-muted focus:-mb-px focus:border-b-2 ${
                isRepeat ? "border-yt-red" : "border-field-line focus:border-foreground"
              }`}
              autoComplete="off"
              autoCapitalize="off"
              enterKeyHint="send"
            />
            <button
              type="submit"
              disabled={locked || isRepeat || !text.trim()}
              className="h-9 shrink-0 rounded-[2px] bg-link px-4 text-sm font-medium uppercase text-white disabled:bg-disabled-bg disabled:text-disabled-fg"
            >
              Отправить
            </button>
          </div>
          {isRepeat && <p className="pt-1 text-xs text-subscribe">Этот вариант уже был</p>}
          {badChar && <p className="pt-1 text-xs text-subscribe">Только русские буквы, без цифр, пробелов и символов</p>}
          {error && <p className="pt-1 text-xs text-subscribe">{error}</p>}
          <p className="pt-1 text-xs text-muted">
            {mode === "chat"
              ? "Сообщения в чате не считаются ответами, а загаданное слово в них закроется ■■■."
              : locked
                ? "Пока раунд не идёт, можно поболтать в чате."
                : "Кто первым напишет слово, получит до 100 респекта. Каждый промах −столько, сколько превью открыто."}
          </p>
        </div>
      </form>

      <ul className="flex flex-col gap-4">
        {list
          .slice()
          .reverse()
          .map((m) => (
            <ChatMessage key={m.id} m={m} hostId={hostId} me={me} onProfile={onProfile} />
          ))}
      </ul>

      {/* микро-уведомление о сообщении в чате, пока ты угадываешь — как снекбар ютуба */}
      {toast && toast.author && (
        <button
          onClick={() => switchMode("chat")}
          className="fixed bottom-4 left-1/2 z-30 flex w-[min(420px,calc(100vw-32px))] -translate-x-1/2 items-center gap-3 rounded-[2px] bg-[#323232] px-4 py-3 text-left text-sm text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
        >
          <Avatar id={toast.author.avatar} className="size-6" />
          <span className="min-w-0 flex-1 truncate">
            <b className="font-medium">{toast.author.name}:</b> {toast.text}
          </span>
          <span className="shrink-0 text-xs font-medium uppercase text-[#3ea6ff]">В чат</span>
        </button>
      )}
    </>
  );
}

function ChatMessage({
  m,
  hostId,
  me,
  onProfile,
}: {
  m: Message;
  hostId: string;
  me: string;
  onProfile: (author: NonNullable<Message["author"]>) => void;
}) {
  const author = m.author;
  if (!author) {
    return <li className="pl-14 text-[13px] italic text-muted">{m.text}</li>;
  }
  return (
    <li className="flex gap-4">
      <button onClick={() => onProfile(author)} className="self-start" aria-label={`Профиль ${author.name}`}>
        <Avatar id={author.avatar} />
      </button>
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[13px] font-medium">
          <button
            onClick={() => onProfile(author)}
            className={`hover:underline ${author.id === hostId ? "rounded-full bg-[#888] px-1.5 text-white" : ""}`}
          >
            {author.name}
          </button>
          {author.id === me && <span className="font-normal text-muted">(вы)</span>}
        </p>
        <p className="whitespace-pre-line break-words text-sm">{m.text}</p>
        {m.kind !== "chat" && (
          <p className="flex items-center gap-1 pt-1 text-xs text-muted">
            {m.kind === "win" ? (
              <>
                <Icon d={ICONS.heart} className="size-4 text-yt-red" /> Угадано! +{respectLabel(m.respect ?? 0)}
              </>
            ) : (
              `${m.kind === "close" ? "горячо!" : "мимо"} • −${respectLabel(m.respect ?? 0)}`
            )}
          </p>
        )}
      </div>
    </li>
  );
}
