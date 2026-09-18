import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getReadableErrorMessage } from "@/lib/apiErrorMessage";

export function CredentialActions({ href, onRefresh }: {
  href: string;
  onRefresh: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const awaitingReturn = useRef(false);
  const pending = useRef(false);
  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await onRefresh();
    } catch (error) {
      setError(getReadableErrorMessage(error, t("form_feedback.refresh_failed")));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }, [onRefresh, t]);

  useEffect(() => {
    const handleReturn = () => {
      if (!awaitingReturn.current || document.visibilityState !== "visible") return;
      awaitingReturn.current = false;
      void refresh();
    };
    window.addEventListener("focus", handleReturn);
    document.addEventListener("visibilitychange", handleReturn);
    return () => {
      window.removeEventListener("focus", handleReturn);
      document.removeEventListener("visibilitychange", handleReturn);
    };
  }, [refresh]);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={href} target="_blank" rel="noopener noreferrer"
            aria-label={t("form_feedback.credentials_new_tab")}
            onClick={() => { awaitingReturn.current = true; }}>
            <ExternalLink className="size-4" />
            {t("form_feedback.credentials")}
          </a>
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void refresh()}>
          <RefreshCw className={busy ? "size-4 animate-spin" : "size-4"} />
          {t("form_feedback.refresh_credentials")}
        </Button>
      </div>
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
