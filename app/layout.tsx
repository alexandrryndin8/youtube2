import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Ютуб 2 игра",
  description: "Угадай слово, по которому нашлись превью с ютуба",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#212121" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // тему ставит инлайн-скрипт до гидрации — React не должен ругаться на data-theme
    <html
      lang="ru"
      data-theme="light"
      // плавная прокрутка по якорям (#rules), а переходы между страницами Next оставляет мгновенными
      data-scroll-behavior="smooth"
      className={`${roboto.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
