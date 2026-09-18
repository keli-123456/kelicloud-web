import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getReadableErrorMessage } from "@/lib/apiErrorMessage";

export function useSettingSave() {
  const { t } = useTranslation();
  const pending = useRef(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const reset = useCallback(() => {
    if (!pending.current) {
      setStatus("idle");
      setError("");
    }
  }, []);
  const run = async (action: () => unknown) => {
    if (pending.current) return false;
    pending.current = true;
    setStatus("saving");
    setError("");
    try {
      await action();
      setStatus("saved");
      return true;
    } catch (error) {
      setError(getReadableErrorMessage(error, t("form_feedback.failed")));
      setStatus("error");
      return false;
    } finally {
      pending.current = false;
    }
  };
  return { status, error, pending, run, reset };
}
