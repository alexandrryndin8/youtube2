import { decryptSecret, normalize } from "@/lib/round";

/**
 * { token, guess } -> { correct } (при угадывании ещё word, titles и ids);
 * { token, giveUp: true } -> { word, titles, ids }
 */
export async function POST(request: Request) {
  const { token, guess, giveUp } = await request.json();
  const secret = typeof token === "string" ? decryptSecret(token) : null;
  if (!secret) return Response.json({ error: "Раунд устарел, начни новый" }, { status: 400 });

  if (giveUp) return Response.json(secret);
  const correct = normalize(String(guess ?? "")) === normalize(secret.word);
  return Response.json(correct ? { correct, ...secret } : { correct });
}
