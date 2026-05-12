import { AdminTableSkeleton } from "@/components/admin/AdminPageShell";
import {
  AdminDataTable,
  AdminDataTableCell,
  AdminDataTableEmptyRow,
  AdminDataTableHead,
  AdminDataTableHeadRow,
  AdminDataTableRow,
  AdminDataTableScroll,
} from "@/components/admin/AdminDataTable";
import {
  ADMIN_FORM_DIALOG_CLASS,
  ADMIN_FORM_SCROLL_CLASS,
} from "@/components/admin/AdminFormStyles";
import {
  AdminPagination,
  useClientPagination,
} from "@/components/admin/AdminPagination";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import NodeSelectorDialog from "@/components/NodeSelectorDialog";
import {
  LoadAlertProvider,
  useLoadAlert,
  type LoadAlert,
} from "@/contexts/LoadAlertContext";
import {
  NodeDetailsProvider,
  useNodeDetails,
} from "@/contexts/NodeDetailsContext";

import {
  Button,
  Dialog,
  Flex,
  IconButton,
  Select,
  TextField,
} from "@/components/admin/admin-ui";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";

const LoadPage = () => {
  return (
    <LoadAlertProvider>
      <NodeDetailsProvider>
        <InnerLayout />
      </NodeDetailsProvider>
    </LoadAlertProvider>
  );
};

const InnerLayout = () => {
  const { loadAlerts, isLoading, error } = useLoadAlert();
  const { isLoading: nodeDetailLoading, error: nodeDetailError } =
    useNodeDetails();
  const { t } = useTranslation();
  const sortedAlerts = React.useMemo(
    () => [...(loadAlerts || [])].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
    [loadAlerts],
  );
  const alertPagination = useClientPagination(sortedAlerts, {
    initialPageSize: 10,
  });
  if (isLoading || nodeDetailLoading) {
    return (
      <Flex direction="column" gap="4" className="p-4 text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between">
          <label className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t("notification.load.title")}
          </label>
          <AddButton />
        </div>
        <AdminTableSkeleton columns={7} rows={5} />
      </Flex>
    );
  }
  if (error || nodeDetailError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error || nodeDetailError || t("loadAlert.load_failed", "Failed to load load alerts")}
      </div>
    );
  }
  return (
    <Flex direction="column" gap="4" className="p-4 text-slate-900 dark:text-slate-100">
      <div className="flex justify-between items-center">
        <label className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t("notification.load.title")}
        </label>
        <AddButton />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
        <AdminDataTableScroll>
          <AdminDataTable minWidth={860}>
            <thead>
              <AdminDataTableHeadRow>
                <AdminDataTableHead>{t("common.name")}</AdminDataTableHead>
                <AdminDataTableHead>{t("common.server")}</AdminDataTableHead>
                <AdminDataTableHead>{t("loadAlert.metric")}</AdminDataTableHead>
                <AdminDataTableHead>{t("common.threshold")}</AdminDataTableHead>
                <AdminDataTableHead>{t("loadAlert.ratio")}</AdminDataTableHead>
                <AdminDataTableHead>{t("ping.interval")}</AdminDataTableHead>
                <AdminDataTableHead align="right" sticky="right">
                  {t("common.action")}
                </AdminDataTableHead>
              </AdminDataTableHeadRow>
            </thead>
            <tbody>
              {alertPagination.pageItems.length === 0 ? (
                <AdminDataTableEmptyRow colSpan={7}>
                  <div className="text-center text-sm text-muted-foreground">
                    {t("loadAlert.empty", "No load alerts configured")}
                  </div>
                </AdminDataTableEmptyRow>
              ) : (
                alertPagination.pageItems.map((alert) => (
                  <Row key={alert.id} alert={alert} />
                ))
              )}
            </tbody>
          </AdminDataTable>
        </AdminDataTableScroll>
      </div>
      <AdminPagination
        page={alertPagination.page}
        totalPages={alertPagination.totalPages}
        total={alertPagination.total}
        pageSize={alertPagination.pageSize}
        visibleStart={alertPagination.visibleStart}
        visibleEnd={alertPagination.visibleEnd}
        onPageChange={alertPagination.setPage}
        onPageSizeChange={alertPagination.setPageSize}
        pageSizeOptions={[10, 20, 50]}
        itemLabel={t("admin.pagination.alerts", { defaultValue: "alerts" })}
        compact
      />
    </Flex>
  );
};

