import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  saveLinodeTokens,
  type LinodeTokenPool,
  type LinodeTokenRecord,
} from "@/lib/cloudLinode";
import {
  setStoredTokenGroup,
  toErrorMessage,
} from "./linodePanelUtils";

type UseLinodeTokenGroupSaveOptions = {
  t: TFunction;
  tokenPool: LinodeTokenPool | null;
  setTokenPool: React.Dispatch<React.SetStateAction<LinodeTokenPool | null>>;
  tokenRows: LinodeTokenRecord[];
  tokenGroupEditorIds: string[];
  setTokenGroupEditorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  tokenGroupEditorValue: string;
  setTokenGroupEditorValue: React.Dispatch<React.SetStateAction<string>>;
  setTokenGroupEditorIds: React.Dispatch<React.SetStateAction<string[]>>;
};

export function useLinodeTokenGroupSave({
  t,
  tokenPool,
  setTokenPool,
  tokenRows,
  tokenGroupEditorIds,
  setTokenGroupEditorOpen,
  tokenGroupEditorValue,
  setTokenGroupEditorValue,
  setTokenGroupEditorIds,
}: UseLinodeTokenGroupSaveOptions) {
  const [tokenGroupSaving, setTokenGroupSaving] = React.useState(false);

  const handleSaveTokenGroup = async () => {
    if (!tokenGroupEditorIds.length || !tokenPool) {
      return;
    }

    const updates = tokenRows
      .filter((token) => tokenGroupEditorIds.includes(token.id))
      .map((token) => ({
        id: token.id,
        name: token.name,
        group: tokenGroupEditorValue.trim(),
        token: "",
      }));

    if (!updates.length) {
      setTokenGroupEditorOpen(false);
      return;
    }

    setTokenGroupSaving(true);
    try {
      const nextPool = await saveLinodeTokens({
        tokens: updates,
        active_token_id: tokenPool.active_token_id || undefined,
      });
      setTokenPool(nextPool);
      setTokenGroupEditorOpen(false);
      setTokenGroupEditorIds([]);
      setTokenGroupEditorValue("");
      setStoredTokenGroup(tokenGroupEditorValue);
      toast.success(t("cloud.tokens.group_save_success", "Token group updated"));
    } catch (saveError) {
      toast.error(toErrorMessage(saveError));
    } finally {
      setTokenGroupSaving(false);
    }
  };

  return {
    tokenGroupSaving,
    handleSaveTokenGroup,
  };
}
