// Аватарки для мультиплеера — картинки из public/avatarki. id аватарки — имя файла.
// Список файлов читает сервер (lib/avatars.server.ts): положил картинку в папку — она появилась в выборе.
export const NAME_MAX = 20;

// аватарка по умолчанию у того, кто ещё ничего не выбирал
export const DEFAULT_AVATAR = "vsevolodi4.jpg";

// Секретные аватарки: в выборе их нет, открываются читкодом — набрать слово на клавиатуре прямо на странице выбора.
// Ключ — файл, значение — читкод (латиница, клавиши считаются по физическому месту, раскладка не важна).
export const SECRET_AVATARS: Record<string, string> = {
  "admin.jpg": "morgenshtern",
  "sponge.jpg": "spongebob",
};

export const avatarSrc = (id: string) => `/avatarki/${encodeURIComponent(id)}`;
