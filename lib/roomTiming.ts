// Тайминги мультиплеера, общие для сервера (lib/rooms.ts) и клиента (Room.tsx).

// игрок отмечается «я тут» раз в PING_MS; сервер считает его не в сети, если отметок нет дольше ONLINE_MS
export const PING_MS = 20_000;
export const ONLINE_MS = 45_000;

// как часто клиент спрашивает состояние комнаты и сколько CDN держит ответ:
// сколько бы игроков ни опрашивали, хранилище читается не чаще раза в STATE_CDN_SECONDS на комнату
export const POLL_MS = 1500;
export const STATE_CDN_SECONDS = 1;
// вкладка в фоне — опрашиваем реже
export const POLL_HIDDEN_MS = 5000;
