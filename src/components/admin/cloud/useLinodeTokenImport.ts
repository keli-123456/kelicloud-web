import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  saveLinodeTokens,
  type LinodeTokenPool,
} from "@/lib/cloudLinode";
import {
  hasActiveToken,
  getStoredTokenGroup,
  parseTokenImports,
  setStoredTokenGroup,
  toErrorMessage,
} from "./linodePanelUtils";

type UseLinodeTokenImportOptions = {
  t: TFunction;
  tokenPool: LinodeTokenPool | null;
  setTokenPool: React.Dispatch<React.SetStateAction<LinodeTokenPool | null>>;
  shouldPreserveLoadedResources: (nextPool: LinodeTokenPool) => boolean;
  clearPanelState: () => void;
};

export function useLinodeTokenImport({
  t,
  tokenPool,
  setTokenPool,
  shouldPreserveLoadedResources,
  clearPanelState,
}: UseLinodeTokenImportOptions) {
  const [tokenImportOpen, setTokenImportOpen] = React.useState(false);
  const [tokenImportText, setTokenImportText] = React.useState("");
  const [tokenImportGroup, setTokenImportGroup] = React.useState(() => getStoredTokenGroup());
  const [tokenImportSaving, setTokenImportSaving] = React.useState(false);

  const handleImportTokens = async () => {
    const importGroup = tokenImportGroup.trim();
    const tokens = parseTokenImports(tokenImportText).map((token) => ({
      ...token,
      group: importGroup,
    }));
    if (!tokens.length) {
      toast.error(t("cloud.tokens.import_empty", "No valid tokens found"));
      return;
    }

    setTokenImportSaving(true);
    try {
      const nextPool = await saveLinodeTokens({
        tokens,
        active_token_id: tokenPool?.active_token_id || undefined,
      });
      setTokenPool(nextPool);
      setTokenImportText("");
      setTokenImportGroup(importGroup);
      setTokenImportOpen(false);
      setStoredTokenGroup(importGroup);
      toast.success(
        t("cloud.tokens.import_success", {
          count: tokens.length,
          defaultValue: `Imported ${tokens.length} tokens`,
        }),
      );
      if (!hasActiveToken(nextPool) || !shouldPreserveLoadedResources(nextPool)) {
        clearPanelState();
      }
    } catch (saveError) {
      toast.error(toErrorMessage(saveError));
    } finally {
      setTokenImportSaving(false);
    }
  };

  return {
    tokenImportOpen,
    setTokenImportOpen,
    tokenImportText,
    setTokenImportText,
    tokenImportGroup,
    setTokenImportGroup,
    tokenImportSaving,
    handleImportTokens,
  };
}
