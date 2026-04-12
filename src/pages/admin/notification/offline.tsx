import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormActions, FormField, FormShell } from "@/components/ui/form-shell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  NodeDetailsProvider,
  useNodeDetails,
} from "@/contexts/NodeDetailsContext";
import {
  OfflineNotificationProvider,
  useOfflineNotification,
  type OfflineNotification,
} from "@/contexts/NotificationContext";
import { DataTableShell } from "@/components/admin/DataTableShell";
import React from "react";
import { Pencil, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Loading from "@/components/loading";
import Tips from "@/components/ui/tips";

const OfflinePage = () => {
  return (
    <OfflineNotificationProvider>
      <NodeDetailsProvider>
        <InnerLayout />
      </NodeDetailsProvider>
    </OfflineNotificationProvider>
  );
};
const NotificationEditForm = ({
  initialValues,
  onSubmit,
  loading,
  onCancel,
}: {
  initialValues: { enable: boolean; cooldown: number; grace_period: number };
  onSubmit: (values: {
    enable: boolean;
    cooldown: number;
    grace_period: number;
  }) => void;
  loading?: boolean;
  onCancel?: () => void;
}) => {
  const { t } = useTranslation();
  const [enabled, setEnabled] = React.useState(initialValues.enable);
  // const [cooldown, setCooldown] = React.useState(initialValues.cooldown);
  const [grace, setGrace] = React.useState(initialValues.grace_period);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ enable: enabled, cooldown: 3000, grace_period: grace });
      }}
      className="space-y-4"
    >
      <FormShell>
        <FormField label={t("common.status")} htmlFor="status">
          <Switch
            id="status"
            name="status"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </FormField>
        <FormField
          label={
            <span className="flex items-center gap-2">
              {t("notification.offline.grace_period")}
              <Tips>{t("notification.offline.grace_period_tip")}</Tips>
            </span>
          }
          htmlFor="grace_period"
        >
          <Input
            type="number"
            min={0}
            value={grace}
            onChange={(e) => setGrace(Number(e.target.value))}
            id="grace_period"
            name="grace_period"
          />
        </FormField>
      </FormShell>
      <FormActions className="mt-4">
        {onCancel && (
          <DialogClose asChild>
            <Button
              variant="outline"
              type="button"
              onClick={onCancel}
            >
              {t("common.cancel")}
            </Button>
          </DialogClose>
        )}
        <Button type="submit" disabled={loading}>
          {t("common.save")}
        </Button>
      </FormActions>
    </form>
  );
};

