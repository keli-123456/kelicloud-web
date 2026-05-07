import NodeSelectorDialog from "@/components/NodeSelectorDialog";
import {
  AdminPageShell,
  AdminSurface,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import {
  ADMIN_FORM_DIALOG_CLASS,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_GRID_2_CLASS,
  ADMIN_FORM_SCROLL_CLASS,
} from "@/components/admin/AdminFormStyles";
import {
  NodeDetailsProvider,
  useNodeDetails,
} from "@/contexts/NodeDetailsContext";
import {
  PingTaskProvider,
  usePingTask,
} from "@/contexts/PingTaskContext";
import { useSettings } from "@/lib/api";
import {
  Button,
  Dialog,
  Select,
  Tabs,
  TextField,
} from "@/components/admin/admin-ui";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TaskView } from "./pingTask_Task";
import { ServerView } from "./pingTask_Server";
import { Plus } from "lucide-react";
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";

const PingTask = () => {
  return (
    <PingTaskProvider>
      <NodeDetailsProvider>
        <InnerLayout />
      </NodeDetailsProvider>
    </PingTaskProvider>
  );
};

const InnerLayout = () => {
  const { pingTasks, isLoading, error } = usePingTask();
  const {
    isLoading: nodeDetailLoading,
    error: nodeDetailError,
  } =
    useNodeDetails();
  const { t } = useTranslation();
  const tasks = pingTasks ?? [];

  if (isLoading || nodeDetailLoading) {
    return (
      <AdminPageShell
        title={t("ping.title")}
        description={t("ping.page_description", {
          defaultValue:
            "管理 ICMP、TCP 和 HTTP 延迟监测任务，并按任务或服务器维度检查绑定关系。",
        })}
        actions={<AddButton />}
      >
        <Tabs.Root defaultValue="task">
          <AdminSurface className="overflow-hidden border-y border-slate-200/80 dark:border-slate-800/90">
            <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-800/70">
              <Tabs.List>
                <Tabs.Trigger value="task">{t("ping.task_view")}</Tabs.Trigger>
                <Tabs.Trigger value="server">{t("ping.server_view")}</Tabs.Trigger>
              </Tabs.List>
            </div>
            <div className="min-h-[360px] p-4">
              <AdminTableSkeleton columns={6} rows={5} />
            </div>
          </AdminSurface>
        </Tabs.Root>
      </AdminPageShell>
    );
  }
  if (error || nodeDetailError) {
    return <div>{error || nodeDetailError}</div>;
  }
  return (
    <AdminPageShell
      title={t("ping.title")}
      description={t("ping.page_description", {
        defaultValue:
          "管理 ICMP、TCP 和 HTTP 延迟监测任务，并按任务或服务器维度检查绑定关系。",
      })}
      actions={<AddButton />}
    >
      <Tabs.Root defaultValue="task">
        <AdminSurface className="overflow-hidden border-y border-slate-200/80 dark:border-slate-800/90">
          <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-800/70">
            <Tabs.List>
              <Tabs.Trigger value="task">{t("ping.task_view")}</Tabs.Trigger>
              <Tabs.Trigger value="server">{t("ping.server_view")}</Tabs.Trigger>
            </Tabs.List>
          </div>
          <div className="min-h-[360px]">
            <Tabs.Content value="task">
              <TaskView pingTasks={tasks} />
            </Tabs.Content>
            <Tabs.Content value="server">
              <ServerView pingTasks={tasks} />
            </Tabs.Content>
          </div>
        </AdminSurface>
      </Tabs.Root>
      <DiskUsageEstimate />
    </AdminPageShell>
  );
};



