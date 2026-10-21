// Кто ты на сервере: id и секрет игрока. В sessionStorage — у каждой вкладки свой игрок,
// а перезагрузка страницы не выкидывает с сервера.
export type Session = { player: string; key: string };

const storageKey = (code: string) => `room:${code}`;

export function loadSession(code: string): Session | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(storageKey(code)) ?? "null");
    return s && typeof s.player === "string" && typeof s.key === "string" ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(code: string, session: Session) {
  try {
    sessionStorage.setItem(storageKey(code), JSON.stringify(session));
  } catch {}
}

export function clearSession(code: string) {
  try {
    sessionStorage.removeItem(storageKey(code));
  } catch {}
}
