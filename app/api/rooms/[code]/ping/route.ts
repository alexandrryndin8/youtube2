import { ping, RoomError } from "@/lib/rooms";

/** { player, key } -> состояние комнаты: игрок отмечается, что он ещё на сервере (раз в PING_MS). */
export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/ping">) {
  const { code } = await ctx.params;
  try {
    const { player, key } = await request.json();
    return Response.json(await ping(code, player, key));
  } catch (e) {
    if (e instanceof RoomError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
