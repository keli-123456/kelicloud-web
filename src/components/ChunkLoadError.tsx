import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canReloadPage, recoverChunkLoadFailure } from "@/lib/chunkLoadRecovery";

export function ChunkLoadError({ error }: { error: unknown }) {
  const { t } = useTranslation();
  const [protectedDraft, setProtectedDraft] = useState(() => !canReloadPage());
  useEffect(() => {
    const updateGuard = () => setProtectedDraft(!canReloadPage());
    window.addEventListener("kelicloud:reload-guard-change", updateGuard);
    updateGuard();
    void recoverChunkLoadFailure(error);
    return () => window.removeEventListener("kelicloud:reload-guard-change", updateGuard);
  }, [error]);
  return (
    <div role="alert" className="m-3 min-w-0 space-y-2 rounded-md border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
      <p>{t("release_recovery.load_failed")}</p>
      {protectedDraft ? <p>{t("release_recovery.draft_retained")}</p> : null}
      <Button type="button" size="sm" variant="outline" disabled={protectedDraft} onClick={() => {
        if (canReloadPage()) window.location.reload();
      }}><RefreshCw className="size-4" />{t("release_recovery.reload")}</Button>
    </div>
  );
}
