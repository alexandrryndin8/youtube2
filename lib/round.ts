import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { Difficulty } from "./difficulty";
import { kvGet, kvSet } from "./kv";
import type { Pack } from "./packs";
import { englishFor } from "./translations";
import { randomNoun } from "./words";
import { search, type Video } from "./youtube";

export const MAX_PREVIEWS = 5;

// Загаданное слово и названия видео (они выдают слово) не уходят на клиент
// открытым текстом — только в зашифрованном токене.
// Без ROUND_SECRET ключ живёт до перезапуска сервера. Держим его в globalThis:
// в dev модуль перевыполняется при каждой правке, и токены бы протухали.
const g = globalThis as { roundKey?: Buffer };
const KEY = process.env.ROUND_SECRET
  ? Buffer.from(process.env.ROUND_SECRET.padEnd(32, "0").slice(0, 32))
  : (g.roundKey ??= randomBytes(32));

export type Secret = { word: string; titles: string[]; ids: string[]; difficulty?: Difficulty };

export function encryptSecret(secret: Secret): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(secret), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}

export function decryptSecret(token: string): Secret | null {
  try {
    const buf = Buffer.from(token, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", KEY, buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8"));
  } catch {
    return null;
  }
}

export function normalize(s: string): string {
  return s.trim().toLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ");
}

const ENDING_RE = /[аеиоуыэюяйь]+$/;
const ALTERNATION: Record<string, string> = { к: "ч", г: "ж", х: "ш", ц: "ч" };

/** Основы слова для поиска его форм: «валенок» → валенок, валенк (беглая гласная: валенки). */
function stems(word: string): string[] {
  const w = normalize(word);
  let base = w.replace(ENDING_RE, "");
  // «хуй», «фея», «уха» — гласные съели почти всё слово, срезаем только последнюю букву
  if (base.length < 2) base = w.length >= 3 ? w.slice(0, -1) : w;
  const result = new Set([base]);
  const m = /^(.+)[ое]([^аеиоуыэюя])$/.exec(base);
  if (m) result.add(m[1] + m[2]);
  // чередования в производных: шашлык → шашлычная, рынок → рыночный, снег → снежный
  for (const s of [...result]) {
    const alt = ALTERNATION[s.at(-1)!];
    if (alt && s.length >= 4) result.add(s.slice(0, -1) + alt);
  }
  return [...result].filter((s) => s.length >= 2);
}

const TRANSLIT: Record<string, string[]> = {
  а: ["a"], б: ["b"], в: ["v"], г: ["g"], д: ["d"], е: ["e"], ж: ["zh"], з: ["z"], и: ["i"],
  й: ["y", "i", "j"], к: ["k"], л: ["l"], м: ["m"], н: ["n"], о: ["o"], п: ["p"], р: ["r"],
  с: ["s"], т: ["t"], у: ["u"], ф: ["f"], х: ["h", "kh"], ц: ["ts", "c"], ч: ["ch"], ш: ["sh"],
  щ: ["sch", "shch"], ъ: [""], ы: ["y"], ь: [""], э: ["e"], ю: ["yu", "ju"], я: ["ya", "ja"],
};

