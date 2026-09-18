import { useTranslation } from "react-i18next";
import type { useSettingSave } from "./useSettingSave";

export function SettingSaveFeedback({
  id, state, dirty = false, showSuccess = true, busy = false,
}: {
  id?: string;
  state: Pick<ReturnType<typeof useSettingSave>, "status" | "error">;
  dirty?: boolean;
  showSuccess?: boolean;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  const message = state.error || (busy || state.status === "saving"
    ? t("form_feedback.saving")
    : dirty ? t("form_feedback.unsaved")
    : showSuccess && state.status === "saved" ? t("form_feedback.saved") : "");
  return (
    <p id={id} role={state.error ? "alert" : "status"}
      className={message ? `break-words text-xs leading-5 ${state.error ? "text-destructive" : "text-muted-foreground"}` : "sr-only"}>
      {message}
    </p>
  );
}
