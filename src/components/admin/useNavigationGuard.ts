import { createContext, useContext, useEffect, useId } from "react";

export type Guard = { dirty: boolean; busy: boolean };
export type RegisterGuard = (id: string, guard: Guard | null) => void;
export const NavigationGuardContext = createContext<RegisterGuard | null>(null);

export function useNavigationGuard(dirty: boolean, busy = false) {
  const register = useContext(NavigationGuardContext);
  const id = useId();
  useEffect(() => {
    register?.(id, { dirty, busy });
    return () => register?.(id, null);
  }, [register, id, dirty, busy]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    const preventReload = (event: Event) => event.preventDefault();
    window.addEventListener("kelicloud:before-reload", preventReload);
    window.dispatchEvent(new Event("kelicloud:reload-guard-change"));
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("kelicloud:before-reload", preventReload);
      window.dispatchEvent(new Event("kelicloud:reload-guard-change"));
    };
  }, [dirty, busy]);
}
