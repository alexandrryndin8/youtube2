import { randomBytes } from "node:crypto";
import { NAME_MAX } from "./avatars";
import { isAvatar } from "./avatars.server";
import { DIFFICULTY_LABELS, HINT_COST, isDifficulty, type Difficulty } from "./difficulty";
import { kvDel, kvGet, kvReplace, kvSetNew } from "./kv";
import { CODE_ALPHABET, CODE_LENGTH } from "./roomCode";
import { ONLINE_MS } from "./roomTiming";
import { censor, newRound, normalize } from "./round";

// Мультиплеер без долгоживущего процесса: на Vercel функции живут в разных экземплярах и засыпают,
// поэтому комната целиком лежит в хранилище (lib/kv.ts) одной JSON-строкой с номером версии.
// Каждое действие — прочитать, поменять, записать, если никто не успел записать раньше (иначе повторить).
// Таймеров нет: кто ушёл, истекло ли голосование, зависла ли загрузка — считаем по времени
// при каждом чтении (settle), а сохраняется это при ближайшей записи.
// Игроки узнают новости опросом (GET состояния, его кэширует CDN), а раз в PING_MS сообщают, что они тут.

const MAX_PLAYERS = 8;
const MESSAGE_MAX = 200;
// хватает на экран чата; всё состояние уходит каждому игроку при каждом опросе
const CHAT_KEEP = 60;
// клиент отмечается раз в PING_MS (lib/roomTiming.ts); пропустил пару отметок — «не в сети»,
// а ещё через полминуты — вышел с сервера. Хватает на перезагрузку страницы
const LEAVE_AFTER_MS = ONLINE_MS + 30_000;
const MAX_RESPECT = 100;
const MIN_PRIZE = 10;
const VOTE_MS = 30_000;
// хост начал раунд, а его запрос умер посреди поиска — через минуту «загрузка» снимается сама
const LOADING_MAX_MS = 60_000;
// комната без единой записи столько живёт в хранилище; каждая запись продлевает
const ROOM_TTL = 6 * 60 * 60;
const CAS_ATTEMPTS = 8;

type Player = {
  id: string;
  key: string; // секрет игрока: без него от его имени ничего не сделать
  name: string;
  avatar: string;
  respect: number;
  seen: number; // когда последний раз отмечался или что-то делал
};

type MessageKind = "chat" | "miss" | "close" | "win" | "system";

type Message = {
  id: number;
  round: number; // в каком раунде написано — до его конца текст с загаданным словом закрыт
  kind: MessageKind;
  author: { id: string; name: string; avatar: string } | null;
  text: string;
  masked: string;
  respect?: number; // miss и close — сколько респекта стоил промах, win — сколько получено
  firstTry?: boolean; // win — угадал своей первой попыткой в раунде
};

type Round = {
  n: number;
  difficulty: Difficulty; // с какой сложностью начат: хост может сменить её посреди игры
  word: string;
  titles: string[];
  censored: string[];
  ids: string[];
  thumbs: string[];
  opened: number;
  finished: boolean;
  winner: string | null;
  gaveUp: boolean;
  // сумма открытых превью на момент каждого промаха игрока — столько вычтется из приза
  misses: Record<string, number>;
  // лёгкий: буквы, открытые хостом подсказками (null — закрыта, «-» — дефис); каждая дешевит приз всем
  letters: (string | null)[];
  guessed: string[]; // «игрок:слово» — повторять свой вариант нельзя
  // хост предложил сдаться: сдаёмся, если «за» больше половины игроков; until — когда голосование истекает
  vote: { yes: string[]; no: string[]; until: number } | null;
};

type Room = {
  v: number; // версия: растёт с каждой записью
  code: string;
  hostId: string;
  difficulty: Difficulty;
  players: Player[]; // в порядке входа — следующий хост первый в списке
  round: Round | null;
  roundsStarted: number;
  loading: boolean;
  loadingSince: number;
  error: string;
  chat: Message[];
  nextMessageId: number;
};

export class RoomError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const roomKey = (code: string) => `room:${code.toUpperCase()}`;
// версия — первым полем: по нему kvReplace сверяет, не записал ли кто-то раньше
function serialize(room: Room) {
  const { v, ...rest } = room;
  return JSON.stringify({ v, ...rest });
}
const notFound = () => new RoomError("Сервер не найден — возможно, все вышли", 404);

