import {
  AdminDataTable,
  AdminDataTableCell,
  AdminDataTableHead,
  AdminDataTableHeadRow,
  AdminDataTableRow,
  AdminDataTableScroll,
} from "@/components/admin/AdminDataTable";
import { AdminPagination, useClientPagination } from "@/components/admin/AdminPagination";
import {
  ADMIN_FORM_BODY_CLASS,
  ADMIN_FORM_DIALOG_CHROME_CLASS,
  ADMIN_FORM_DIALOG_CLASS,
  ADMIN_FORM_FOOTER_CLASS,
  ADMIN_FORM_HEADER_CLASS,
  ADMIN_FORM_HEADER_INSET_CLASS,
} from "@/components/admin/AdminFormStyles";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { useNodeDetails } from "@/contexts/NodeDetailsContext";
import { usePingTask, type PingTask } from "@/contexts/PingTaskContext";
import {
  Button,
  Dialog,
  Flex,
  IconButton,
} from "@/components/admin/admin-ui";
import { MoreHorizontal, Server } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Selector } from "@/components/Selector";
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";

// 服务器视图：按服务器聚合展示其绑定的任务，并可快速增删绑定
export const ServerView = ({ pingTasks }: { pingTasks: PingTask[] }) => {
  const { t } = useTranslation();
  const { nodeDetail } = useNodeDetails();

  const sortedNodes = React.useMemo(
    () =>
      [...nodeDetail].sort((a, b) => {
        const wa = a.weight ?? 0;
        const wb = b.weight ?? 0;
        if (wa !== wb) return wa - wb;
        return a.name.localeCompare(b.name);
      }),
    [nodeDetail]
  );
  const nodePagination = useClientPagination(sortedNodes, {
    initialPageSize: 10,
    resetKey: sortedNodes.length,
  });

  if (sortedNodes.length === 0) {
    return (
      <AdminEmptyState
        icon={<Server size={18} />}
        title={t("ping.empty_servers_title", {
          defaultValue: "暂无服务器",
        })}
        description={t("ping.empty_servers_description", {
          defaultValue: "接入服务器后，可以在这里按服务器维度维护延迟监测任务绑定。",
        })}
        className="m-4"
      />
    );
  }

  return (
    <div className="overflow-hidden">
      <AdminDataTableScroll>
        <AdminDataTable minWidth={760}>
          <thead>
          <AdminDataTableHeadRow>
            <AdminDataTableHead className="w-48">{t("common.server")}</AdminDataTableHead>
            <AdminDataTableHead>{t("ping.task")}</AdminDataTableHead>
          </AdminDataTableHeadRow>
          </thead>
          <tbody>
          {nodePagination.pageItems.map((n) => (
            <ServerRow key={n.uuid} nodeUuid={n.uuid} nodeName={n.name} pingTasks={pingTasks} />
          ))}
          </tbody>
        </AdminDataTable>
      </AdminDataTableScroll>
      <AdminPagination
        page={nodePagination.page}
        totalPages={nodePagination.totalPages}
        total={nodePagination.total}
        pageSize={nodePagination.pageSize}
        visibleStart={nodePagination.visibleStart}
        visibleEnd={nodePagination.visibleEnd}
        onPageChange={nodePagination.setPage}
        onPageSizeChange={nodePagination.setPageSize}
        itemLabel={t("common.server")}
      />
    </div>
  );
};

