import { Suspense } from "react";
import Header from "@/components/Header";
import { listAvatars } from "@/lib/avatars.server";
import Room from "./Room";

export default function RoomPage({ params }: PageProps<"/room/[code]">) {
  return (
    <Suspense fallback={<Header />}>
      {params.then(({ code }) => (
        <Room code={code.toUpperCase()} avatars={listAvatars()} />
      ))}
    </Suspense>
  );
}
