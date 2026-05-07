import { Checkbox } from "@/components/ui/checkbox";
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
import React from "react";
import { Pencil, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  Dialog,
  Flex,
  IconButton,
  Switch,
  TextField,
} from "@/components/admin/admin-ui";
import { toast } from "sonner";
import { AdminTableSkeleton } from "@/components/admin/AdminPageShell";
import {
  ADMIN_FORM_DIALOG_CLASS,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_SCROLL_CLASS,
  ADMIN_FORM_TOGGLE_CLASS,
} from "@/components/admin/AdminFormStyles";
import Tips from "@/components/ui/tips";
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";

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
      className={`${ADMIN_FORM_SCROLL_CLASS} mt-4 space-y-4`}
    >
      <div className={ADMIN_FORM_TOGGLE_CLASS}>
        <label htmlFor="status" className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {t("common.status")}
        </label>
        <Switch
          id="status"
          name="status"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>
      {/* <label htmlFor="cooldown">{t("notification.offline.cooldown")}</label>
      <TextField.Root
        type="number"
        min={0}
        value={cooldown}
        onChange={e => setCooldown(Number(e.target.value))}
        id="cooldown"
        name="cooldown"
      /> */}
      <div className={ADMIN_FORM_FIELD_CLASS}>
        <label htmlFor="grace_period" className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
          {t("notification.offline.grace_period")}<Tips>{t("notification.offline.grace_period_tip")}</Tips>
        </label>
        <TextField.Root
          type="number"
          min={0}
          value={grace}
          onChange={(e) => setGrace(Number(e.target.value))}
          id="grace_period"
          name="grace_period"
        />
      </div>
      <Flex gap="2" justify="end" className="border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
        {onCancel && (
          <Dialog.Close>
            <Button
              variant="soft"
              color="gray"
              type="button"
              onClick={onCancel}
            >
              {t("common.cancel")}
            </Button>
          </Dialog.Close>
        )}
        <Button variant="solid" type="submit" disabled={loading}>
          {t("common.save")}
        </Button>
      </Flex>
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
          throw new Error(formatApiErrorMessage(data?.message || getBatchUpdateFailedMessage(res.statusText), { status: res.status }));
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
          getReadableErrorMessage(error, getBatchUpdateFailedMessage()),
        );
      })
      .finally(() => {
        setBatchLoading(false);
      });
  };

  if (onLoading || onNodeLoading) {
    return (
      <div className="flex flex-col gap-4 p-1 text-slate-900 dark:text-slate-100 md:p-4">
        <Flex justify="between" align="center" wrap="wrap">
          <label className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {t("notification.offline.full_title", "Offline Alerts Configuration")}
          </label>
          <TextField.Root
            type="text"
            className="max-w-64"
            placeholder={t("common.search")}
            disabled
          >
            <TextField.Slot>
              <Search size={16} />
            </TextField.Slot>
          </TextField.Root>
        </Flex>
        <AdminTableSkeleton columns={6} rows={6} />
        <label className="text-sm text-muted-foreground">
          {t("common.selected", { count: 0 })}
        </label>
        <Flex gap="2" align="center">
          <Button variant="soft" disabled>
            {t("notification.offline.batch_edit")}
          </Button>
        </Flex>
      </div>
    );
  }
  if (onError || onNodeError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {(onError?.message || onNodeError) ??
          t("notification.offline.load_failed", {
            defaultValue: "Failed to load offline notification settings",
          })}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 p-1 text-slate-900 dark:text-slate-100 md:p-4">
      <Flex justify="between" align="center" wrap="wrap">
        <label className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t("notification.offline.full_title", "Offline Alerts Configuration")}
        </label>
        <TextField.Root
          type="text"
          className="max-w-64"
          placeholder={t("common.search")}
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
        >
          <TextField.Slot>
            <Search size={16} />
          </TextField.Slot>
        </TextField.Root>
      </Flex>
      <OfflineNotificationTable
        search={search}
        selected={selected}
        onSelectionChange={setSelected}
      />
      <label className="text-sm text-muted-foreground">
        {t("common.selected", {
          count: selected.length,
        })}
      </label>
      <Flex gap="2" align="center">
        <Dialog.Root open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
          <Dialog.Trigger>
            <Button
              variant="soft"
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
          </Dialog.Trigger>
          <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={560}>
            <Dialog.Title>{t("notification.offline.batch_edit")}</Dialog.Title>
            <NotificationEditForm
              initialValues={batchForm}
              loading={batchLoading}
              onSubmit={handleBatchEdit}
              onCancel={() => setBatchDialogOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Root>
      </Flex>
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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
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
                  color={
                    offlineNotification.find((n) => n.client === node.uuid)
                      ?.enable
                      ? "green"
                      : "red"
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
    <Flex gap="2" align="center">
      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Trigger>
          <IconButton variant="ghost">
            <Pencil size={16} />
          </IconButton>
        </Dialog.Trigger>
        <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={560}>
          <Dialog.Title>{t("common.edit")}</Dialog.Title>
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
                    throw new Error(formatApiErrorMessage(data?.message || getSaveFailedMessage(res.statusText), { status: res.status }));
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
                    getReadableErrorMessage(error, getSaveFailedMessage()),
                  );
                })
                .finally(() => {
                  setEditSaving(false);
                });
            }}
            onCancel={() => setEditOpen(false)}
          />
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
};

export default OfflinePage;
