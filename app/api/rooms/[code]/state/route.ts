import { roomState, RoomError } from "@/lib/rooms";
import { STATE_CDN_SECONDS } from "@/lib/roomTiming";

// Состояние комнаты одинаково для всех игроков, поэтому его кэширует CDN Vercel на STATE_CDN_SECONDS:
// игроки опрашивают часто, а хранилище и функция дёргаются не чаще раза в секунду на комнату.
// Браузеру — не кэшировать: он и так спрашивает раз в POLL_MS.
const HEADERS = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "Vercel-CDN-Cache-Control": `public, max-age=${STATE_CDN_SECONDS}`,
};

/** -> состояние комнаты (как видят все игроки); 404 — сервера больше нет. */
export async function GET(_request: Request, ctx: RouteContext<"/api/rooms/[code]/state">) {
  const { code } = await ctx.params;
  try {
    return Response.json(await roomState(code), { headers: HEADERS });
  } catch (e) {
    if (e instanceof RoomError) return Response.json({ error: e.message }, { status: e.status, headers: HEADERS });
    throw e;
  }
}
