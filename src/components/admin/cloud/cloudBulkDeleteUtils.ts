import type { TFunction } from "i18next";
import { toast } from "sonner";

import type { ConfirmDialogOptions } from "@/components/ui/warning-dialog";

type ConfirmDialog = (options: ConfirmDialogOptions) => Promise<boolean>;

function formatNameList(names: string[]) {
  const preview = names.slice(0, 6).join("、");
  if (names.length <= 6) {
    return preview;
  }
  return `${preview} 等 ${names.length} 台`;
}

async function confirmCloudBulkDelete({
  t,
  confirm,
  names,
}: {
  t: TFunction;
  confirm: ConfirmDialog;
  names: string[];
}) {
  if (names.length === 0) {
    return false;
  }

  const nameList = formatNameList(names);
  return confirm({
    title: t("cloud.bulk.delete_title", "批量删除实例"),
    description: t("cloud.bulk.delete_confirm", {
      count: names.length,
      names: nameList,
      defaultValue: `将删除 ${names.length} 台实例：${nameList}。此操作不可撤销。`,
    }),
    confirmLabel: t("cloud.bulk.delete_selected", "删除选中"),
    tone: "destructive",
  });
}

async function runCloudBulkDelete<T>({
  t,
  items,
  getName,
  deleteItem,
  formatError,
}: {
  t: TFunction;
  items: T[];
  getName: (item: T) => string;
  deleteItem: (item: T) => Promise<void>;
  formatError: (error: unknown) => string;
}) {
  let successCount = 0;
  const failures: string[] = [];

  for (const item of items) {
    const name = getName(item);
    try {
      await deleteItem(item);
      successCount += 1;
    } catch (error) {
      failures.push(`${name}: ${formatError(error)}`);
    }
  }

  if (failures.length === 0) {
    toast.success(t("cloud.bulk.delete_success", {
      count: successCount,
      defaultValue: `已删除 ${successCount} 台实例。`,
    }));
  } else {
    toast.warning(t("cloud.bulk.delete_partial", {
      success: successCount,
      failed: failures.length,
      defaultValue: `已删除 ${successCount} 台，${failures.length} 台失败。`,
    }));
    failures.slice(0, 3).forEach((message) => toast.error(message));
  }

  return {
    failedCount: failures.length,
    successCount,
  };
}

export {
  confirmCloudBulkDelete,
  runCloudBulkDelete,
};
