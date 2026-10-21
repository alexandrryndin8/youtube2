import { isDifficulty } from "@/lib/difficulty";
import { isPack } from "@/lib/packs";
import { censor, encryptSecret, newRound } from "@/lib/round";

/**
 * { pack?, difficulty? } — тематический набор слов от читкода и сложность; без тела — все слова, обычная.
 * Сложность зашита в токен: по ней /api/round/hint и /api/round/clip решают, можно ли подсказывать.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const difficulty = isDifficulty(body?.difficulty) ? body.difficulty : "normal";
  const { word, videos } = await newRound(isPack(body?.pack) ? body.pack : undefined);
  if (!videos.length) {
    return Response.json({ error: "Ютуб ничего не нашёл, попробуй ещё раз" }, { status: 502 });
  }
  return Response.json({
    token: encryptSecret({ word, titles: videos.map((v) => v.title), ids: videos.map((v) => v.id), difficulty }),
    thumbs: videos.map((v) => v.thumb),
    // полные названия придут в конце раунда, а пока — с закрытым словом; в сложном — никаких
    titles: difficulty === "hard" ? [] : videos.map((v) => censor(v.title, word)),
    // лёгкий: сколько букв — «_» на каждую, дефис как есть (баба-яга → ____-___)
    ...(difficulty === "easy" && { pattern: Array.from(word, (c) => (c === "-" ? "-" : "_")).join("") }),
  });
}
