// Ужимает картинки в public до размера, в котором их реально показывают (с запасом под ретину).
// Каждая картинка с CDN уходит как есть — 500-килобайтная аватарка в кружке на 32px просто жрёт трафик.
// Оригинал перед первым сжатием откладывается в image-originals/ (не раздаётся с сайта).
// Формат и имя файла не меняются — ссылки в коде и id аватарок остаются прежними.
// Запуск: npm run images. Повторный запуск уже ужатые картинки пропускает.
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// на Windows sharp держит файл открытым и его не перезаписать — читаем в память и без кэша
sharp.cache(false);

const PUBLIC = "public";
const ORIGINALS = "image-originals";
const IMAGE_RE = /\.(jpe?g|png|webp)$/i;

// во сколько px по большей стороне ужимать: показанный размер ×2 под ретину
function maxSide(rel) {
  if (rel.startsWith("avatarki/")) return 416; // самая большая — в окне профиля, 208px
  if (rel === "mine.jpg") return 1280; // фон «плеера» на главной, до 960px
  if (rel.startsWith("youtube2")) return 320; // логотип в шапке, 32px высотой
  if (rel === "ava.jpg" || rel === "vsevolodi4.jpg") return 128; // кружки по 40px
  return 480; // реклама: колонка 200px и сетка в две колонки
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (IMAGE_RE.test(entry.name)) yield full;
  }
}

let saved = 0;
for await (const file of walk(PUBLIC)) {
  const rel = path.relative(PUBLIC, file).replaceAll("\\", "/");
  const limit = maxSide(rel);
  const input = await readFile(file);
  const before = input.length;
  const image = sharp(input).rotate(); // rotate() — применить EXIF-поворот с телефона
  const { width = 0, height = 0 } = await image.metadata();
  const resize = Math.max(width, height) > limit;

  const ext = path.extname(file).toLowerCase();
  let pipeline = resize ? image.resize(limit, limit, { fit: "inside" }) : image;
  pipeline =
    ext === ".png"
      ? pipeline.png({ compressionLevel: 9, palette: true })
      : ext === ".webp"
        ? pipeline.webp({ quality: 80 })
        : pipeline.jpeg({ quality: 80, mozjpeg: true });
  const out = await pipeline.toBuffer();

  // не стало меньше хотя бы на 10% — оставляем как есть (уже ужатая)
  if (out.length > before * 0.9) {
    console.log(`  ok    ${rel} (${Math.round(before / 1024)} KB)`);
    continue;
  }
  const backup = path.join(ORIGINALS, rel);
  await mkdir(path.dirname(backup), { recursive: true });
  try {
    await stat(backup); // оригинал уже отложен в прошлый раз — не перетираем его ужатым
  } catch {
    await copyFile(file, backup);
  }
  await writeFile(file, out);
  saved += before - out.length;
  console.log(`  сжато ${rel}: ${Math.round(before / 1024)} → ${Math.round(out.length / 1024)} KB`);
}
console.log(`Сэкономлено ${(saved / 1024 / 1024).toFixed(1)} MB`);