const ServerRow: React.FC<{
  nodeUuid: string;
  nodeName: string;
  pingTasks: PingTask[];
}> = ({ nodeUuid, nodeName, pingTasks }) => {
  const { t } = useTranslation();
  const { refresh } = usePingTask();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // 当前服务器拥有的任务集合
  const ownedTasks = React.useMemo(
    () => pingTasks.filter((t) => t.clients?.includes(nodeUuid)),
    [pingTasks, nodeUuid]
  );

  // 编辑状态（所选任务 id 集合）
  const [selectedIds, setSelectedIds] = React.useState<string[]>(
    () => ownedTasks.filter((t) => t.id !== undefined).map((t) => String(t.id))
  );

  // 若任务或服务器改变，重置选择
  React.useEffect(() => {
    setSelectedIds(
      ownedTasks.filter((t) => t.id !== undefined).map((t) => String(t.id))
    );
  }, [ownedTasks]);

  const handleSave = () => {
    setSaving(true);
    // 收集需要更新的任务（ membership 发生变化 ）
    const toUpdate = pingTasks
      .filter((task) => task.id !== undefined)
      .filter((task) => {
        const hasBefore = !!task.clients?.includes(nodeUuid);
        const hasAfter = selectedIds.includes(String(task.id));
        return hasBefore !== hasAfter; // 仅当变化才提交
      })
      .map((task) => {
        const hasAfter = selectedIds.includes(String(task.id));
        const current = new Set(task.clients || []);
        if (hasAfter) current.add(nodeUuid);
        else current.delete(nodeUuid);
        return {
          id: task.id,
          name: task.name,
          type: task.type,
          target: task.target!,
          clients: Array.from(current),
          interval: task.interval,
        };
      });

    if (toUpdate.length === 0) {
      setOpen(false);
      setSaving(false);
      return;
    }

    fetch("/api/admin/ping/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: toUpdate }),
    })
      .then((res) => {
        if (!res.ok)
          return res.json().then((d) => {
            throw new Error(formatApiErrorMessage(d?.message || t("common.error"), { status: res.status }));
          });
        return res.json();
      })
      .then(() => {
        toast.success(t("common.updated_successfully"));
        setOpen(false);
        refresh();
      })
      .catch((e) => toast.error(getReadableErrorMessage(e)))
      .finally(() => setSaving(false));
  };

  const joined = ownedTasks.map((t) => t.name).join(", ");
  const display = joined.length > 40 ? joined.slice(0, 40) + "..." : joined;

  return (
    <AdminDataTableRow>
      <AdminDataTableCell className="font-medium">{nodeName}</AdminDataTableCell>
      <AdminDataTableCell>
        <Flex align="center" gap="2">
          {ownedTasks.length > 0 ? display : t("common.none")}
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger>
              <IconButton variant="ghost">
                <MoreHorizontal size={16} />
              </IconButton>
            </Dialog.Trigger>
            <Dialog.Content
              className={`${ADMIN_FORM_DIALOG_CLASS} ${ADMIN_FORM_DIALOG_CHROME_CLASS}`}
              maxWidth={520}
            >
              <div className={ADMIN_FORM_HEADER_CLASS}>
                <div className={ADMIN_FORM_HEADER_INSET_CLASS}>
                  <Dialog.Title>
                    {t("common.server")} - {nodeName}
                  </Dialog.Title>
                </div>
              </div>
              <div className={ADMIN_FORM_BODY_CLASS}>
                <Selector
                  value={selectedIds}
                  onChange={setSelectedIds}
                  items={[...pingTasks.filter((t) => t.id !== undefined)].reverse()}
                  getId={(task) => String(task.id)}
                  getLabel={(task) => (
                    <span className="text-sm">
                      {task.name}
          <span className="ml-2 text-sm text-gray-500">
                        {task.type}/{task.interval}s
                      </span>
                    </span>
                  )}
                  headerLabel={t("ping.task")}
                  searchPlaceholder={t("common.search", { defaultValue: "Search" })}
                  filterItem={(item, keyword) =>
                    String(item.name).toLowerCase().includes(keyword.toLowerCase())
                  }
                />
              </div>
              <Flex gap="2" justify="end" className={ADMIN_FORM_FOOTER_CLASS}>
                <Dialog.Close>
                  <Button
                    variant="soft"
                    color="gray"
                    type="button"
                    onClick={() => setOpen(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                </Dialog.Close>
                <Button onClick={handleSave} disabled={saving}>
                  {t("common.save")}
                </Button>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>
      </AdminDataTableCell>
    </AdminDataTableRow>
  );
};
