import { avatarSrc } from "@/lib/avatars";

/**
 * Аватарка игрока из public/avatarki. Картинки заранее ужаты (npm run images), поэтому отдаём файл как есть,
 * без next/image: на Vercel каждое его пережатие — платная трансформация, а их на бесплатном тарифе 5000 в месяц.
 * Без картинки (id нет или файл удалили) — серый кружок.
 */
export default function Avatar({ id, className = "size-10" }: { id: string; className?: string }) {
  return (
    <span className={`${className} relative block shrink-0 overflow-hidden rounded-full bg-line`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {id && <img src={avatarSrc(id)} alt="" loading="lazy" decoding="async" className="size-full object-cover" />}
    </span>
  );
}
