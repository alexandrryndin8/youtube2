// Сложность игры — одиночной и на сервере. Общий для клиента и сервера: сервер по ней решает, что отдавать в раунде.
//   easy   — видно, сколько букв в слове, можно открывать буквы подсказками и смотреть первые секунды видео
//   normal — названия с закрытым словом, как было изначально
//   hard   — названий нет вообще, угадываешь только по превью
export const DIFFICULTIES = ["easy", "normal", "hard"] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Лёгкий",
  normal: "Обычный",
  hard: "Сложный",
};

export const isDifficulty = (v: unknown): v is Difficulty => DIFFICULTIES.includes(v as Difficulty);

// лёгкий режим: сколько секунд видео можно посмотреть и сколько респекта стоит одна открытая буква
export const CLIP_SECONDS = 4;
export const HINT_COST = 10;

// для выбора режима: чем режимы отличаются друг от друга
export const DIFFICULTY_INFO: Record<Difficulty, string[]> = {
  easy: [
    "Видно, сколько букв в слове",
    `Подсказка открывает случайную букву: −${HINT_COST} респекта`,
    `Можно посмотреть первые ${CLIP_SECONDS} секунды каждого видео со звуком`,
  ],
  normal: ["Превью и названия видео, загаданное слово в названиях закрыто ■■■"],
  hard: ["Названий нет — угадываешь только по картинкам превью", "Ни подсказок, ни видео"],
};
