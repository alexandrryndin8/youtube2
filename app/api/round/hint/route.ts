import { decryptSecret } from "@/lib/round";

/** { token, pos } -> { letter }: буква загаданного слова на месте pos. Только в лёгком режиме. */
export async function POST(request: Request) {
  const { token, pos } = await request.json();
  const secret = typeof token === "string" ? decryptSecret(token) : null;
  if (!secret) return Response.json({ error: "Раунд устарел, начни новый" }, { status: 400 });
  if (secret.difficulty !== "easy") return Response.json({ error: "Подсказки есть только в лёгком режиме" }, { status: 403 });

  const letters = Array.from(secret.word);
  const letter = Number.isInteger(pos) ? letters[pos] : undefined;
  if (!letter || letter === "-") return Response.json({ error: "Нет такой буквы" }, { status: 400 });
  return Response.json({ letter });
}
