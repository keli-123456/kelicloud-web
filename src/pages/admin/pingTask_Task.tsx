import NodeSelectorDialog from "@/components/NodeSelectorDialog";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import {
  AdminDataTable,
  AdminDataTableCell,
  AdminDataTableHead,
  AdminDataTableHeadRow,
  AdminDataTableRow,
  AdminDataTableScroll,
} from "@/components/admin/AdminDataTable";
import {
  ADMIN_FORM_DIALOG_CLASS,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_GRID_2_CLASS,
  ADMIN_FORM_SCROLL_CLASS,
} from "@/components/admin/AdminFormStyles";
import { AdminPagination, useClientPagination } from "@/components/admin/AdminPagination";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { useNodeDetails } from "@/contexts/NodeDetailsContext";
import { usePingTask, type PingTask } from "@/contexts/PingTaskContext";
import {
  Button,
  Dialog,
  Flex,
  IconButton,
  Select,
  TextField,
} from "@/components/admin/admin-ui";
import { Activity, MoreHorizontal, Pencil, Trash } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";

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
  const taskPagination = useClientPagination(processedTasks, {
    initialPageSize: 10,
    resetKey: processedTasks.length,
  });

  if (processedTasks.length === 0) {
    return (
      <AdminEmptyState
        icon={<Activity size={18} />}
        title={t("ping.empty_tasks_title", {
          defaultValue: "暂无监测任务",
        })}
        description={t("ping.empty_tasks_description", {
          defaultValue: "添加 ICMP、TCP 或 HTTP 任务后，会在这里按任务维度展示目标和绑定服务器。",
        })}
        className="m-4"
      />
    );
  }

  return (
    <div className="overflow-hidden">
      <AdminDataTableScroll>
        <AdminDataTable minWidth={860}>
          <thead>
          <AdminDataTableHeadRow>
            <AdminDataTableHead>{t("common.name")}</AdminDataTableHead>
            <AdminDataTableHead>{t("common.server")}</AdminDataTableHead>
            <AdminDataTableHead>{t("ping.target")}</AdminDataTableHead>
            <AdminDataTableHead>{t("ping.type")}</AdminDataTableHead>
            <AdminDataTableHead>{t("ping.interval")}</AdminDataTableHead>
            <AdminDataTableHead align="right" sticky="right">{t("common.action")}</AdminDataTableHead>
          </AdminDataTableHeadRow>
          </thead>
          <tbody>
          {taskPagination.pageItems.map((task) => (
            <Row key={task.id} task={task} />
          ))}
          </tbody>
        </AdminDataTable>
      </AdminDataTableScroll>
      <AdminPagination
        page={taskPagination.page}
        totalPages={taskPagination.totalPages}
        total={taskPagination.total}
        pageSize={taskPagination.pageSize}
        visibleStart={taskPagination.visibleStart}
        visibleEnd={taskPagination.visibleEnd}
        onPageChange={taskPagination.setPage}
        onPageSizeChange={taskPagination.setPageSize}
        itemLabel={t("ping.task")}
      />
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
            throw new Error(formatApiErrorMessage(data?.message || t("common.error"), { status: res.status }));
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
        toast.error(getReadableErrorMessage(error));
      })
      .finally(() => setEditSaving(false));
  };

  // 编辑提交
  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
            throw new Error(formatApiErrorMessage(data?.message || t("common.error"), { status: res.status }));
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
        toast.error(getReadableErrorMessage(error));
      })
      .finally(() => setDeleteLoading(false));
  };

  return (
    <AdminDataTableRow key={task.id}>
      <AdminDataTableCell className="font-medium">{task.name}</AdminDataTableCell>
      <AdminDataTableCell>
        <Flex gap="2" align="center">
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
            <IconButton variant="ghost">
              <MoreHorizontal size="16" />
            </IconButton>
          </NodeSelectorDialog>
        </Flex>
      </AdminDataTableCell>
      <AdminDataTableCell>{task.target}</AdminDataTableCell>
      <AdminDataTableCell>{task.type}</AdminDataTableCell>
      <AdminDataTableCell>{task.interval}</AdminDataTableCell>
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
        <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
          <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={640}>
            <Dialog.Title>{t("common.edit")}</Dialog.Title>
            <form onSubmit={handleEdit} className={`${ADMIN_FORM_SCROLL_CLASS} mt-4 space-y-4`}>
              <div className={ADMIN_FORM_GRID_2_CLASS}>
              <label className={ADMIN_FORM_FIELD_CLASS}>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("common.name")}</span>
              <TextField.Root
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
              </label>
              <label className={ADMIN_FORM_FIELD_CLASS}>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("ping.type")}</span>
              <Select.Root
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, type: v as any }))
                }
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="icmp">ICMP</Select.Item>
                  <Select.Item value="tcp">TCP</Select.Item>
                  <Select.Item value="http">HTTP</Select.Item>
                </Select.Content>
              </Select.Root>
              </label>
              </div>
              <label className={ADMIN_FORM_FIELD_CLASS}>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("ping.target")}</span>
              <TextField.Root
                value={form.target}
                onChange={(e) =>
                  setForm((f) => ({ ...f, target: e.target.value }))
                }
                required
              />
              </label>
              <div className={ADMIN_FORM_FIELD_CLASS}>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("common.server")}</label>
              <Flex>
                <NodeSelectorDialog
                  value={form.clients}
                  onChange={(v) => setForm((f) => ({ ...f, clients: v }))}
                />
              </Flex>
              </div>
              <label className={ADMIN_FORM_FIELD_CLASS}>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {t("ping.interval")} ({t("time.second")})
                </span>
              <TextField.Root
                type="number"
                value={form.interval}
                onChange={(e) =>
                  setForm((f) => ({ ...f, interval: Number(e.target.value) }))
                }
                required
              />
              </label>
              <Flex gap="2" justify="end" className="border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
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
