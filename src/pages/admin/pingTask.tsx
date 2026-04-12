import Loading from "@/components/loading";
import NodeSelectorDialog from "@/components/NodeSelectorDialog";
import {
  NodeDetailsProvider,
  useNodeDetails,
} from "@/contexts/NodeDetailsContext";
import {
  PingTaskProvider,
  usePingTask,
  type PingTask,
} from "@/contexts/PingTaskContext";
import { useSettings } from "@/lib/api";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TaskView } from "./pingTask_Task";
import { ServerView } from "./pingTask_Server";

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
  const { isLoading: nodeDetailLoading, error: nodeDetailError } =
    useNodeDetails();
  const { t } = useTranslation();

  if (isLoading || nodeDetailLoading) {
    return <Loading />;
  }
  if (error || nodeDetailError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error || nodeDetailError}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 p-4 text-foreground">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("ping.title")}</h1>
        <AddButton />
      </div>
      <Tabs defaultValue="task">
        <TabsList>
          <TabsTrigger value="task">{t("ping.task_view")}</TabsTrigger>
          <TabsTrigger value="server">{t("ping.server_view")}</TabsTrigger>
        </TabsList>
        <div className="pt-3">
          <TabsContent value="task">
            <TaskView pingTasks={pingTasks ?? []} />
          </TabsContent>
          <TabsContent value="server">
            <ServerView pingTasks={pingTasks ?? []} />
          </TabsContent>
        </div>
      </Tabs>
      <DiskUsageEstimate />
    </div>
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
    <div className="text-sm text-muted-foreground">
      <p>
        {t("ping.disk_usage_estimate")}: {formatBytes(dailyUsage)}/
        {t("common.day")},{" "}
        {t("ping.disk_usage_with_settings", {
          hour: settings.ping_record_preserve_time,
          space: formatBytes(
            (dailyUsage * settings.ping_record_preserve_time) / 24
          ),
        })}
      </p>
    </div>
  );
};

const AddButton: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [submitError, setSubmitError] = React.useState("");
  const { refresh } = usePingTask();
  const [selectedType, setSelectedType] = React.useState<
    "icmp" | "tcp" | "http"
  >("icmp");
  const [saving, setSaving] = React.useState(false);
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");
    const name = e.currentTarget.ping_name.value.trim();
    const target = e.currentTarget.ping_target.value.trim();
    const interval = parseInt(e.currentTarget.interval.value, 10);

    if (!name) {
      setSubmitError(
        t("ping.validation.name_required", {
          defaultValue: "Task name is required.",
        }),
      );
      return;
    }
    if (!target) {
      setSubmitError(
        t("ping.validation.target_required", {
          defaultValue: "Target is required.",
        }),
      );
      return;
    }
    if (selected.length === 0) {
      setSubmitError(
        t("ping.validation.server_required", {
          defaultValue: "Select at least one server.",
        }),
      );
      return;
    }
    if (!Number.isFinite(interval) || interval <= 0) {
      setSubmitError(
        t("ping.validation.interval_required", {
          defaultValue: "Interval must be greater than 0.",
        }),
      );
      return;
    }

    const payload = {
      name,
      type: selectedType,
      target,
      clients: selected,
      interval,
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
              const message = data?.message || t("common.error");
              setSubmitError(message);
              toast.error(message);
            })
            .catch((error) => {
              setSubmitError(error.message);
              toast.error(error.message);
            });
        }
      })
      .catch((error) => {
        console.error("Error adding ping task:", error);
        setSubmitError(error.message);
        toast.error(error.message);
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
              title={t("ping.form.basic", { defaultValue: "Basic settings" })}
              description={t("ping.form.basic_description", {
                defaultValue: "Configure task name, probe type and target.",
              })}
            >
              <FormField label={t("common.name")} htmlFor="ping_name" required>
                <Input id="ping_name" name="ping_name" />
              </FormField>

              <FormField label={t("ping.type")} htmlFor="type" required>
                <Select
                  value={selectedType}
                  onValueChange={(value) =>
                    setSelectedType(value as "icmp" | "tcp" | "http")
                  }
                >
                  <SelectTrigger id="type" name="type" />
                  <SelectContent>
                    <SelectItem value="icmp">ICMP</SelectItem>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="http">HTTP</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label={t("ping.target")}
                htmlFor="ping_target"
                required
              >
                <Input
                  id="ping_target"
                  name="ping_target"
                  placeholder="1.1.1.1 | 1.1.1.1:80 | https://1.1.1.1"
                />
                <FormHelpText>
                  {t("ping.form.target_help", {
                    defaultValue: "Supports IP, host:port, or URL.",
                  })}
                </FormHelpText>
              </FormField>

              <FormField label={t("common.server")} htmlFor="ping_server" required>
                <div className="flex items-center justify-start gap-2">
                  <NodeSelectorDialog value={selected} onChange={setSelected} />
                  <span className="text-sm text-muted-foreground">
                    {t("common.selected", { count: selected.length })}
                  </span>
                </div>
              </FormField>
            </FormSection>

            <FormSection
              advanced
              title={t("ping.form.advanced", { defaultValue: "Advanced settings" })}
              toggleLabel={t("common.advanced", { defaultValue: "Advanced options" })}
            >
              <FormField
                label={`${t("ping.interval")} (${t("time.second")})`}
                htmlFor="interval"
                required
              >
                <Input
                  id="interval"
                  name="interval"
                  defaultValue={60}
                  type="number"
                  min={1}
                  placeholder="60"
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

export default PingTask;