/** Ник: без лишних пробелов, от 1 до 20 символов. Аватарка — только из списка. */
function profile(input: { name?: unknown; avatar?: unknown }) {
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
  if (!name) throw new RoomError("Введи ник");
  if (name.length > NAME_MAX) throw new RoomError(`Ник не длиннее ${NAME_MAX} символов`);
  const avatar = String(input.avatar ?? "");
  if (!isAvatar(avatar)) throw new RoomError("Выбери аватарку");
  return { name, avatar };
}

function addPlayer(room: Room, input: { name?: unknown; avatar?: unknown }, now: number): Player {
  const player: Player = {
    id: randomBytes(8).toString("hex"),
    key: randomBytes(16).toString("hex"),
    respect: 0,
    seen: now,
    ...profile(input),
  };
  room.players.push(player);
  return player;
}

function pushMessage(room: Room, message: Omit<Message, "id" | "round">) {
  room.chat.push({ id: room.nextMessageId++, round: room.round?.n ?? 0, ...message });
  if (room.chat.length > CHAT_KEEP) room.chat.splice(0, room.chat.length - CHAT_KEEP);
}

function system(room: Room, text: string) {
  pushMessage(room, { kind: "system", author: null, text, masked: text });
}

/**
 * Применить всё, что случилось само по прошествии времени: кто-то перестал отмечаться и вышел,
 * истекло голосование, зависла загрузка. События — по порядку их наступления, поэтому результат
 * зависит только от того, какие сроки уже прошли: каждое чтение до записи видит одно и то же.
 */
function settle(room: Room, now: number) {
  const events: { at: number; apply: () => void }[] = [];
  for (const p of room.players) {
    const at = p.seen + LEAVE_AFTER_MS;
    if (at <= now) events.push({ at, apply: () => leave(room, p) });
  }
  const vote = room.round?.vote;
  if (vote && vote.until <= now) {
    events.push({
      at: vote.until,
      apply: () => {
        // голосование могло уже решиться, пока уходили игроки
        if (room.round?.vote !== vote) return;
        room.round.vote = null;
        system(room, "Сдаться не вышло — большинство так и не согласилось");
      },
    });
  }
  events.sort((a, b) => a.at - b.at);
  for (const e of events) {
    if (!room.players.length) return;
    e.apply();
  }
  if (room.loading && room.loadingSince + LOADING_MAX_MS <= now) {
    room.loading = false;
    room.error = "Не удалось загрузить раунд, попробуй ещё раз";
  }
}

function leave(room: Room, player: Player) {
  room.players = room.players.filter((p) => p.id !== player.id);
  if (!room.players.length) return;
  system(room, `${player.name} выходит с сервера`);
  if (room.hostId === player.id) {
    const next = room.players[0];
    room.hostId = next.id;
    system(room, `Теперь хост — ${next.name}`);
  }
  // ушедший больше не голосует — большинство считаем заново
  if (room.round?.vote) tallyVote(room, room.round);
}

/** Комната как она есть сейчас (с учётом прошедшего времени), без записи. */
async function readRoom(code: string, now: number): Promise<Room> {
  const raw = await kvGet(roomKey(code));
  if (!raw) throw notFound();
  const room: Room = JSON.parse(raw);
  settle(room, now);
  if (!room.players.length) throw notFound();
  return room;
}

// fn вернул SKIP — менять нечего, запись не нужна
const SKIP = Symbol("skip");

/**
 * Прочитать комнату, поменять её fn и записать. Если кто-то записал раньше нас — перечитать и повторить,
 * поэтому fn не должен делать ничего, кроме изменения комнаты. Ошибка из fn — ничего не пишем.
 */
async function mutate<T>(
  code: string,
  fn: (room: Room, now: number) => T | typeof SKIP,
): Promise<{ room: Room; result: T | typeof SKIP }> {
  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
    const raw = await kvGet(roomKey(code));
    if (!raw) throw notFound();
    const room: Room = JSON.parse(raw);
    const version = room.v;
    const now = Date.now();
    settle(room, now);
    if (!room.players.length) {
      await kvDel(roomKey(code));
      throw notFound();
    }
    const result = fn(room, now);
    if (result === SKIP) return { room, result };
    room.v = version + 1;
    if (await kvReplace(roomKey(code), version, serialize(room), ROOM_TTL)) return { room, result };
  }
  throw new RoomError("Сервер перегружен, попробуй ещё раз", 503);
}