/** Варианты латиницей: «шашлык» → shashlyk, «хомяк» → homyak, khomyak, homjak… */
function translit(s: string): string[] {
  let variants = [""];
  for (const ch of s) {
    const options = TRANSLIT[ch] ?? [ch];
    variants = variants.flatMap((v) => options.map((o) => v + o)).slice(0, 32);
  }
  return variants;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Регэкспы на латинские формы слова: английский перевод (+мн. число) и транслит основы. */
function latinPatterns(word: string, wordStems: string[]): RegExp[] {
  const english = englishFor(word).map((w) => {
    const base = escapeRe(w.toLowerCase());
    // puppy → puppies, cat → cats, box → boxes, cat's
    return /[^aeiou]y$/.test(w) ? `${base.slice(0, -1)}(?:y|ies)` : `${base}(?:s|es|'s)?`;
  });
  const translits = wordStems.flatMap((s) =>
    translit(s).map((t) => escapeRe(t) + (s.length >= 4 ? "\\p{L}*" : "[a-z]{0,3}")),
  );
  return [...english, ...translits].map((p) => new RegExp(`(?<!\\p{L})${p}(?!\\p{L})`, "giu"));
}

// после короткой основы — только окончание или «-ск-»: «кот» закроет «коты», «котик», но не «который»
const SHORT_TAIL_RE = /^(?:ск)?[а-я]{0,3}$/;
// после основы из двух букв — только окончание с гласной/й: «хуй» (ху) закроет «хуйня», «хуя», но не «худой»
const TINY_TAIL_RE = /^(?:[аеиоуыэюяй][а-я]{0,2})?$/;

function tailFits(stem: string, tail: string): boolean {
  if (stem.length >= 4) return true;
  return stem.length === 2 ? TINY_TAIL_RE.test(tail) : SHORT_TAIL_RE.test(tail);
}

/**
 * Закрывает в названии загаданное слово в любой форме, включая производные («тыква» → «тыквенный»),
 * английский перевод (pumpkin) и транслит (tykva).
 */
export function censor(title: string, word: string): string {
  const wordStems = stems(word);
  // основа из 4+ букв закрывает всё, что с неё начинается: случайных совпадений почти нет
  const matches = (token: string) => {
    const t = normalize(token);
    return wordStems.some((s) => t.startsWith(s) && tailFits(s, t.slice(s.length)));
  };
  // загадано слово через дефис (баба-яга) — сверяем дефисные слова целиком, иначе по частям (шашлык-машлык)
  let result = word.includes("-")
    ? title.replace(/\p{L}+(?:-\p{L}+)*/gu, (token) => (matches(token) ? "■■■" : token))
    : title.replace(/\p{L}+/gu, (part) => (matches(part) ? "■■■" : part));
  // английский перевод и транслит: «попкорн» закроет и popcorn, и popkorn
  for (const re of latinPatterns(word, wordStems)) result = result.replace(re, "■■■");
  return result;
}

/** Есть ли загаданное слово (в любой форме) в названии или куске описания. */
function mentions(video: Video, word: string): boolean {
  const text = `${video.title} ${video.description}`;
  return censor(text, word) !== text;
}

/**
 * Годится в первое превью: слово стоит в самом названии (там будет ■■■),
 * и кроме него есть хоть одно открытое слово — иначе по названию нечего угадывать.
 */
function goodLead(video: Video, word: string): boolean {
  const censored = censor(video.title, word);
  return censored !== video.title && /[\p{L}\p{N}]/u.test(censored);
}

// видео, уже показанные в прошлых раундах по этому слову, — чтобы одно и то же не лезло по кругу.
// В хранилище, а не в памяти: на Vercel у каждого экземпляра функции память своя
const SHOWN_MAX = 200;
const SHOWN_TTL = 30 * 24 * 60 * 60;
const shownKey = (word: string) => `yt:shown:${word}`;

async function shownFor(word: string): Promise<string[]> {
  const raw = await kvGet(shownKey(word)).catch(() => null);
  return raw ? JSON.parse(raw) : [];
}

async function rememberShown(word: string, before: string[], videos: Video[]) {
  const ids = [...before, ...videos.map((v) => v.id)].slice(-SHOWN_MAX);
  await kvSet(shownKey(word), JSON.stringify(ids), SHOWN_TTL).catch(() => {});
}

/**
 * Рандомное существительное и до 5 превью по нему. Первое превью всегда с зацензуренным словом
 * в названии (см. goodLead); если такого нет или ютуб мало нашёл — пробуем другое слово.
 * pack — тематический набор слов от читкода.
 */
export async function newRound(pack?: Pack): Promise<{ word: string; videos: Video[] }> {
  let best = { word: "", videos: [] as Video[], lead: false, shown: [] as string[] };
  for (let i = 0; i < 5; i++) {
    const word = randomNoun(pack);
    const shown = await shownFor(word);
    // ютуб добивает скудную выдачу роликами, где слова нет вообще — такие в конец
    const videos = await search(
      word,
      MAX_PREVIEWS,
      new Set(shown),
      (v) => mentions(v, word),
      (v) => goodLead(v, word),
    );
    const lead = videos.length > 0 && goodLead(videos[0], word);
    // слово с хорошим первым превью важнее, чем лишние ролики
    if ((lead && !best.lead) || (lead === best.lead && videos.length > best.videos.length)) {
      best = { word, videos, lead, shown };
    }
    if (lead && videos.length >= MAX_PREVIEWS) break;
    // полную выдачу ищем 3 попытки, ещё 2 — только если первого превью так и нет
    if (i >= 2 && best.lead) break;
  }
  if (best.videos.length) await rememberShown(best.word, best.shown, best.videos);
  return { word: best.word, videos: best.videos };
}
