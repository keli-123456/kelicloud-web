import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { useNavigationGuard } from "./useNavigationGuard";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const GuardedDialogClose = DialogClose;

export function GuardedDialog({ open, onOpenChange, dirty, busy = false, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dirty: boolean;
  busy?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [confirmClose, setConfirmClose] = useState(false);
  useNavigationGuard(open && dirty, open && busy);

  useEffect(() => {
    if (!open) setConfirmClose(false);
  }, [open]);

  const requestOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && busy) return;
    if (!nextOpen && dirty) {
      setConfirmClose(true);
      return;
    }
    onOpenChange(nextOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={requestOpenChange}>{children}</Dialog>
      <AlertDialog open={open && confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("form_draft.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("form_draft.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("form_draft.keep_editing")}</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => {
              setConfirmClose(false);
              onOpenChange(false);
            }}>{t("form_draft.discard")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
