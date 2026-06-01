import * as React from "react";
import type { TFunction } from "i18next";
import { Trash2, X } from "lucide-react";

import {
  Badge,
  Button,
  Checkbox,
} from "@/components/admin/cloud/cloud-ui";

type UseCloudBulkSelectionResult<T> = {
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

function useCloudBulkSelection<T>(
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

type CloudBulkDeleteToolbarProps = {
  t: TFunction;
  selectedCount: number;
  totalCount: number;
  deleting?: boolean;
  hideWhenEmpty?: boolean;
  onClear: () => void;
  onDelete: () => void;
};

function CloudBulkDeleteToolbar({
  t,
  selectedCount,
  totalCount,
  deleting = false,
  hideWhenEmpty = false,
  onClear,
  onDelete,
}: CloudBulkDeleteToolbarProps) {
  if (selectedCount <= 0) {
    if (hideWhenEmpty) {
      return null;
    }
    return (
      <Badge color="blue">
        {totalCount}
      </Badge>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
      <Badge color="blue">
        {t("cloud.bulk.selected_count", {
          count: selectedCount,
          defaultValue: `已选 ${selectedCount}`,
        })}
      </Badge>
      <Button
        type="button"
        variant="outline"
        size="1"
        onClick={onClear}
        disabled={deleting}
      >
        <X className="mr-1 h-3.5 w-3.5" />
        {t("common.clear", "清除")}
      </Button>
      <Button
        type="button"
        color="red"
        variant="soft"
        size="1"
        onClick={onDelete}
        disabled={deleting}
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        {deleting
          ? t("cloud.bulk.deleting", "删除中")
          : t("cloud.bulk.delete_selected", "删除选中")}
      </Button>
    </div>
  );
}

type CloudBulkSelectCheckboxProps = {
  checked: boolean | "indeterminate";
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
};

function CloudBulkSelectCheckbox({
  checked,
  disabled,
  label,
  onCheckedChange,
}: CloudBulkSelectCheckboxProps) {
  return (
    <Checkbox
      size="1"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onCheckedChange={(value) => onCheckedChange(value === true)}
    />
  );
}

export {
  CloudBulkDeleteToolbar,
  CloudBulkSelectCheckbox,
  useCloudBulkSelection,
};