function auth(room: Room, playerId: unknown, key: unknown): Player {
  const player = room.players.find((p) => p.id === String(playerId));
  if (!player || player.key !== key) throw new RoomError("Тебя нет на этом сервере", 403);
  return player;
}

export async function createRoom(input: { name?: unknown; avatar?: unknown; difficulty?: unknown }) {
  const now = Date.now();
  for (;;) {
    const bytes = randomBytes(CODE_LENGTH);
    const room: Room = {
      v: 1,
      code: Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join(""),
      hostId: "",
      difficulty: isDifficulty(input.difficulty) ? input.difficulty : "normal",
      players: [],
      round: null,
      roundsStarted: 0,
      loading: false,
      loadingSince: 0,
      error: "",
      chat: [],
      nextMessageId: 1,
    };
    const host = addPlayer(room, input, now);
    room.hostId = host.id;
    // код занят — пробуем другой
    if (await kvSetNew(roomKey(room.code), serialize(room), ROOM_TTL)) {
      return { code: room.code, player: host.id, key: host.key, view: view(room, now) };
    }
  }
}

/** Можно ли зайти: сервер есть и на нём есть места. */
export async function checkRoom(code: string): Promise<{ code: string }> {
  const room = await readRoom(code, Date.now());
  if (room.players.length >= MAX_PLAYERS) throw new RoomError("На сервере нет мест");
  return { code: room.code };
}

export async function joinRoom(code: string, input: { name?: unknown; avatar?: unknown }) {
  const { room, result: player } = await mutate(code, (room, now) => {
    if (room.players.length >= MAX_PLAYERS) throw new RoomError("На сервере нет мест");
    const player = addPlayer(room, input, now);
    system(room, `${player.name} заходит на сервер`);
    return player;
  });
  const p = player as Player;
  return { code: room.code, player: p.id, key: p.key, view: view(room, Date.now()) };
}

/** Что видят все игроки — одинаково для всех, поэтому ответ можно кэшировать на CDN. */
export async function roomState(code: string) {
  const now = Date.now();
  return view(await readRoom(code, now), now);
}

/** Игрок отмечается, что он на сервере. */
export async function ping(code: string, playerId: unknown, key: unknown) {
  const { room } = await mutate(code, (room, now) => {
    auth(room, playerId, key).seen = now;
  });
  return view(room, Date.now());
}

/**
 * Что видят все игроки. Загаданное слово, названия и неоткрытые превью — только после конца раунда.
 * Сложный — названий нет до конца раунда; лёгкий — клеточки букв и id открытых видео (для фрагментов).
 */
function view(room: Room, now: number) {
  const r = room.round;
  const active = r && !r.finished;
  return {
    v: room.v,
    code: room.code,
    hostId: room.hostId,
    difficulty: room.difficulty,
    loading: room.loading,
    error: room.error,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      respect: p.respect,
      online: now - p.seen < ONLINE_MS,
    })),
    round: r && {
      n: r.n,
      difficulty: r.difficulty,
      available: r.thumbs.length,
      opened: r.opened,
      finished: r.finished,
      winner: r.winner,
      gaveUp: r.gaveUp,
      vote: r.vote && { yes: r.vote.yes, no: r.vote.no, need: majority(room) },
      thumbs: r.finished ? r.thumbs : r.thumbs.slice(0, r.opened),
      titles: r.finished ? r.titles : r.difficulty === "hard" ? [] : r.censored.slice(0, r.opened),
      word: r.finished ? r.word : null,
      ids: r.finished ? r.ids : r.difficulty === "easy" ? r.ids.slice(0, r.opened) : null,
      letters: r.difficulty !== "easy" ? null : r.finished ? Array.from(r.word) : r.letters,
      hints: r.letters.filter((l) => l !== null && l !== "-").length,
    },
    chat: room.chat.map(({ masked, ...m }) => ({
      ...m,
      text: active && m.round === r.n ? masked : m.text,
    })),
  };
}

export type RoomView = ReturnType<typeof view>;

// ответ — одно слово русскими буквами, как в одиночной игре
const GUESS_RE = /^[а-яё-]+$/i;

