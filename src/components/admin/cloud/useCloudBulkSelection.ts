import * as React from "react";

export type UseCloudBulkSelectionResult<T> = {
  selectedKeys: Set<string>;
  selectedItems: T[];
  selectedCount: number;
  allSelected: boolean;
  someSelected: boolean;
  clearSelection: () => void;
  toggleItem: (item: T, checked: boolean) => void;
  toggleAll: (checked: boolean) => void;
  isSelected: (item: T) => boolean;
};

export function useCloudBulkSelection<T>(
  items: T[],
  getKey: (item: T) => string,
): UseCloudBulkSelectionResult<T> {
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(() => new Set());

  const itemKeys = React.useMemo(() => items.map(getKey), [getKey, items]);
  const itemKeySet = React.useMemo(() => new Set(itemKeys), [itemKeys]);

  React.useEffect(() => {
    setSelectedKeys((current) => {
      let changed = false;
      const next = new Set<string>();
      current.forEach((key) => {
        if (itemKeySet.has(key)) {
          next.add(key);
        } else {
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [itemKeySet]);

  const selectedItems = React.useMemo(
    () => items.filter((item) => selectedKeys.has(getKey(item))),
    [getKey, items, selectedKeys],
  );
  const selectedCount = selectedItems.length;
  const allSelected = items.length > 0 && selectedCount === items.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const clearSelection = React.useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  const toggleItem = React.useCallback((item: T, checked: boolean) => {
    const key = getKey(item);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, [getKey]);

  const toggleAll = React.useCallback((checked: boolean) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      itemKeys.forEach((key) => {
        if (checked) {
          next.add(key);
        } else {
          next.delete(key);
        }
      });
      return next;
    });
  }, [itemKeys]);

  const isSelected = React.useCallback(
    (item: T) => selectedKeys.has(getKey(item)),
    [getKey, selectedKeys],
  );

  return {
    selectedKeys,
    selectedItems,
    selectedCount,
    allSelected,
    someSelected,
    clearSelection,
    toggleItem,
    toggleAll,
    isSelected,
  };
}
