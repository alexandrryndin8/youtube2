"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import DifficultyPicker from "@/components/DifficultyPicker";
import Header from "@/components/Header";
import ProfileForm, { type Profile } from "@/components/ProfileForm";
import type { Difficulty } from "@/lib/difficulty";
import { saveSession } from "./session";

/** Создание сервера: выбираешь аватарку, ник и сложность — и ты хост. */
export default function CreateRoom({ avatars }: { avatars: string[] }) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  async function create(profile: Profile) {
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) return data.error as string;
      saveSession(data.code, { player: data.player, key: data.key });
      router.push(`/room/${data.code}`);
    } catch {
      return "Не удалось создать сервер";
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="w-full px-3 py-6 sm:py-10">
        <ProfileForm avatars={avatars} title="Создать сервер" action="Создать" onSubmit={create}>
          {/* потом хост может сменить её, но респект у всех тогда обнулится */}
          <p className="pb-2 pt-5 text-sm font-medium">Сложность</p>
          <DifficultyPicker value={difficulty} onChange={setDifficulty} />
        </ProfileForm>
        <p className="mx-auto max-w-[440px] px-1 pt-3 text-[13px] text-muted">
          Ты станешь хостом: открываешь превью и запускаешь раунды, можешь сменить сложность (респект у всех тогда
          обнулится). Друзьям скинешь ссылку или код — кто первым угадает слово в чате, тот и забирает респект.
        </p>
      </main>
    </div>
  );
}