type Mode = "chat" | "guess";

/** Сообщение в чат: не считается ответом, но загаданное слово в нём закрыто, чтобы не подсказать. */
function chat(room: Room, player: Player, text: string) {
  const r = room.round;
  const masked = r && !r.finished ? censor(text, r.word) : text;
  pushMessage(room, { kind: "chat", author: author(player), text, masked });
}

/** Попытка угадать: кто первым написал слово, забирает респект, раунд окончен. */
function guess(room: Room, player: Player, text: string) {
  const r = room.round;
  if (!r || r.finished) throw new RoomError("Раунд не идёт — ответы не принимаются");
  if (!GUESS_RE.test(text)) throw new RoomError("Только русские буквы, без цифр, пробелов и символов");
  const guessKey = `${player.id}:${normalize(text)}`;
  if (r.guessed.includes(guessKey)) throw new RoomError("Этот вариант уже был");
  r.guessed.push(guessKey);

  if (normalize(text) === normalize(r.word)) {
    const firstTry = !(player.id in r.misses);
    const prize = Math.max(MIN_PRIZE, MAX_RESPECT - (r.misses[player.id] ?? 0) - hintsCost(r));
    player.respect += prize;
    finish(r);
    r.winner = player.id;
    pushMessage(room, { kind: "win", author: author(player), text, masked: "■■■", respect: prize, firstTry });
    return;
  }

  // однокоренное или перевод — закрываем, чтобы соперник не подсмотрел
  const masked = censor(text, r.word);
  r.misses[player.id] = (r.misses[player.id] ?? 0) + r.opened;
  pushMessage(room, {
    kind: masked !== text ? "close" : "miss",
    author: author(player),
    text,
    masked,
    respect: r.opened,
  });
}

const author = (p: Player) => ({ id: p.id, name: p.name, avatar: p.avatar });

const hintsCost = (r: Round) => r.letters.filter((l) => l !== null && l !== "-").length * HINT_COST;

/** Лёгкий: хост открывает случайную закрытую букву. Последнюю не открываем — слово угадывают игроки. */
function hint(room: Room) {
  const r = room.round;
  if (!r || r.finished) throw new RoomError("Раунд не идёт");
  if (r.difficulty !== "easy") throw new RoomError("Подсказки есть только в лёгком режиме");
  const closed = r.letters.flatMap((l, i) => (l === null ? [i] : []));
  if (closed.length <= 1) throw new RoomError("Последнюю букву не открыть — угадывайте");
  const pos = closed[Math.floor(Math.random() * closed.length)];
  r.letters[pos] = Array.from(r.word)[pos];
}

/** Хост меняет сложность: идущий раунд прерывается, респект у всех обнуляется — счёт начинается заново. */
function changeDifficulty(room: Room, difficulty: unknown) {
  if (!isDifficulty(difficulty)) throw new RoomError("Нет такой сложности");
  if (difficulty === room.difficulty) return;
  room.difficulty = difficulty;
  const r = room.round;
  if (r && !r.finished) {
    finish(r);
    system(room, `Раунд прерван. Было загадано «${r.word}»`);
  }
  for (const p of room.players) p.respect = 0;
  system(room, `Хост сменил сложность на «${DIFFICULTY_LABELS[difficulty]}» — респект у всех обнулён`);
}

function finish(r: Round) {
  r.finished = true;
  r.vote = null;
}

/** Больше половины игроков на сервере. */
const majority = (room: Room) => Math.floor(room.players.length / 2) + 1;

function giveUp(room: Room, host: Player, now: number) {
  const r = room.round;
  if (!r || r.finished) throw new RoomError("Раунд не идёт");
  if (r.vote) return;
  r.vote = { yes: [host.id], no: [], until: now + VOTE_MS };
  system(room, `${host.name} предлагает сдаться`);
  tallyVote(room, r);
}

function vote(room: Room, player: Player, yes: boolean) {
  const v = room.round?.vote;
  if (!v) throw new RoomError("Голосования нет");
  v.yes = v.yes.filter((id) => id !== player.id);
  v.no = v.no.filter((id) => id !== player.id);
  (yes ? v.yes : v.no).push(player.id);
  tallyVote(room, room.round!);
}

