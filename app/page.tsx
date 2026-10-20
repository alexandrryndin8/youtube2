import Link from "next/link";
import Logo from "@/components/Logo";

const PLAY = "M8 5v14l11-7z";
const MENU = "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z";

function Icon({ d, className }: { d: string; className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}

export default function Guide() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 bg-surface shadow-[0_1px_0_var(--line)]">
        <div className="flex h-14 items-center gap-4 px-4">
          <Icon d={MENU} className="size-6 shrink-0 text-muted" />
          <Logo />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[960px] sm:px-6 sm:py-6">
        {/* «плеер» — превью видео с кнопкой ▶, ведущей в игру */}
        <Link
          href="/play"
          className="group relative flex aspect-video w-full items-center justify-center overflow-hidden bg-player text-white"
          aria-label="Начать игру"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mine.jpg" alt="" className="absolute inset-0 size-full object-cover" />
          <span className="relative flex h-12 w-[68px] items-center justify-center rounded-[14px] bg-[#212121]/80 transition group-hover:bg-yt-red sm:h-14 sm:w-20">
            <Icon d={PLAY} className="size-8 sm:size-9" />
          </span>
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/30">
            <span className="block h-full w-0 bg-yt-red transition-all duration-700 group-hover:w-full" />
          </span>
        </Link>

        <div className="px-3 pt-3 sm:px-0 sm:pt-4">
          <p className="text-[13px] text-link">#гайд #правила #ютуб2</p>
          <h1 className="border-b border-line pb-3 pt-1 text-lg leading-snug sm:text-xl">
            Как играть в Ютуб 2 — правила за минуту
          </h1>

          <div className="flex items-center gap-3 border-b border-line py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ava.jpg" alt="Ютуб 2" className="size-10 shrink-0 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Ютуб 2</p>
              <p className="text-xs text-muted">Загадано одно существительное</p>
            </div>
            <a
              href="https://t.me/NeInJIIr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 shrink-0 items-center rounded-[2px] bg-subscribe px-4 text-sm font-medium uppercase tracking-wide text-white hover:bg-[#b80000]"
            >
              Подписаться
            </a>
          </div>

          {/* правила — как описание видео у летсплейщика */}
          <div className="py-4 text-sm leading-relaxed">
            <p className="pb-3 font-medium">Опубликовано: 20 окт. 2026 г.</p>
            <div className="whitespace-pre-line break-words">
              {`ВСЕМ ПРИВЕТ!!! 👋 Сегодня я покажу вам КАК ИГРАТЬ В ЮТУБ 2!!! 😱😱 САМАЯ СЛОЖНАЯ ИГРА НА ЮТУБЕ (99% НЕ УГАДАЮТ!!!) Смотри это видео до самого конца!

Подпишись и Тебе ПОВЕЗЁТ угадать с первой попытки!

=======================================
📌 ПРАВИЛА (ЧИТАТЬ ВСЕМ!!!)
=======================================
1️⃣ Игра загадывает ОДНО СЛОВО (существительное!!!) и находит по нему видосы на ютубе 😳

2️⃣ Тебе показывают ПРЕВЬЮШКУ и название видео, а слово в названии ЗАЦЕНЗУРЕНО вот так: Как нарисовать ■■■ для детей

3️⃣ Пиши ответ в КОММЕНТАРИЯХ!!! Одно слово, только русскими буквами. Падеж не важен, ё и е — одно и то же. Повторяться НЕЛЬЗЯ ❌

4️⃣ Не понял?? Жми ЕЩЁ ПРЕВЬЮ — откроется следующий видос на эту же тему (максимум 5 штук). НО ЧЕМ БОЛЬШЕ ОТКРЫЛ, ТЕМ ДОРОЖЕ ОШИБКИ, ОТНИМАЮТ РЕСПЕКТ!!!

5️⃣ У тебя 100 RESPECT 💪 Каждый неправильный ответ отнимает столько респекта, сколько превьюшек открыто: 1 превью = −1, 3 превью = −3. Угадал — бесплатно! Можно уйти в МИНУС и тогда тебе ПОЗОР 🔴

6️⃣ Сдаться можно всегда — кнопка СДАЮСЬ покажет слово, полные названия и ссылки на видосы

=======================================
И Помните! Чем Больше RESPECT, Тем больше ваш ПЕНИС! :D
=======================================
Если вам понравилось , можете сделать мне приятно) Сыграйте! `}
              <Link href="/play" className="text-link">
                ИГРАТЬ В ЮТУБ 2 →
              </Link>
              {`
Разъебите кнопку лайка =)
-----------------------------------------------------------
-----------------------------------------------------------

`}
              <span className="text-link">
                #ютуб2 #угадайслово #превью #майнкрафт #нуб #нубик #игры #челлендж #респект #видео #санексделалигру
              </span>
            </div>
          </div>

          <div className="flex justify-center border-t border-line pb-10 pt-6">
            <Link
              href="/play"
              className="flex h-12 items-center gap-2 rounded-[2px] bg-subscribe px-8 text-base font-medium uppercase tracking-wide text-white hover:bg-[#b80000]"
            >
              <Icon d={PLAY} className="size-6" />
              Начать игру
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
