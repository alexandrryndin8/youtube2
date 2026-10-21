import { decryptSecret } from "@/lib/round";

/** { token, index } -> { id }: id ролика, чтобы посмотреть его первые секунды. Только в лёгком режиме. */
export async function POST(request: Request) {
  const { token, index } = await request.json();
  const secret = typeof token === "string" ? decryptSecret(token) : null;
  if (!secret) return Response.json({ error: "Раунд устарел, начни новый" }, { status: 400 });
  if (secret.difficulty !== "easy") return Response.json({ error: "Видео есть только в лёгком режиме" }, { status: 403 });

  const id = Number.isInteger(index) ? secret.ids[index] : undefined;
  if (!id) return Response.json({ error: "Нет такого видео" }, { status: 400 });
  return Response.json({ id });
}