const Row = ({ alert }: { alert: LoadAlert }) => {
  const { t } = useTranslation();
  const { refresh } = useLoadAlert();
  const { nodeDetail } = useNodeDetails();
  const [editOpen, setEditOpen] = React.useState(false);
  const [editSaving, setEditSaving] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    name: alert.name || "",
    metric: alert.metric || "cpu",
    threshold: alert.threshold || 80,
    ratio: alert.ratio || 0.8,
    clients: alert.clients || [],
    interval: alert.interval || 15,
  });
  const getUpdateFailedMessage = (statusText?: string) =>
    statusText
      ? t("loadAlert.update_failed", {
          defaultValue: "Failed to update load alert: {{statusText}}",
          statusText,
        })
      : t("loadAlert.update_failed_generic", {
          defaultValue: "Failed to update load alert",
        });
  const getDeleteFailedMessage = (statusText?: string) =>
    statusText
      ? t("loadAlert.delete_failed", {
          defaultValue: "Failed to delete load alert: {{statusText}}",
          statusText,
        })
      : t("loadAlert.delete_failed_generic", {
          defaultValue: "Failed to delete load alert",
        });

  const submitEdit = (newForm: typeof form) => {
    setEditSaving(true);
    fetch("/api/admin/notification/load/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notifications: [
          {
            id: alert.id,
            name: newForm.name,
            metric: newForm.metric,
            threshold: newForm.threshold,
            ratio: newForm.ratio,
            clients: newForm.clients,
            interval: newForm.interval,
          },
        ],
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || (data?.status && data.status !== "success")) {
          throw new Error(formatApiErrorMessage(data?.message || getUpdateFailedMessage(res.statusText), { status: res.status }));
        }
        return data;
      })
      .then(() => {
        setEditOpen(false);
        toast.success(t("common.updated_successfully"));
        refresh();
      })
      .catch((error) => {
        toast.error(
          getReadableErrorMessage(error, getUpdateFailedMessage()),
        );
      })
      .finally(() => setEditSaving(false));
  };

  // Submit the edit form.
  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitEdit(form);
  };

  // Delete the current alert.
  const handleDelete = () => {
    setDeleteLoading(true);
    fetch("/api/admin/notification/load/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: [alert.id] }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || (data?.status && data.status !== "success")) {
          throw new Error(formatApiErrorMessage(data?.message || getDeleteFailedMessage(res.statusText), { status: res.status }));
        }
        return data;
      })
      .then(() => {
        setDeleteOpen(false);
        toast.success(t("common.deleted_successfully"));
        refresh();
      })
      .catch((error) => {
        toast.error(
          getReadableErrorMessage(error, getDeleteFailedMessage()),
        );
      })
      .finally(() => setDeleteLoading(false));
  };

  return (
    <AdminDataTableRow key={alert.id}>
      <AdminDataTableCell>{alert.name}</AdminDataTableCell>
      <AdminDataTableCell>
        <Flex gap="2" align="center">
          {alert.clients && alert.clients.length > 0
            ? (() => {
                const names = alert.clients.map((uuid) => {
                  const name =
                    nodeDetail.find((node) => node.uuid === uuid)?.name || uuid;
                  return name;
                });
                const joined = names.join(", ");
                return joined.length > 40
                  ? joined.slice(0, 40) + "..."
                  : joined;
              })()
            : t("common.none")}
          <NodeSelectorDialog
            value={form.clients ?? []}
            hiddenUuidOnlyClient
            onChange={(uuids) => {
              setForm((f) => ({ ...f, clients: uuids }));
              submitEdit({ ...form, clients: uuids });
            }}
          >
            <IconButton variant="ghost">
              <MoreHorizontal size="16" />
            </IconButton>
          </NodeSelectorDialog>
        </Flex>
      </AdminDataTableCell>
      <AdminDataTableCell>{alert.metric?.toUpperCase()}</AdminDataTableCell>
      <AdminDataTableCell>{alert.threshold}%</AdminDataTableCell>
      <AdminDataTableCell>{alert.ratio}</AdminDataTableCell>
      <AdminDataTableCell>
        {alert.interval} {t("time.minute")}
      </AdminDataTableCell>
      <AdminDataTableCell align="right" sticky="right">
        <AdminRowActions
          actions={[
            {
              label: t("common.edit"),
              icon: <Pencil className="h-4 w-4" />,
              onSelect: () => setEditOpen(true),
            },
            {
              label: t("common.delete"),
              icon: <Trash className="h-4 w-4" />,
              destructive: true,
              onSelect: () => setDeleteOpen(true),
            },
          ]}
        />
        {/* Edit action. */}
        <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
          <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={640}>
            <Dialog.Title>{t("common.edit")}</Dialog.Title>
            <form
              onSubmit={handleEdit}
              className={`${ADMIN_FORM_SCROLL_CLASS} mt-4 grid gap-2 [&>label]:text-sm [&>label]:font-medium [&>label]:text-slate-900 dark:[&>label]:text-slate-100`}
            >
              <label>{t("common.name")}</label>
              <TextField.Root
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
              <label>{t("loadAlert.metric")}</label>
              <Select.Root
                value={form.metric}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, metric: v as any }))
                }
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="cpu">CPU</Select.Item>
                  <Select.Item value="ram">RAM</Select.Item>
                  <Select.Item value="disk">Disk</Select.Item>
                  <Select.Item value="net_in">Net In</Select.Item>
                  <Select.Item value="net_out">Net Out</Select.Item>
                </Select.Content>
              </Select.Root>
              <label>{t("common.threshold")} (%)</label>
              <TextField.Root
                type="number"
                value={form.threshold}
                onChange={(e) =>
                  setForm((f) => ({ ...f, threshold: Number(e.target.value) }))
                }
                required
              />
              <label>{t("loadAlert.ratio")}</label>
              <TextField.Root
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={form.ratio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ratio: Number(e.target.value) }))
                }
                required
              />
              <label>{t("common.server")}</label>
              <Flex>
                <NodeSelectorDialog
                  value={form.clients}
                  hiddenUuidOnlyClient
                  onChange={(v) => setForm((f) => ({ ...f, clients: v }))}
                />
              </Flex>
              <label>
                {t("ping.interval")} ({t("time.minute")})
              </label>
              <TextField.Root
                type="number"
                value={form.interval}
                onChange={(e) =>
                  setForm((f) => ({ ...f, interval: Number(e.target.value) }))
                }
                required
              />
              <Flex gap="2" justify="end" className="mt-2 border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
                <Dialog.Close>
                  <Button
                    variant="soft"
                    color="gray"
                    type="button"
                    onClick={() => setEditOpen(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                </Dialog.Close>
                <Button variant="solid" type="submit" disabled={editSaving}>
                  {t("common.save")}
                </Button>
              </Flex>
            </form>
          </Dialog.Content>
        </Dialog.Root>
        {/* Delete action. */}
        <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
          <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={480}>
            <Dialog.Title>{t("common.delete")}</Dialog.Title>
            <Flex gap="2" justify="end" className="border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
              <Dialog.Close>
                <Button
                  variant="soft"
                  color="gray"
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
              </Dialog.Close>
              <Button
                variant="solid"
                color="red"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {t("common.delete")}
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      </AdminDataTableCell>
    </AdminDataTableRow>
  );
};

