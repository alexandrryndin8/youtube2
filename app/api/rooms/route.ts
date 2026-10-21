import { createRoom, RoomError } from "@/lib/rooms";

/** { name, avatar, difficulty } -> { code, player, key, view }: новый сервер, создатель — хост. */
export async function POST(request: Request) {
  try {
    return Response.json(await createRoom(await request.json()));
  } catch (e) {
    if (e instanceof RoomError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
