import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** false при серверном рендере и гидрации, true после — для того, что читает localStorage. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
