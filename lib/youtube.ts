// Порт botgovno/youtube.py: поиск самых непросматриваемых видео по запросу.

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
  // чтобы ютуб не подсовывал страницу согласия на куки (EU)
  Cookie: "SOCS=CAI; CONSENT=YES+1",
};

const INITIAL_DATA_RE = /var ytInitialData\s*=\s*({[\s\S]*?});\s*<\/script>/;

export type Video = {
  id: string;
  title: string;
  description: string; // кусок описания из выдачи, не всё описание
  views: number | null;
  thumb: string;
};

type Node = { simpleText?: string; runs?: { text?: string }[] } | undefined;

function text(node: Node): string {
  if (!node) return "";
  if (node.simpleText !== undefined) return node.simpleText;
  return (node.runs ?? []).map((r) => r.text ?? "").join("");
}

/** '1 234 567 просмотров' -> 1234567, 'Нет просмотров' -> 0, нет данных -> null. */
function views(node: Node): number | null {
  const t = text(node);
  if (!t) return null;
  const digits = t.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function* find(obj: unknown, key: string): Generator<unknown> {
  if (Array.isArray(obj)) {
    for (const v of obj) yield* find(v, key);
  } else if (obj && typeof obj === "object") {
    const rec = obj as Record<string, unknown>;
    if (key in rec) yield rec[key];
    for (const v of Object.values(rec)) yield* find(v, key);
  }
}

/**
 * Хотя бы половина букв в названии — кириллица.
 * Отсекает китайские AI-дорамы, индусов и прочее, чем ютуб добивает
 * выдачу по фильтрам свежести, когда по запросу ничего нет.
 */
function isRussian(title: string): boolean {
  const letters = title.match(/\p{L}/gu) ?? [];
  const cyrillic = title.match(/[а-яё]/gi) ?? [];
  return letters.length > 0 && cyrillic.length * 2 >= letters.length;
}

function parseVideos(data: unknown, videos: Video[], seen: Set<string>) {
  for (const r of find(data, "videoRenderer") as Generator<Record<string, unknown>>) {
    const id = r.videoId as string | undefined;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const title = text(r.title as Node);
    if (!isRussian(title)) continue;
    const snippets = (r.detailedMetadataSnippets as { snippetText?: Node }[] | undefined) ?? [];
    videos.push({
      id,
      title,
      description: snippets.map((s) => text(s.snippetText)).join(" "),
      views: views(r.viewCountText as Node),
      thumb: "",
    });
  }
}

// Сортировку по дате ютуб игнорирует, а фильтр по дате загрузки работает —
// свежезалитые видео как раз почти без просмотров.
// Пустой фильтр — обычная выдача, на случай если по запросу свежего ничего нет.
const FILTERS = [
  "EgQIARAB", // видео за последний час
  "EgQIAhAB", // сегодня
  "EgQIAxAB", // эта неделя
  "",
];

async function fetchPage(query: string, sp: string): Promise<unknown> {
  // hl/gl — русский интерфейс и регион Россия, иначе выдача международная
  let url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=ru&gl=RU`;
  if (sp) url += `&sp=${sp}`;
  try {
    const resp = await fetch(url, { headers: HEADERS, cache: "no-store" });
    if (!resp.ok) return {};
    const m = INITIAL_DATA_RE.exec(await resp.text());
    return m ? JSON.parse(m[1]) : {};
  } catch {
    return {};
  }
}

const ONLY_VIDEOS = "EgIQAQ%3D%3D";
const OLD_YEARS = 10;
const OLD_SINCE = 2006; // раньше на ютубе почти ничего нет

/**
 * Запрос, разбитый на двухлетние окна от OLD_SINCE до «10 лет назад».
 * Фильтра «старше N лет» у ютуба нет, зато работают операторы after:/before:.
 * Один общий before: даёт только старые хиты с миллионами просмотров,
 * а по окнам набирается пара сотен видео — среди них есть и почти непросмотренные.
 */
function oldQueries(query: string): string[] {
  const cutoff = new Date(Date.now() - Math.round(OLD_YEARS * 365.25) * 86400_000);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const queries = [];
  for (let year = OLD_SINCE; year <= cutoff.getUTCFullYear(); year += 2) {
    const end = `${year + 2}-01-01` < cutoffIso ? `${year + 2}-01-01` : cutoffIso;
    queries.push(`${query} after:${year}-01-01 before:${end}`);
  }
  return queries;
}

async function collect(requests: [string, string][], seen: Set<string>): Promise<Video[]> {
  const pages = await Promise.all(requests.map(([q, sp]) => fetchPage(q, sp)));
  const videos: Video[] = [];
  for (const data of pages) parseVideos(data, videos, seen);
  // самые непросматриваемые — первыми; видео без счётчика (стримы и т.п.) — в конец
  videos.sort((a, b) => (a.views === null ? 1 : 0) - (b.views === null ? 1 : 0) || (a.views ?? 0) - (b.views ?? 0));
  return videos;
}

/** maxresdefault (1280x720) есть не у всех видео — проверяем, иначе hqdefault. */
async function resolveThumb(video: Video) {
  const maxres = `https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`;
  try {
    const r = await fetch(maxres, { method: "HEAD", signal: AbortSignal.timeout(3000) });
    if (r.status === 200) {
      video.thumb = maxres;
      return;
    }
  } catch {}
  video.thumb = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
}

/**
 * Самые непросматриваемые видео по запросу: свежие и 10+ лет, через одно.
 * Видео, для которых prefer вернул true, идут вперёд, порядок внутри групп сохраняется.
 */
export async function search(
  query: string,
  limit = 30,
  exclude?: Set<string>,
  prefer?: (v: Video) => boolean,
): Promise<Video[]> {
  const seen = new Set<string>(exclude);
  const [fresh, old] = await Promise.all([
    collect(FILTERS.map((sp) => [query, sp]), seen),
    collect(oldQueries(query).map((q) => [q, ONLY_VIDEOS]), seen),
  ]);

  const mixed: Video[] = [];
  for (let i = 0; i < Math.max(fresh.length, old.length); i++) {
    if (fresh[i]) mixed.push(fresh[i]);
    if (old[i]) mixed.push(old[i]);
  }
  const sorted = prefer ? [...mixed.filter(prefer), ...mixed.filter((v) => !prefer(v))] : mixed;
  const result = sorted.slice(0, limit);
  await Promise.all(result.map(resolveThumb));
  return result;
}
