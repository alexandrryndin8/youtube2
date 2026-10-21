"use client";

import { useLayoutEffect } from "react";
import Icon, { ICONS } from "@/components/Icon";
import { applyTheme, THEME_KEY, type Theme } from "@/lib/theme";

const REVEAL_MS = 700;

/** Кнопка светлая/тёмная тема. Какую иконку показать, решает CSS по data-theme — без гидрационных расхождений. */
export default function ThemeToggle() {
  // в dev React на повторном монтировании сбрасывает атрибуты <html> — ставим тему заново, в проде это пустая операция
  useLayoutEffect(applyTheme, []);

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    const html = document.documentElement;
    const next: Theme = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    const apply = () => {
      html.setAttribute("data-theme", next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {}
    };

    // без View Transitions (старые браузеры) или при «меньше движения» — просто переключаем
    if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();

    // новая тема расходится кругом от кнопки до самого дальнего угла экрана
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    html.style.setProperty("--reveal-x", `${x}px`);
    html.style.setProperty("--reveal-y", `${y}px`);
    html.classList.add("theme-switching");
    const transition = document.startViewTransition(apply);
    transition.ready.then(() =>
      html.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: REVEAL_MS,
          easing: "cubic-bezier(0.65, 0, 0.35, 1)",
          // держим конечный круг, пока переход не снят, — иначе в конце мелькнёт старая тема
          fill: "forwards",
          pseudoElement: "::view-transition-new(root)",
        },
      ),
    );
    transition.finished.finally(() => html.classList.remove("theme-switching"));
  }

  return (
    <button
      onClick={toggle}
      className="shrink-0 text-muted hover:text-foreground"
      aria-label="Сменить тему"
      title="Сменить тему"
    >
      {/* анимация перезапускается, когда иконка снова становится видимой — она и проворачивается при смене */}
      <Icon d={ICONS.moon} className="size-6 animate-theme-icon dark:hidden" />
      <Icon d={ICONS.sun} className="hidden size-6 animate-theme-icon dark:block" />
    </button>
  );
}
