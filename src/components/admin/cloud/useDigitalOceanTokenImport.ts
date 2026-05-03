import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  saveDigitalOceanTokens,
  type DigitalOceanTokenPool,
} from "@/lib/cloud";
import {
  getStoredTokenGroup,
  hasActiveToken,
  parseTokenImports,
  setStoredTokenGroup,
  toErrorMessage,
} from "./digitalOceanPanelUtils";

type UseDigitalOceanTokenImportOptions = {
  t: TFunction;
  tokenPool: DigitalOceanTokenPool | null;
  setTokenPool: React.Dispatch<React.SetStateAction<DigitalOceanTokenPool | null>>;
  shouldPreserveLoadedResources: (nextPool: DigitalOceanTokenPool) => boolean;
  clearPanelState: () => void;
};

export function useDigitalOceanTokenImport({
  t,
  tokenPool,
  setTokenPool,
  shouldPreserveLoadedResources,
  clearPanelState,
}: UseDigitalOceanTokenImportOptions) {
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
      const nextPool = await saveDigitalOceanTokens({
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
