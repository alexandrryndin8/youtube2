import Link from "next/link";

/** Логотип «Ютуб 2» — всегда ведёт на главную с правилами. */
export default function Logo() {
  return (
    <Link href="/" className="shrink-0" aria-label="Ютуб 2 — на главную">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/youtube2.jpg" alt="Ютуб 2" className="h-8 w-auto" />
    </Link>
  );
}
