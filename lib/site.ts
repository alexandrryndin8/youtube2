// Адрес сайта для ссылок-приглашений. В браузере location.origin для кириллического домена —
// это punycode (https://www.xn--...), а людям надо показывать и копировать www.ютуб2.рф.
// Локально (next dev) — адрес, на котором открыт сайт, чтобы ссылка работала на этой машине.
// Другой домен — переменная окружения NEXT_PUBLIC_SITE_URL.
const PRODUCTION_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ютуб2.рф";

export function siteUrl(): string {
  return process.env.NODE_ENV === "production" ? PRODUCTION_URL : location.origin;
}
