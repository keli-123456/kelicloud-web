import React from "react";

import type {
  DigitalOceanTokenPool,
  DigitalOceanTokenRecord,
} from "@/lib/cloud";

export function useDigitalOceanTokenSelection(tokenPool: DigitalOceanTokenPool | null) {
  const [selectedTokenIds, setSelectedTokenIds] = React.useState<string[]>([]);
  const [tokenGroupEditorOpen, setTokenGroupEditorOpen] = React.useState(false);
  const [tokenGroupEditorValue, setTokenGroupEditorValue] = React.useState("");
  const [tokenGroupEditorIds, setTokenGroupEditorIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    setSelectedTokenIds((current) => {
      if (current.length === 0) {
        return current;
      }

      const validIds = new Set((tokenPool?.tokens ?? []).map((token) => token.id));
      const next = current.filter((id) => validIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [tokenPool]);

  const tokenRows = React.useMemo(() => tokenPool?.tokens ?? [], [tokenPool?.tokens]);
  const existingTokenGroups = React.useMemo(
    () =>
      Array.from(new Set(
        tokenRows
          .map((token) => token.group.trim())
          .filter(Boolean),
      )),
    [tokenRows],
  );
  const selectedTokenIdSet = React.useMemo(() => new Set(selectedTokenIds), [selectedTokenIds]);
  const selectedTokens = React.useMemo(
    () => tokenRows.filter((token) => selectedTokenIdSet.has(token.id)),
    [selectedTokenIdSet, tokenRows],
  );
  const allTokensSelected = tokenRows.length > 0 && selectedTokenIds.length === tokenRows.length;
  const someTokensSelected = selectedTokenIds.length > 0 && selectedTokenIds.length < tokenRows.length;

  const removeTokenSelection = React.useCallback((removedTokenIds: string[]) => {
    setSelectedTokenIds((current) => current.filter((id) => !removedTokenIds.includes(id)));
  }, []);

  const toggleTokenSelection = React.useCallback((tokenId: string, checked: boolean) => {
    setSelectedTokenIds((current) => {
      if (checked) {
        return current.includes(tokenId) ? current : [...current, tokenId];
      }
      return current.filter((id) => id !== tokenId);
    });
  }, []);

  const openTokenGroupEditor = React.useCallback((tokens: DigitalOceanTokenRecord[]) => {
    if (!tokens.length) {
      return;
    }
    const groups = Array.from(new Set(tokens.map((token) => token.group.trim())));
    setTokenGroupEditorIds(tokens.map((token) => token.id));
    setTokenGroupEditorValue(groups.length === 1 ? groups[0] : "");
    setTokenGroupEditorOpen(true);
  }, []);

  return {
    selectedTokenIds,
    setSelectedTokenIds,
    selectedTokens,
    tokenRows,
    existingTokenGroups,
    allTokensSelected,
    someTokensSelected,
    tokenGroupEditorOpen,
    setTokenGroupEditorOpen,
    tokenGroupEditorValue,
    setTokenGroupEditorValue,
    tokenGroupEditorIds,
    setTokenGroupEditorIds,
    removeTokenSelection,
    toggleTokenSelection,
    openTokenGroupEditor,
  };
}
