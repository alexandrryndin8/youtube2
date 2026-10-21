// Хранилище «ключ → строка» с временем жизни. На Vercel — Upstash Redis через REST
// (функции живут в разных экземплярах и засыпают, память процесса у них не общая).
// Без ключей Upstash (локальная разработка) — просто Map в памяти процесса.
// Ключи: интеграция Upstash в Vercel Marketplace кладёт KV_REST_API_URL / KV_REST_API_TOKEN,
// консоль Upstash — UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN; подходят оба.
//
// Бесплатный Upstash — 500 тыс. команд в месяц, поэтому каждая функция здесь — ровно одна команда.

const URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis<T>(command: (string | number)[]): Promise<T> {
  const res = await fetch(URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = (await res.json()) as { result?: T; error?: string };
  if (data.error) throw new Error(`Upstash: ${data.error}`);
  return data.result as T;
}

// --- память процесса (локально) ---
// в globalThis: в dev модуль перевыполняется при каждой правке
const g = globalThis as { kv?: Map<string, { value: string; expires: number }> };
const memory = (g.kv ??= new Map());

function memoryGet(key: string): string | null {
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

const memorySet = (key: string, value: string, ttl: number) =>
  memory.set(key, { value, expires: Date.now() + ttl * 1000 });

// --- общий интерфейс ---

export async function kvGet(key: string): Promise<string | null> {
  return URL ? redis<string | null>(["GET", key]) : memoryGet(key);
}

/** ttl — в секундах. */
export async function kvSet(key: string, value: string, ttl: number): Promise<void> {
  if (URL) await redis(["SET", key, value, "EX", ttl]);
  else memorySet(key, value, ttl);
}

/** Записать, только если ключа ещё нет. true — записали. */
export async function kvSetNew(key: string, value: string, ttl: number): Promise<boolean> {
  if (URL) return (await redis<string | null>(["SET", key, value, "NX", "EX", ttl])) === "OK";
  if (memoryGet(key) !== null) return false;
  memorySet(key, value, ttl);
  return true;
}

export async function kvDel(key: string): Promise<void> {
  if (URL) await redis(["DEL", key]);
  else memory.delete(key);
}

// Значение начинается с {"v":N, — номер версии. Пишем, только если в хранилище всё ещё версия expected:
// иначе кто-то успел записать раньше нас, и надо перечитать и повторить (оптимистичная блокировка).
const CAS_SCRIPT = `
local cur = redis.call('GET', KEYS[1])
if not cur then return 0 end
if string.match(cur, '^{"v":(%d+),') ~= ARGV[2] then return 0 end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[3])
return 1`;

const versionOf = (value: string) => /^\{"v":(\d+),/.exec(value)?.[1];

/** Записать value, если версия в хранилище всё ещё expected. true — записали. */
export async function kvReplace(key: string, expected: number, value: string, ttl: number): Promise<boolean> {
  if (URL) return (await redis<number>(["EVAL", CAS_SCRIPT, 1, key, value, String(expected), ttl])) === 1;
  const cur = memoryGet(key);
  if (cur === null || versionOf(cur) !== String(expected)) return false;
  memorySet(key, value, ttl);
  return true;
}
