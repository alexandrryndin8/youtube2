export type Theme = "light" | "dark";

export const THEME_KEY = "theme";

/**
 * Ставит на <html> сохранённую тему, а если её нет — системную.
 * Должна быть самодостаточной: её исходник целиком уходит инлайн-скриптом в <head>.
 */
export function applyTheme() {
  try {
    let t = localStorage.getItem("theme");
    if (t !== "dark" && t !== "light") t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", t);
  } catch {}
}

// выполняется до первой отрисовки, чтобы тёмная тема не мигала светлой
export const THEME_SCRIPT = `(${applyTheme})()`;
