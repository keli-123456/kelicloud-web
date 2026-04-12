import NodeSelectorDialog from "@/components/NodeSelectorDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNodeDetails } from "@/contexts/NodeDetailsContext";
import { usePingTask, type PingTask } from "@/contexts/PingTaskContext";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

export const TaskView = ({ pingTasks }: { pingTasks: PingTask[] }) => {
  const { t } = useTranslation();
  const { nodeDetail } = useNodeDetails();

  // 过滤已删除的节点
  const processedTasks = React.useMemo(() => {
    if (!pingTasks)
      return [] as (PingTask & {
        __allClientsDeleted?: boolean;
        __originalCount?: number;
      })[];
    const nodeUuidSet = new Set(nodeDetail.map((n) => n.uuid));
    return pingTasks
      .map((task) => {
        const original = task.clients || [];
        const existing = original.filter((uuid) => nodeUuidSet.has(uuid));
        const allDeleted = original.length > 0 && existing.length === 0;
        return {
          ...task,
          clients: existing,
          __allClientsDeleted: allDeleted,
          __originalCount: original.length,
        };
      })
      .sort((a, b) => {
        const aKey = (a as any).name ?? String(a.id ?? 0);
        const bKey = (b as any).name ?? String(b.id ?? 0);
        return aKey.localeCompare(bKey, undefined, { sensitivity: "base", numeric: true });
});
  }, [pingTasks, nodeDetail]);

  return (
    <div className="rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableHead>{t("common.name")}</TableHead>
          <TableHead>{t("common.server")}</TableHead>
          <TableHead>{t("ping.target")}</TableHead>
          <TableHead>{t("ping.type")}</TableHead>
          <TableHead>{t("ping.interval")}</TableHead>
          <TableHead>{t("common.action")}</TableHead>
        </TableHeader>
        <TableBody>
          {processedTasks.map((task) => (
            <Row key={task.id} task={task} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const Row = ({
  task,
}: {
  task: PingTask & { __allClientsDeleted?: boolean; __originalCount?: number };
}) => {
  const { t } = useTranslation();
  const { refresh } = usePingTask();
  const { nodeDetail } = useNodeDetails();
  const [editOpen, setEditOpen] = React.useState(false);
  const [editSaving, setEditSaving] = React.useState(false);
  const [editError, setEditError] = React.useState("");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    name: task.name || "",
    type: task.type || "icmp",
    target: task.target || "",
    clients: task.clients || [],
    interval: task.interval || 60,
  });

  const submitEdit = (newForm: typeof form) => {
    setEditSaving(true);
    fetch("/api/admin/ping/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tasks: [
          {
            id: task.id,
            name: newForm.name,
            type: newForm.type,
            target: newForm.target,
            clients: newForm.clients,
            interval: newForm.interval,
          },
        ],
      }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data?.message || t("common.error"));
          });
        }
        return res.json();
      })
      .then(() => {
        setEditOpen(false);
        toast.success(t("common.updated_successfully"));
        refresh();
      })
      .catch((error) => {
        setEditError(error.message);
        toast.error(error.message);
      })
      .finally(() => setEditSaving(false));
  };

  // 编辑提交
  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditError("");
    if (!form.name.trim()) {
      setEditError(
        t("ping.validation.name_required", {
          defaultValue: "Task name is required.",
        }),
      );
      return;
    }
    if (!form.target.trim()) {
      setEditError(
        t("ping.validation.target_required", {
          defaultValue: "Target is required.",
        }),
      );
      return;
    }
    if ((form.clients || []).length === 0) {
      setEditError(
        t("ping.validation.server_required", {
          defaultValue: "Select at least one server.",
        }),
      );
      return;
    }
    if (!Number.isFinite(form.interval) || form.interval <= 0) {
      setEditError(
        t("ping.validation.interval_required", {
          defaultValue: "Interval must be greater than 0.",
        }),
      );
      return;
    }
    submitEdit(form);
  };

  // 删除
  const handleDelete = () => {
    setDeleteLoading(true);
    fetch("/api/admin/ping/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: [task.id] }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data?.message || t("common.error"));
          });
        }
        return res.json();
      })
      .then(() => {
        setDeleteOpen(false);
        toast.success(t("common.deleted_successfully"));
        refresh();
      })
      .catch((error) => {
        toast.error(error.message);
      })
      .finally(() => setDeleteLoading(false));
  };

  return (
    <TableRow key={task.id}>
      <TableCell>{task.name}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {task.clients && task.clients.length > 0
            ? (() => {
                const names = task.clients.map((uuid) => {
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
            onChange={(uuids) => {
              setForm((f) => ({ ...f, clients: uuids }));
              submitEdit({ ...form, clients: uuids });
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("ping.manage_task_servers", {
                defaultValue: "Manage servers for this task",
              })}
            >
              <MoreHorizontal size="16" />
            </Button>
          </NodeSelectorDialog>
        </div>
      </TableCell>
      <TableCell>{task.target}</TableCell>
      <TableCell>{task.type}</TableCell>
      <TableCell>{task.interval}</TableCell>
      <TableCell className="flex items-center gap-2">
        {/* 编辑按钮 */}
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
                  title={t("ping.form.basic", { defaultValue: "Basic settings" })}
                >
                  <FormField label={t("common.name")} required>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label={t("ping.type")} required>
                    <Select
                      value={form.type}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, type: v as any }))
                      }
                    >
                      <SelectTrigger />
                      <SelectContent>
                        <SelectItem value="icmp">ICMP</SelectItem>
                        <SelectItem value="tcp">TCP</SelectItem>
                        <SelectItem value="http">HTTP</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label={t("ping.target")} required>
                    <Input
                      value={form.target}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, target: e.target.value }))
                      }
                    />
                    <FormHelpText>
                      {t("ping.form.target_help", {
                        defaultValue: "Supports IP, host:port, or URL.",
                      })}
                    </FormHelpText>
                  </FormField>
                </FormSection>

                <FormSection
                  advanced
                  title={t("ping.form.advanced", { defaultValue: "Advanced settings" })}
                  toggleLabel={t("common.advanced", { defaultValue: "Advanced options" })}
                >
                  <FormField label={t("common.server")} required>
                    <NodeSelectorDialog
                      value={form.clients}
                      onChange={(v) => setForm((f) => ({ ...f, clients: v }))}
                    />
                    <FormHelpText>
                      {t("common.selected", { count: form.clients.length })}
                    </FormHelpText>
                  </FormField>
                  <FormField
                    label={`${t("ping.interval")} (${t("time.second")})`}
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
        {/* 删除按钮 */}
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
