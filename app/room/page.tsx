import { listAvatars } from "@/lib/avatars.server";
import CreateRoom from "./CreateRoom";

/** Создание сервера. Список аватарок — из public/avatarki. */
export default function CreateRoomPage() {
  return <CreateRoom avatars={listAvatars()} />;
}
