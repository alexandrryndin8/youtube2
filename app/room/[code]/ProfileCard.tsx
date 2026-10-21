"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import Icon, { ICONS } from "@/components/Icon";
import { plural } from "@/lib/plural";
import type { RoomView } from "@/lib/rooms";

type Player = RoomView["players"][number];
export type ProfileTarget = { id: string; name: string; avatar: string };

// столько длится переход появления и ухода (duration-300 в классах ниже)
const LEAVE_MS = 300;

/**
 * Микроокно профиля по клику на аватарку или ник: большая аватарка, ник, респект и место в рейтинге.
 * На телефоне — шторка выезжает снизу, на широком экране — карточка всплывает по центру.
 * target — кого открыли (из чата это может быть уже вышедший игрок), свежие данные берём из players.
 * onClose зовётся, когда окно уже доиграло анимацию ухода.
 */
export default function ProfileCard({
  target,
  players,
  hostId,
  me,
  onClose,
}: {
  target: ProfileTarget;
  players: Player[];
  hostId: string;
  me: string;
  onClose: () => void;
}) {
  const player = players.find((p) => p.id === target.id);
  const { name, avatar } = player ?? target;
  const place = player ? players.filter((p) => p.respect > player.respect).length + 1 : 0;
  // false в первом кадре (окно спрятано) и при закрытии — переходы классов дают анимацию в обе стороны
  const [shown, setShown] = useState(false);
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  function close() {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    setTimeout(() => onCloseRef.current(), LEAVE_MS);
  }

  useEffect(() => {
    // двойной кадр: браузер должен сначала нарисовать спрятанное окно, иначе перехода не будет
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setShown(true));
    });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      onClick={close}
      className={`fixed inset-0 z-30 flex items-end justify-center bg-black/50 transition-opacity duration-300 sm:items-center sm:p-4 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        role="dialog"
        aria-label={`Профиль ${name}`}
        onClick={(e) => e.stopPropagation()}
        className={`relative flex w-full flex-col items-center rounded-t-2xl bg-surface px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 text-center shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[320px] sm:rounded-xl sm:pt-6 sm:ease-[cubic-bezier(0.34,1.4,0.64,1)] ${
          shown ? "translate-y-0 sm:scale-100 sm:opacity-100" : "translate-y-full sm:translate-y-0 sm:scale-75 sm:opacity-0"
        }`}
      >
        {/* ручка шторки — только на телефоне */}
        <span className="mb-4 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        <button onClick={close} className="absolute right-3 top-3 text-muted hover:text-foreground" aria-label="Закрыть">
          <Icon d={ICONS.add} className="size-6 rotate-45" />
        </button>

        <Avatar id={avatar} className={`size-44 sm:size-52 ${player && !player.online ? "opacity-60" : ""}`} />

        <p className="flex max-w-full items-center gap-1.5 pt-4 text-xl font-medium">
          <span className="truncate">{name}</span>
          {target.id === hostId && (
            <span title="Хост">
              <Icon d={ICONS.crown} className="size-5 shrink-0 text-[#f4b400]" />
            </span>
          )}
        </p>
        <p className="text-[13px] text-muted">
          {target.id === me && "это вы • "}
          {target.id === hostId && "хост сервера • "}
          {!player ? "уже не на сервере" : player.online ? "в сети" : "не в сети"}
        </p>

        {player && (
          <div className="mt-5 grid w-full grid-cols-2 gap-2">
            <div className="rounded-lg bg-background py-3">
              <p className="text-2xl font-bold">{player.respect}</p>
              <p className="text-xs text-muted">респект{plural(player.respect, ["", "а", "ов"])}</p>
            </div>
            <div className="rounded-lg bg-background py-3">
              <p className="text-2xl font-bold">#{place}</p>
              <p className="text-xs text-muted">из {players.length} в рейтинге</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
