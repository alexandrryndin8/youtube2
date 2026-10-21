// без похожих друг на друга 0/O, 1/I/L
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

/**
 * То, что ввели или вставили в поле кода, -> код: из ссылки вида …/room/abc123 берём хвост,
 * поднимаем регистр и выкидываем всё, чего нет в алфавите (кириллицу, спецсимволы, 0/O, 1/I/L).
 */
export function parseRoomCode(input: string): string {
  const last = input.includes("/") ? (input.trim().replace(/\/+$/, "").split("/").pop() ?? "") : input;
  return Array.from(last.toUpperCase())
    .filter((c) => CODE_ALPHABET.includes(c))
    .join("")
    .slice(0, CODE_LENGTH);
}