/** Набралось большинство «за» — сдаёмся; «против» столько, что большинства уже не будет, — играем дальше. */
function tallyVote(room: Room, r: Round) {
  const v = r.vote!;
  const ids = room.players.map((p) => p.id);
  const yes = ids.filter((id) => v.yes.includes(id)).length;
  const no = ids.filter((id) => v.no.includes(id)).length;
  const need = majority(room);
  if (yes >= need) {
    finish(r);
    r.gaveUp = true;
    system(room, `Сдались. Было загадано «${r.word}»`);
  } else if (ids.length - no < need) {
    r.vote = null;
    system(room, "Сдаться не вышло — большинство против, играем дальше");
  }
}

/**
 * Новый раунд: отметить «ищу видео» (все увидят при опросе), найти видео — несколько секунд,
 * запрос хоста всё это время ждёт — и записать раунд.
 */
async function startRound(code: string, playerId: unknown, key: unknown) {
  const { room, result: started } = await mutate(code, (room, now) => {
    const player = auth(room, playerId, key);
    player.seen = now;
    if (room.hostId !== player.id) throw new RoomError("Новый раунд начинает только хост", 403);
    if (room.loading) return SKIP;
    const skipped = room.round && !room.round.finished ? room.round : null;
    if (skipped) {
      finish(skipped);
      system(room, `Хост пропустил раунд. Было загадано «${skipped.word}»`);
    }
    room.loading = true;
    room.loadingSince = now;
    room.error = "";
    return true;
  });
  if (started === SKIP) return view(room, Date.now());

  let found: Awaited<ReturnType<typeof newRound>> | null = null;
  let error = "";
  try {
    found = await newRound();
    if (!found.videos.length) error = "Ютуб ничего не нашёл, попробуй ещё раз";
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось загрузить раунд";
  }

  const { room: updated } = await mutate(code, (room) => {
    room.loading = false;
    if (error || !found) {
      room.error = error;
      return;
    }
    const { word, videos } = found;
    const n = ++room.roundsStarted;
    room.round = {
      n,
      difficulty: room.difficulty,
      word,
      titles: videos.map((v) => v.title),
      censored: videos.map((v) => censor(v.title, word)),
      ids: videos.map((v) => v.id),
      thumbs: videos.map((v) => v.thumb),
      opened: 1,
      finished: false,
      winner: null,
      gaveUp: false,
      misses: {},
      letters: Array.from(word, (c) => (c === "-" ? "-" : null)),
      guessed: [],
      vote: null,
    };
    system(room, `Раунд ${n} • ${DIFFICULTY_LABELS[room.difficulty]}. Загадано одно существительное — пиши ответы в чат`);
  });
  return view(updated, Date.now());
}

/**
 * Действие игрока: сообщение или ответ, голос за сдачу; хосту — ещё превью, подсказка, сложность,
 * новый раунд и «сдаёмся». Возвращает свежее состояние — игрок видит результат сразу, не дожидаясь опроса.
 */
export async function act(code: string, body: Record<string, unknown>) {
  if (body.type === "round") return startRound(code, body.player, body.key);

  const { room } = await mutate(code, (room, now) => {
    const player = auth(room, body.player, body.key);
    player.seen = now;
    const isHost = room.hostId === player.id;

    switch (body.type) {
      case "chat": {
        const text = String(body.text ?? "").trim().slice(0, MESSAGE_MAX);
        if (!text) return;
        if ((body.mode as Mode) === "guess") guess(room, player, text);
        else chat(room, player, text);
        return;
      }
      case "giveup":
        if (!isHost) throw new RoomError("Предложить сдаться может только хост", 403);
        giveUp(room, player, now);
        return;
      case "vote":
        vote(room, player, body.yes === true);
        return;
      case "next": {
        if (!isHost) throw new RoomError("Превью открывает только хост", 403);
        const r = room.round;
        if (r && !r.finished && r.opened < r.thumbs.length) r.opened++;
        return;
      }
      case "hint":
        if (!isHost) throw new RoomError("Буквы открывает только хост", 403);
        hint(room);
        return;
      case "difficulty":
        if (!isHost) throw new RoomError("Сложность меняет только хост", 403);
        changeDifficulty(room, body.difficulty);
        return;
      default:
        throw new RoomError("Неизвестное действие");
    }
  });
  return view(room, Date.now());
}