const InnerLayout = () => {
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);
  const {
    loading: onLoading,
    error: onError,
    offlineNotification,
    refresh,
  } = useOfflineNotification();
  const { isLoading: onNodeLoading, error: onNodeError } = useNodeDetails();
  const { t } = useTranslation();
  const [batchLoading, setBatchLoading] = React.useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = React.useState(false);
  const [batchForm, setBatchForm] = React.useState({
    enable: true,
    cooldown: 1800,
    grace_period: 300,
  });

  const getBatchUpdateFailedMessage = (statusText?: string) =>
    statusText
      ? t("notification.offline.batch_update_failed", {
          defaultValue: "Failed to update offline notifications: {{statusText}}",
          statusText,
        })
      : t("notification.offline.batch_update_failed_generic", {
          defaultValue: "Failed to update offline notifications",
        });

  // Batch update selected nodes.
  const handleBatchEdit = (values: {
    enable: boolean;
    cooldown: number;
    grace_period: number;
  }) => {
    setBatchLoading(true);
    const payload = selected.map((id) => ({
      client: id,
      enable: values.enable,
      cooldown: values.cooldown,
      grace_period: values.grace_period,
    }));
    fetch("/api/admin/notification/offline/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || (data?.status && data.status !== "success")) {
          throw new Error(data?.message || getBatchUpdateFailedMessage(res.statusText));
        }
        return data;
      })
      .then(() => {
        toast.success(t("common.updated_successfully"));
        setBatchDialogOpen(false);
        refresh();
      })
      .catch((error) => {
        console.error("Error updating offline notifications:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : getBatchUpdateFailedMessage(),
        );
      })
      .finally(() => {
        setBatchLoading(false);
      });
  };

  if (onLoading || onNodeLoading) {
    return <Loading text={t("loading", "Loading...")} />;
  }
  if (onError || onNodeError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {(onError?.message || onNodeError) ??
          t("notification.offline.load_failed", {
            defaultValue: "Failed to load offline notification settings",
          })}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 p-1 text-slate-900 dark:text-slate-100 md:p-4">
      <label className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {t("notification.offline.full_title", "Offline Alerts Configuration")}
      </label>
      <DataTableShell
        search={
          <div className="relative max-w-64">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder={t("common.search")}
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              className="pl-8"
            />
          </div>
        }
        batchActions={
          <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                onClick={() => {
                  // Seed the form from the first selected item.
                  const first = offlineNotification.find(
                    (n) => n.client === selected[0]
                  );
                  setBatchForm({
                    enable: first?.enable ?? true,
                    cooldown: first?.cooldown ?? 1800,
                    grace_period: first?.grace_period ?? 300,
                  });
                }}
                disabled={batchLoading || selected.length === 0}
              >
                {t("notification.offline.batch_edit")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>{t("notification.offline.batch_edit")}</DialogTitle>
              <NotificationEditForm
                initialValues={batchForm}
                loading={batchLoading}
                onSubmit={handleBatchEdit}
                onCancel={() => setBatchDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        }
      >
        <OfflineNotificationTable
          search={search}
          selected={selected}
          onSelectionChange={setSelected}
        />
      </DataTableShell>
      <label className="text-sm text-muted-foreground">
        {t("common.selected", {
          count: selected.length,
        })}
      </label>
      <label className="text-sm text-muted-foreground">
        <span
          dangerouslySetInnerHTML={{ __html: t("notification.offline.tips") }}
        />
      </label>
    </div>
  );
};

const OfflineNotificationTable = ({
  search,
  selected,
  onSelectionChange,
}: {
  search: string;
  selected: string[];
  onSelectionChange: (ids: string[]) => void;
}) => {
  const { offlineNotification } = useOfflineNotification();
  const { nodeDetail } = useNodeDetails();
  const { t } = useTranslation();
  const filtered = [...nodeDetail]
    .sort((a, b) => a.weight - b.weight)
    .filter((node) => node.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-6">
              <Checkbox
                checked={
                  selected.length === filtered.length
                    ? true
                    : selected.length > 0
                    ? "indeterminate"
                    : false
                }
                onCheckedChange={(checked) =>
                  onSelectionChange(checked ? filtered.map((n) => n.uuid) : [])
                }
              />
            </TableHead>
            <TableHead>{t("common.server")}</TableHead>
            <TableHead>{t("common.status")}</TableHead>
            {/* <TableHead>{t("notification.offline.cooldown")}</TableHead> */}
            <TableHead>{t("notification.offline.grace_period")}</TableHead>
            <TableHead>{t("notification.offline.last_notified")}</TableHead>
            <TableHead>{t("common.action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((node) => (
            <TableRow key={node.uuid}>
              <TableCell>
                <Checkbox
                  checked={selected.includes(node.uuid)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onSelectionChange([...selected, node.uuid]);
                    } else {
                      onSelectionChange(
                        selected.filter((id) => id !== node.uuid)
                      );
                    }
                  }}
                />
              </TableCell>
              <TableCell>{node.name}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    offlineNotification.find((n) => n.client === node.uuid)
                      ?.enable
                      ? "success"
                      : "destructive"
                  }
                >
                  {offlineNotification.find((n) => n.client === node.uuid)
                    ?.enable
                    ? t("common.enabled")
                    : t("common.disabled")}
                </Badge>
              </TableCell>
              {/* <TableCell>
                {offlineNotification.find((n) => n.client === node.uuid)
                  ?.cooldown || 1800}{" "}
                {t("nodeCard.time_second")}
              </TableCell> */}
              <TableCell>
                {offlineNotification.find((n) => n.client === node.uuid)
                  ?.grace_period || 300}
                {t("nodeCard.time_second")}
              </TableCell>
              <TableCell>
                {(() => {
                  const lastNotified = offlineNotification.find(
                    (n) => n.client === node.uuid
                  )?.last_notified;
                  if (!lastNotified) return "-";
                  const date = new Date(lastNotified);
                  if (date.getFullYear() < 3)
                    return t("notification.offline.never_triggered");
                  return date.toLocaleString();
                })()}
              </TableCell>
              <TableCell>
                <ActionButtons
                  offlineNotifications={offlineNotification.find(
                    (n) => n.client === node.uuid
                  )}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const ActionButtons = ({
  offlineNotifications,
}: {
  offlineNotifications: OfflineNotification | undefined;
}) => {
  const { t } = useTranslation();
  const { refresh } = useOfflineNotification();
  const [editOpen, setEditOpen] = React.useState(false);
  const [editSaving, setEditSaving] = React.useState(false);
  const getSaveFailedMessage = (statusText?: string) =>
    statusText
      ? t("notification.offline.save_failed", {
          defaultValue:
            "Failed to save offline notification settings: {{statusText}}",
          statusText,
        })
      : t("notification.offline.save_failed_generic", {
          defaultValue: "Failed to save offline notification settings",
        });

  return (
    <div className="flex items-center gap-2">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("common.edit", { defaultValue: "Edit" })}
          >
            <Pencil size={16} />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>{t("common.edit")}</DialogTitle>
          <NotificationEditForm
            initialValues={{
              enable: offlineNotifications?.enable ?? false,
              cooldown: offlineNotifications?.cooldown ?? 1800,
              grace_period: offlineNotifications?.grace_period ?? 300,
            }}
            loading={editSaving}
            onSubmit={(values) => {
              setEditSaving(true);
              fetch("/api/admin/notification/offline/edit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify([
                  {
                    client: offlineNotifications?.client,
                    ...values,
                  },
                ]),
              })
                .then(async (res) => {
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok || (data?.status && data.status !== "success")) {
                    throw new Error(data?.message || getSaveFailedMessage(res.statusText));
                  }
                  return data;
                })
                .then(() => {
                  toast.success(t("common.updated_successfully"));
                  setEditOpen(false);
                  refresh();
                })
                .catch((error) => {
                  console.error(
                    "Error saving offline notification settings:",
                    error
                  );
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : getSaveFailedMessage(),
                  );
                })
                .finally(() => {
                  setEditSaving(false);
                });
            }}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfflinePage;
