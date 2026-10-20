import { censor, encryptSecret, newRound } from "@/lib/round";

export async function POST() {
  const { word, videos } = await newRound();
  if (!videos.length) {
    return Response.json({ error: "Ютуб ничего не нашёл, попробуй ещё раз" }, { status: 502 });
  }
  return Response.json({
    token: encryptSecret({ word, titles: videos.map((v) => v.title), ids: videos.map((v) => v.id) }),
    thumbs: videos.map((v) => v.thumb),
    // полные названия придут в конце раунда, а пока — с закрытым словом
    titles: videos.map((v) => censor(v.title, word)),
  });
}