const AddButton: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const { refresh } = useLoadAlert();
  const [selectedType, setSelectedType] = React.useState<
    "cpu" | "ram" | "disk" | "net_in" | "net_out"
  >("cpu");
  const [saving, setSaving] = React.useState(false);
  const getAddFailedMessage = (statusText?: string) =>
    statusText
      ? t("loadAlert.add_failed", {
          defaultValue: "Failed to add load alert: {{statusText}}",
          statusText,
        })
      : t("loadAlert.add_failed_generic", {
          defaultValue: "Failed to add load alert",
        });
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = {
      name: e.currentTarget.load_name.value,
      metric: selectedType,
      threshold: parseFloat(e.currentTarget.threshold.value),
      ratio: parseFloat(e.currentTarget.ratio.value),
      clients: selected,
      interval: parseInt(e.currentTarget.interval.value, 10),
    };
    setSaving(true);
    fetch("/api/admin/notification/load/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || (data?.status && data.status !== "success")) {
          throw new Error(formatApiErrorMessage(data?.message || getAddFailedMessage(response.statusText), { status: response.status }));
        }
        setIsOpen(false);
        setSelected([]);
        setSelectedType("cpu");
        toast.success(t("common.added_successfully"));
      })
      .catch((error) => {
        console.error("Error adding load alert:", error);
        toast.error(
          getReadableErrorMessage(error, getAddFailedMessage()),
        );
      })
      .finally(() => {
        setSaving(false);
        refresh();
      });
  };
  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger>
        <Button>{t("common.add")}</Button>
      </Dialog.Trigger>
      <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={640}>
        <Dialog.Title>{t("common.add")}</Dialog.Title>
        <form
          onSubmit={handleSubmit}
          className={`${ADMIN_FORM_SCROLL_CLASS} mt-4 grid gap-2 [&>label]:text-sm [&>label]:font-medium [&>label]:text-slate-900 dark:[&>label]:text-slate-100`}
        >
            <label htmlFor="load_name">{t("common.name")}</label>
            <TextField.Root id="load_name" name="load_name" />
            <label htmlFor="type">{t("loadAlert.metric")}</label>
            <Select.Root
              value={selectedType}
              onValueChange={(value) =>
                setSelectedType(
                  value as "cpu" | "ram" | "disk" | "net_in" | "net_out",
                )
              }
            >
              <Select.Trigger id="type" name="type" />
              <Select.Content>
                <Select.Item value="cpu">CPU</Select.Item>
                <Select.Item value="ram">RAM</Select.Item>
                <Select.Item value="disk">Disk</Select.Item>
                <Select.Item value="net_in">Net In(Mbps)</Select.Item>
                <Select.Item value="net_out">Net Out(Mbps)</Select.Item>
              </Select.Content>
            </Select.Root>
            <label htmlFor="threshold">{t("common.threshold")} (%/Mbps)</label>
            <TextField.Root
              id="threshold"
              name="threshold"
              type="number"
              defaultValue={80}
              step="0.1"
            />
            <label htmlFor="ratio">{t("loadAlert.ratio")}</label>
            <TextField.Root
              id="ratio"
              name="ratio"
              type="number"
              step="0.1"
              min="0"
              max="1"
              defaultValue={0.8}
            />
            <label htmlFor="select">{t("common.server")}</label>
            <div className="flex items-center justify-start gap-2">
              <NodeSelectorDialog value={selected} onChange={setSelected} />
              <label className="text-md font-normal">
                {t("common.selected", { count: selected.length })}
              </label>
            </div>
            <label htmlFor="interval">
              {t("ping.interval")} ({t("time.minute")})
            </label>
            <TextField.Root
              id="interval"
              name="interval"
              defaultValue={15}
              type="number"
              placeholder="15"
            />
            <div className="mt-2 flex justify-end gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
              <Dialog.Close>
                <Button variant="soft">{t("common.close")}</Button>
              </Dialog.Close>
              <Button disabled={saving} type="submit">
                {t("common.add")}
              </Button>
            </div>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default LoadPage;