const DiskUsageEstimate = () => {
  const { pingTasks } = usePingTask();
  const { t } = useTranslation();

  // 计算预估磁盘消耗
  const calculateDiskUsage = () => {
    if (!pingTasks || pingTasks.length === 0) return 0;

    // 一条记录的大小估算：
    // - uuid: 36字节 (UUID字符串)
    // - int: 8字节 (64位整数)
    // - int: 8字节 (64位整数)
    // - time: 33字节 (RFC3339格式字符串，如 "2006-01-02T15:04:05.000Z07:00")
    // - 其他开销: 20字节
    const recordSize = (36 + 8 + 8 + 33 + 20) * 2; // 回收余量2倍

    const totalRecordsPerDay = pingTasks.reduce((total, task) => {
      const clientCount = task.clients?.length || 0;
      const interval = task.interval || 60; // 默认60秒
      const recordsPerDay = (clientCount * (24 * 60 * 60)) / interval;
      return total + recordsPerDay;
    }, 0);

    return totalRecordsPerDay * recordSize;
  };

  // 格式化文件大小
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };
  const { settings } = useSettings("system");

  const dailyUsage = calculateDiskUsage();
  //const monthlyUsage = dailyUsage * 31;
  //const yearlyUsage = dailyUsage * 365;

  return (
    <AdminSurface className="border-y border-slate-200/80 py-3 text-sm text-slate-600 dark:border-slate-800/90 dark:text-slate-300">
      <label>
        {t("ping.disk_usage_estimate")}: {formatBytes(dailyUsage)}/
        {t("common.day")},{" "}
        {t("ping.disk_usage_with_settings", {
          hour: settings.ping_record_preserve_time,
          space: formatBytes(
            (dailyUsage * settings.ping_record_preserve_time) / 24
          ),
        })}
      </label>
    </AdminSurface>
  );
};

const AddButton: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const { refresh } = usePingTask();
  const [selectedType, setSelectedType] = React.useState<
    "icmp" | "tcp" | "http"
  >("icmp");
  const [saving, setSaving] = React.useState(false);
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = {
      name: e.currentTarget.ping_name.value,
      type: selectedType,
      target: e.currentTarget.ping_target.value,
      clients: selected,
      interval: parseInt(e.currentTarget.interval.value, 10),
    };
    setSaving(true);
    fetch("/api/admin/ping/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (response.ok) {
          setIsOpen(false);
          setSelected([]);
          setSelectedType("icmp");
          toast.success(t("common.success"));
        } else {
          response
            .json()
            .then((data) => {
              toast.error(formatApiErrorMessage(data?.message || t("common.error"), { status: response.status }));
            })
            .catch((error) => {
              toast.error(getReadableErrorMessage(error));
            });
        }
      })
      .catch((error) => {
        console.error("Error adding ping task:", error);
        toast.error(getReadableErrorMessage(error));
      })
      .finally(() => {
        setSaving(false);
        refresh();
      });
  };
  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger>
        <Button>
          <Plus size={15} />
          {t("common.add")}
        </Button>
      </Dialog.Trigger>
      <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={640}>
        <Dialog.Title>{t("common.add")}</Dialog.Title>
        <form onSubmit={handleSubmit} className={`${ADMIN_FORM_SCROLL_CLASS} mt-4 space-y-4`}>
          <div className={ADMIN_FORM_GRID_2_CLASS}>
            <label className={ADMIN_FORM_FIELD_CLASS} htmlFor="ping_name">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("common.name")}</span>
            <TextField.Root id="ping_name" name="ping_name" />
            </label>
            <label className={ADMIN_FORM_FIELD_CLASS} htmlFor="type">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("ping.type")}</span>
            <Select.Root
              value={selectedType}
              onValueChange={(value) =>
                setSelectedType(value as "icmp" | "tcp" | "http")
              }
            >
              <Select.Trigger id="type" name="type" />
              <Select.Content>
                <Select.Item value="icmp">ICMP</Select.Item>
                <Select.Item value="tcp">TCP</Select.Item>
                <Select.Item value="http">HTTP</Select.Item>
              </Select.Content>
            </Select.Root>
            </label>
          </div>
          <label className={ADMIN_FORM_FIELD_CLASS} htmlFor="ping_target">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("ping.target")}</span>
            <TextField.Root
              id="ping_target"
              name="ping_target"
              placeholder="1.1.1.1 | 1.1.1.1:80 | https://1.1.1.1"
            />
          </label>
          <div className={ADMIN_FORM_FIELD_CLASS}>
            <label htmlFor="ping_server" className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("common.server")}</label>
            <div className="flex items-center justify-start gap-2">
              <NodeSelectorDialog value={selected} onChange={setSelected} />
              <label className="text-md font-normal">
                {t("common.selected", { count: selected.length })}
              </label>
            </div>
          </div>
          <label className={ADMIN_FORM_FIELD_CLASS} htmlFor="interval">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {t("ping.interval")} ({t("time.second")})
            </span>
            <TextField.Root
              id="interval"
              name="interval"
              defaultValue={60}
              type="number"
              placeholder="60"
            />
          </label>
            <div className="flex justify-end gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
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

export default PingTask;
