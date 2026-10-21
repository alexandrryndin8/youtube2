import { act, checkRoom, RoomError } from "@/lib/rooms";

/** -> { code } если на сервер можно зайти, иначе { error } (404 — нет такого, 400 — нет мест) */
export async function GET(_request: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  const { code } = await ctx.params;
  try {
    return Response.json(await checkRoom(code));
  } catch (e) {
    if (e instanceof RoomError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

/** { player, key, type: "chat", mode, text } | { player, key, type: "next" | "round" | ... } -> состояние комнаты */
export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  const { code } = await ctx.params;
  try {
    return Response.json(await act(code, await request.json()));
  } catch (e) {
    if (e instanceof RoomError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
