type Ad = { text: React.ReactNode; link: string; href: string; image: string | null };

// реклама левой колонки (на узких экранах — под превью); image — путь в public, null → заглушка
export const ADS: Ad[] = [
  {
    text: (
      <>
        <b>ДАЖЕ КОНЧЕННЫЙ ДЕБИЛ</b> сейчас живет в топовом доме. Секрет <b>ОХУИТЕЛЬНЫХ</b> домов в майне простой,
        нужно всего-лишь..
      </>
    ),
    link: "ЧИТАТЬ ДАЛЕЕ",
    href: "https://%D1%81%D1%82%D1%80%D0%BE%D0%B8%D0%BC%D0%B4%D0%BE%D0%BC%D0%B0%D0%B2%D0%BC%D0%B0%D0%B9%D0%BD%D0%B5.%D1%80%D1%84",
    image: "/build.jpg",
  },
  {
    text: (
      <>
        Только <b>СЕГОДНЯ</b>. Акция на <b>БЕСПЛАТНОЕ</b> прослушивание музыки онлайн по сети. Только на этой странице,
        не упусти возможность!
      </>
    ),
    link: "СЛУШАЙ МУЗЫКУ ОНЛАЙН БЕСПЛАТНО",
    href: "https://music.yandex.ru/artist/19352472",
    image: "/dj.jpg",
  },
  {
    text: (
      <>
        ТОЛЬКО сегодня И завтРА НА этой ебеЙШЕЙ странице - SOFTKEY.STORE можно прикупИТЬ АХУЕННЫХ ЛиценЗий. ДАЖЕ
        самый пиздолобый ДАЛБАЁБ разберётся как купить ЕБЕЙШУЮ лицензию. ПОКУПАЙ ЛиценЗИИ прям ща ПРЯМ тут!!
      </>
    ),
    link: "",
    href: "https://softkey.store",
    image: "/softkey.jpg",
  },
];

// реклама под превью, на всех экранах
export const SIDE_ADS: Ad[] = [
  {
    text: (
      <>
        я был НИЩИМ УËБКОМ и мне не давали телки 3 года. ПОСЛЕ ПРОСЛУШИВАНИЯ этого трека они не дают мне прохода!
      </>
    ),
    link: "СЕКРЕТНЫЙ ЗАРАБОТОК В ИНТЕРНЕТЕ ->",
    href: "https://t.me/diphth3riaa",
    image: "/geroy.jpg",
  },
  {
    text: (
      <>
        Мальчик очень сильно хотел попасть под ПИСЕЧНО ПОПОЧНЫЙ ТРИБУНАЛ, но он не ожидал что его встретит ЭТО
        БЕЗУМИЕ...
      </>
    ),
    link: "",
    href: "https://band.link/IS4v8",
    image: "/dengi1.jpg",
  },
  {
    text: <>ХИТРЫЙ СПОСОБ БРОСИТЬ КУРИТЬ ОТ МАКСИМА ПЛАКИНА! КУРИЛ 30 ЛЕТ, БРОСИЛ ЗА ТРИ ДНЯ!</>,
    link: "",
    href: "http://band.link/clinteastwood",
    image: "/max.jpg",
  },
];

/** Тизерная реклама в духе рунета 2010-х: картинка сверху, синий подчёркнутый текст — всё одна ссылка. */
export default function Ads({ ads, className, columns, textSize }: { ads: Ad[]; className: string; columns: string; textSize: string }) {
  return (
    <div className={className}>
      <p className="pb-1 text-[11px] text-muted">Реклама</p>
      <div className={`grid gap-3 ${columns}`}>
        {ads.map((ad) => (
          <a
            key={ad.href}
            href={ad.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex flex-col gap-1.5 bg-surface p-1.5 text-center ${textSize} leading-tight text-ad-link underline decoration-1 underline-offset-2 [font-family:Arial,Helvetica,sans-serif] hover:text-ad-hover`}
          >
            {ad.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.image} alt="" className="aspect-[6/5] w-full object-fill" />
            ) : (
              <span className="flex aspect-[6/5] w-full items-center justify-center border border-dashed border-field-line bg-line text-xs text-muted">
                {/* inline-block — чтобы подчёркивание ссылки не цеплялось к заглушке */}
                <span className="inline-block">картинка</span>
              </span>
            )}
            <span>
              {ad.text} {ad.link}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
