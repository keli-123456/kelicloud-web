import Loading from "@/components/loading";
import NodeSelectorDialog from "@/components/NodeSelectorDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LoadAlertProvider,
  useLoadAlert,
  type LoadAlert,
} from "@/contexts/LoadAlertContext";
import {
  NodeDetailsProvider,
  useNodeDetails,
} from "@/contexts/NodeDetailsContext";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  FormActions,
  FormErrorText,
  FormField,
  FormHelpText,
  FormSection,
  FormShell,
} from "@/components/ui/form-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
  if (isLoading || nodeDetailLoading) {
    return <Loading text={t("loading", "Loading...")} />;
  }
  if (error || nodeDetailError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error || nodeDetailError || t("loadAlert.load_failed", "Failed to load load alerts")}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 p-4 text-foreground">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("notification.load.title")}
        </h1>
        <AddButton />
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("common.server")}</TableHead>
            <TableHead>{t("loadAlert.metric")}</TableHead>
            <TableHead>{t("common.threshold")}</TableHead>
            <TableHead>{t("loadAlert.ratio")}</TableHead>
            <TableHead>{t("ping.interval")}</TableHead>
            <TableHead>{t("common.action")}</TableHead>
          </TableHeader>
          <TableBody>
            {loadAlerts
              ?.slice()
              .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
              .map((alert) => (
                <Row key={alert.id} alert={alert} />
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const Row = ({ alert }: { alert: LoadAlert }) => {
  const { t } = useTranslation();
  const { refresh } = useLoadAlert();
  const { nodeDetail } = useNodeDetails();
  const [editOpen, setEditOpen] = React.useState(false);
  const [editSaving, setEditSaving] = React.useState(false);
  const [editError, setEditError] = React.useState("");
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
          throw new Error(data?.message || getUpdateFailedMessage(res.statusText));
        }
        return data;
      })
      .then(() => {
        setEditOpen(false);
        setEditError("");
        toast.success(t("common.updated_successfully"));
        refresh();
      })
      .catch((error) => {
        setEditError(
          error instanceof Error ? error.message : getUpdateFailedMessage(),
        );
        toast.error(
          error instanceof Error ? error.message : getUpdateFailedMessage(),
        );
      })
      .finally(() => setEditSaving(false));
  };

  // Submit the edit form.
  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditError("");
    if (!form.name.trim()) {
      setEditError(
        t("loadAlert.validation.name_required", {
          defaultValue: "Alert name is required.",
        }),
      );
      return;
    }
    if ((form.clients || []).length === 0) {
      setEditError(
        t("loadAlert.validation.server_required", {
          defaultValue: "Select at least one server.",
        }),
      );
      return;
    }
    if (!Number.isFinite(form.threshold) || form.threshold <= 0) {
      setEditError(
        t("loadAlert.validation.threshold_required", {
          defaultValue: "Threshold must be greater than 0.",
        }),
      );
      return;
    }
    if (!Number.isFinite(form.ratio) || form.ratio < 0 || form.ratio > 1) {
      setEditError(
        t("loadAlert.validation.ratio_invalid", {
          defaultValue: "Ratio must be between 0 and 1.",
        }),
      );
      return;
    }
    if (!Number.isFinite(form.interval) || form.interval <= 0) {
      setEditError(
        t("loadAlert.validation.interval_required", {
          defaultValue: "Interval must be greater than 0.",
        }),
      );
      return;
    }
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
          throw new Error(data?.message || getDeleteFailedMessage(res.statusText));
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
          error instanceof Error ? error.message : getDeleteFailedMessage(),
        );
      })
      .finally(() => setDeleteLoading(false));
  };

  return (
    <TableRow key={alert.id}>
      <TableCell>{alert.name}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
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
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("loadAlert.manage_servers", {
                defaultValue: "Manage alert servers",
              })}
            >
              <MoreHorizontal size="16" />
            </Button>
          </NodeSelectorDialog>
        </div>
      </TableCell>
      <TableCell>{alert.metric?.toUpperCase()}</TableCell>
      <TableCell>{alert.threshold}%</TableCell>
      <TableCell>{alert.ratio}</TableCell>
      <TableCell>
        {alert.interval} {t("time.minute")}
      </TableCell>
      <TableCell className="flex items-center gap-2">
        {/* Edit action. */}
        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) {
              setEditError("");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("common.edit", { defaultValue: "Edit" })}
            >
              <Pencil size="16" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>{t("common.edit")}</DialogTitle>
            <form onSubmit={handleEdit} className="space-y-4">
              <FormShell>
                <FormSection
                  title={t("loadAlert.form.basic", { defaultValue: "Basic settings" })}
                >
                  <FormField label={t("common.name")} required>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label={t("loadAlert.metric")} required>
                    <Select
                      value={form.metric}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, metric: v as any }))
                      }
                    >
                      <SelectTrigger />
                      <SelectContent>
                        <SelectItem value="cpu">CPU</SelectItem>
                        <SelectItem value="ram">RAM</SelectItem>
                        <SelectItem value="disk">Disk</SelectItem>
                        <SelectItem value="net_in">Net In</SelectItem>
                        <SelectItem value="net_out">Net Out</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label={`${t("common.threshold")} (%)`} required>
                    <Input
                      type="number"
                      min={0}
                      value={form.threshold}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, threshold: Number(e.target.value) }))
                      }
                    />
                  </FormField>
                </FormSection>

                <FormSection
                  advanced
                  title={t("loadAlert.form.advanced", { defaultValue: "Advanced settings" })}
                  toggleLabel={t("common.advanced", { defaultValue: "Advanced options" })}
                >
                  <FormField label={t("loadAlert.ratio")} required>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={form.ratio}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, ratio: Number(e.target.value) }))
                      }
                    />
                    <FormHelpText>
                      {t("loadAlert.ratio_help", {
                        defaultValue: "Recommended range: 0 ~ 1.",
                      })}
                    </FormHelpText>
                  </FormField>
                  <FormField label={t("common.server")} required>
                    <NodeSelectorDialog
                      value={form.clients}
                      hiddenUuidOnlyClient
                      onChange={(v) => setForm((f) => ({ ...f, clients: v }))}
                    />
                    <FormHelpText>
                      {t("common.selected", { count: form.clients.length })}
                    </FormHelpText>
                  </FormField>
                  <FormField
                    label={`${t("ping.interval")} (${t("time.minute")})`}
                    required
                  >
                    <Input
                      type="number"
                      min={1}
                      value={form.interval}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, interval: Number(e.target.value) }))
                      }
                    />
                  </FormField>
                </FormSection>
              </FormShell>

              {editError ? <FormErrorText>{editError}</FormErrorText> : null}

              <FormActions>
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setEditOpen(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={editSaving}>
                  {t("common.save")}
                </Button>
              </FormActions>
            </form>
          </DialogContent>
        </Dialog>
        {/* Delete action. */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              aria-label={t("common.delete", { defaultValue: "Delete" })}
            >
              <Trash size="16" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>{t("common.delete")}</DialogTitle>
            <div className="mt-4 flex justify-end gap-2">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {t("common.delete")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
};

const AddButton: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [submitError, setSubmitError] = React.useState("");
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
    setSubmitError("");
    const name = e.currentTarget.load_name.value.trim();
    const threshold = parseFloat(e.currentTarget.threshold.value);
    const ratio = parseFloat(e.currentTarget.ratio.value);
    const interval = parseInt(e.currentTarget.interval.value, 10);
    if (!name) {
      setSubmitError(
        t("loadAlert.validation.name_required", {
          defaultValue: "Alert name is required.",
        }),
      );
      return;
    }
    if (selected.length === 0) {
      setSubmitError(
        t("loadAlert.validation.server_required", {
          defaultValue: "Select at least one server.",
        }),
      );
      return;
    }
    if (!Number.isFinite(threshold) || threshold <= 0) {
      setSubmitError(
        t("loadAlert.validation.threshold_required", {
          defaultValue: "Threshold must be greater than 0.",
        }),
      );
      return;
    }
    if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
      setSubmitError(
        t("loadAlert.validation.ratio_invalid", {
          defaultValue: "Ratio must be between 0 and 1.",
        }),
      );
      return;
    }
    if (!Number.isFinite(interval) || interval <= 0) {
      setSubmitError(
        t("loadAlert.validation.interval_required", {
          defaultValue: "Interval must be greater than 0.",
        }),
      );
      return;
    }

    const payload = {
      name,
      metric: selectedType,
      threshold,
      ratio,
      clients: selected,
      interval,
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
          throw new Error(data?.message || getAddFailedMessage(response.statusText));
        }
        setIsOpen(false);
        setSubmitError("");
        setSelected([]);
        setSelectedType("cpu");
        toast.success(t("common.added_successfully"));
      })
      .catch((error) => {
        console.error("Error adding load alert:", error);
        setSubmitError(
          error instanceof Error ? error.message : getAddFailedMessage(),
        );
        toast.error(
          error instanceof Error ? error.message : getAddFailedMessage(),
        );
      })
      .finally(() => {
        setSaving(false);
        refresh();
      });
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>{t("common.add")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t("common.add")}</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormShell>
            <FormSection
              title={t("loadAlert.form.basic", { defaultValue: "Basic settings" })}
            >
              <FormField label={t("common.name")} htmlFor="load_name" required>
                <Input id="load_name" name="load_name" />
              </FormField>
              <FormField label={t("loadAlert.metric")} htmlFor="type" required>
                <Select
                  value={selectedType}
                  onValueChange={(value) =>
                    setSelectedType(
                      value as "cpu" | "ram" | "disk" | "net_in" | "net_out",
                    )
                  }
                >
                  <SelectTrigger id="type" name="type" />
                  <SelectContent>
                    <SelectItem value="cpu">CPU</SelectItem>
                    <SelectItem value="ram">RAM</SelectItem>
                    <SelectItem value="disk">Disk</SelectItem>
                    <SelectItem value="net_in">Net In(Mbps)</SelectItem>
                    <SelectItem value="net_out">Net Out(Mbps)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField
                label={`${t("common.threshold")} (%/Mbps)`}
                htmlFor="threshold"
                required
              >
                <Input
                  id="threshold"
                  name="threshold"
                  type="number"
                  min={0}
                  defaultValue={80}
                  step="0.1"
                />
              </FormField>
            </FormSection>

            <FormSection
              advanced
              title={t("loadAlert.form.advanced", { defaultValue: "Advanced settings" })}
              toggleLabel={t("common.advanced", { defaultValue: "Advanced options" })}
            >
              <FormField label={t("loadAlert.ratio")} htmlFor="ratio" required>
                <Input
                  id="ratio"
                  name="ratio"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  defaultValue={0.8}
                />
                <FormHelpText>
                  {t("loadAlert.ratio_help", {
                    defaultValue: "Recommended range: 0 ~ 1.",
                  })}
                </FormHelpText>
              </FormField>
              <FormField label={t("common.server")} htmlFor="select" required>
                <div className="flex items-center justify-start gap-2">
                  <NodeSelectorDialog value={selected} onChange={setSelected} />
                  <span className="text-sm text-muted-foreground">
                    {t("common.selected", { count: selected.length })}
                  </span>
                </div>
              </FormField>
              <FormField
                label={`${t("ping.interval")} (${t("time.minute")})`}
                htmlFor="interval"
                required
              >
                <Input
                  id="interval"
                  name="interval"
                  defaultValue={15}
                  type="number"
                  min={1}
                  placeholder="15"
                />
              </FormField>
            </FormSection>
          </FormShell>

          {submitError ? <FormErrorText>{submitError}</FormErrorText> : null}

          <FormActions>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                {t("common.close")}
              </Button>
            </DialogClose>
            <Button disabled={saving} type="submit">
              {t("common.add")}
            </Button>
          </FormActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoadPage;
