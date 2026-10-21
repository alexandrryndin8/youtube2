import { readdirSync } from "node:fs";
import path from "node:path";
import { SECRET_AVATARS } from "./avatars";

const DIR = path.join(process.cwd(), "public", "avatarki");
const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)$/i;

/** Имена картинок в public/avatarki. Читаем каждый раз — новые файлы подхватываются без перезапуска. */
function readAvatars(): string[] {
  try {
    return readdirSync(DIR)
      .filter((f) => IMAGE_RE.test(f))
      .sort();
  } catch {
    return [];
  }
}

/** Аватарки для выбора — без секретных. */
export function listAvatars(): string[] {
  return readAvatars().filter((f) => !(f in SECRET_AVATARS));
}

/** Есть ли такая аватарка, включая секретные. */
export function isAvatar(id: string): boolean {
  return readAvatars().includes(id);
}
