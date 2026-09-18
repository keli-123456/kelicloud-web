import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useBlocker, type BlockerFunction } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NavigationGuardContext, type Guard, type RegisterGuard } from "./useNavigationGuard";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const guards = useRef(new Map<string, Guard>());
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const register = useCallback<RegisterGuard>((id, guard) => {
    if (guard && (guard.dirty || guard.busy)) guards.current.set(id, guard);
    else guards.current.delete(id);
    setBusy([...guards.current.values()].some((item) => item.busy));
    setActive(guards.current.size > 0);
  }, []);
  // One blocker owns all editors, including nested forms.
  const blocker = useBlocker(useCallback<BlockerFunction>(({ currentLocation, nextLocation }) => (
    guards.current.size > 0 && (
      currentLocation.pathname !== nextLocation.pathname ||
      currentLocation.search !== nextLocation.search
    )
  ), []));

  useEffect(() => {
    if (!active && blocker.state === "blocked") blocker.proceed();
  }, [active, blocker]);

  return (
    <NavigationGuardContext.Provider value={register}>
      {children}
      <AlertDialog open={blocker.state === "blocked"} onOpenChange={(open) => {
        if (!open && blocker.state === "blocked") blocker.reset();
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(busy ? "form_feedback.saving" : "form_draft.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t(busy ? "form_draft.wait_for_save" : "form_draft.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("form_draft.keep_editing")}</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(event) => {
              event.preventDefault();
              if (blocker.state === "blocked") blocker.proceed();
            }}>{t("form_draft.discard")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </NavigationGuardContext.Provider>
  );
}
