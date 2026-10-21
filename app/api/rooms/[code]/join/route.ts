import { joinRoom, RoomError } from "@/lib/rooms";

/** { name, avatar } -> { code, player, key, view } */
export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/join">) {
  const { code } = await ctx.params;
  try {
    return Response.json(await joinRoom(code, await request.json()));
  } catch (e) {
    if (e instanceof RoomError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
