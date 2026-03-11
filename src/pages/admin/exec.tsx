import { useState, useRef, useEffect } from "react";
import Loading from "@/components/loading";
import { NodeDetailsProvider, useNodeDetails } from "@/contexts/NodeDetailsContext";
import { useTranslation } from "react-i18next";
import {
    Play,
    Terminal,
    AlertCircle,
    CheckCircle2,
    Copy,
    Clock,
    Save,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";
import NodeSelector from "@/components/NodeSelector";
import {
    AdminPageShell,
    AdminSurface,
} from "@/components/admin/AdminPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TaskResult {
    task_id: string;
    client: string;
    client_info: {
        uuid: string;
        name: string;
        [key: string]: any;
    };
    result: string;
    exit_code: number | null;
    finished_at: string | null;
    created_at: string;
}

interface ExecResponse {
    success?: boolean;
    task_id?: string;
    clients?: string[];
    message?: string;
    // 新的响应格式
    status?: string;
    data?: {
        task_id: string;
    };
}

interface TaskResultResponse {
    success?: boolean;
    results?: TaskResult[];
    message?: string;
    // 新的响应格式
    status?: string;
    data?: TaskResult[];
}

interface SavedCommandPreset {
    id: string;
    name: string;
    command: string;
    updatedAt: number;
}

const SAVED_COMMANDS_STORAGE_KEY = "komari.admin.exec.savedCommands";

const ExecPage = () => {
    return (
        <NodeDetailsProvider>
            <ExecContent />
        </NodeDetailsProvider>
    );
};

const ExecContent = () => {
    const { t } = useTranslation();
    const { nodeDetail, isLoading, error } = useNodeDetails();
    const [command, setCommand] = useState("");
    const [commandName, setCommandName] = useState("");
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
    const [executing, setExecuting] = useState(false);
    const [results, setResults] = useState<TaskResult[]>([]);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [polling, setPolling] = useState(false);
    const [savedCommands, setSavedCommands] = useState<SavedCommandPreset[]>([]);

    // 使用 useRef 来保存轮询相关的引用
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 清理轮询的函数
    const clearPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
        }
        setPolling(false);
    };

    // 组件卸载时清理轮询
    useEffect(() => {
        return () => {
            clearPolling();
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        try {
            const raw = window.localStorage.getItem(SAVED_COMMANDS_STORAGE_KEY);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return;
            }

            setSavedCommands(
                parsed.filter(
                    (item): item is SavedCommandPreset =>
                        typeof item?.id === "string" &&
                        typeof item?.name === "string" &&
                        typeof item?.command === "string" &&
                        typeof item?.updatedAt === "number",
                ),
            );
        } catch (storageError) {
            console.warn("加载已保存命令失败:", storageError);
        }
    }, []);

    if (isLoading) {
        return <Loading />;
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    // 轮询任务结果
    const pollTaskResult = async (taskId: string) => {
        try {
            const response = await fetch(`/api/admin/task/${taskId}/result`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: TaskResultResponse = await response.json();
            let taskResults: TaskResult[] | undefined;

            // 支持旧格式和新格式
            if (data.success && data.results) {
                taskResults = data.results;
            } else if (data.status === "success" && data.data) {
                taskResults = data.data;
            }

            if (taskResults) {
                setResults(taskResults);

                // 检查是否所有任务都已完成
                const allCompleted = taskResults.every(result => result.finished_at !== null);
                if (allCompleted) {
                    clearPolling();
                    toast.success(t("exec.allCompleted", "所有任务执行完成"));
                }
            }
        } catch (err) {
            console.error("轮询任务结果失败:", err);
            clearPolling();
        }
    };

    // 开始轮询
    const startPolling = (taskId: string) => {
        // 先清理之前的轮询
        clearPolling();

        setPolling(true);

        // 首次立即执行
        pollTaskResult(taskId);

        // 设置定时轮询
        pollingIntervalRef.current = setInterval(() => {
            pollTaskResult(taskId);
        }, 2000);

        // 60秒后停止轮询并设置为超时状态
        pollingTimeoutRef.current = setTimeout(() => {
            // 将未完成的任务状态设置为超时
            setResults(prevResults =>
                prevResults.map(result =>
                    result.finished_at === null
                        ? { ...result, finished_at: new Date().toISOString(), exit_code: -1, result: "执行超时" }
                        : result
                )
            );
            clearPolling();
            toast.warning(t("exec.pollingTimeout", "任务执行超时"));
        }, 60000);
    };

    const executeCommand = async () => {
        if (!command.trim()) {
            toast.error(t("exec.errors.emptyCommand"));
            return;
        }

        if (selectedNodes.length === 0) {
            toast.error(t("exec.errors.noNodes"));
            return;
        }

        // 清理之前的轮询
        clearPolling();

        setExecuting(true);
        setResults([]);
        setTaskId(null);

        try {
            const response = await fetch("/api/admin/task/exec", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    command: command.trim(),
                    clients: selectedNodes,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data: ExecResponse = await response.json();

            if (data.success && data.task_id) {
                setTaskId(data.task_id);
                toast.success(t("exec.taskStarted"));
                startPolling(data.task_id);
            } else if (data.status === "success" && data.data?.task_id) {
                setTaskId(data.data.task_id);
                toast.success(t("exec.taskStarted"));
                startPolling(data.data.task_id);
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "未知错误";
            toast.error(errorMessage);
        } finally {
            setExecuting(false);
        }
    };

    const copyOutput = (output: string) => {
        navigator.clipboard.writeText(output);
        toast.success(t("common.success"));
    };

    const syncSavedCommands = (nextCommands: SavedCommandPreset[]) => {
        setSavedCommands(nextCommands);

        if (typeof window === "undefined") {
            return;
        }

        window.localStorage.setItem(
            SAVED_COMMANDS_STORAGE_KEY,
            JSON.stringify(nextCommands),
        );
    };

    const getDefaultCommandName = () => {
        const explicitName = commandName.trim();
        if (explicitName) {
            return explicitName;
        }

        const firstLine = command
            .split("\n")
            .map((line) => line.trim())
            .find(Boolean);

        if (!firstLine) {
            return t("exec.savedCommandUntitled", {
                defaultValue: "未命名命令",
            });
        }

        return firstLine.length > 32 ? `${firstLine.slice(0, 32)}...` : firstLine;
    };

    const getCommandPreview = (value: string) => {
        const lines = value
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

        if (lines.length === 0) {
            return "";
        }

        const preview = lines[0];
        if (lines.length > 1 || preview.length > 72) {
            return `${preview.slice(0, 72)}...`;
        }
        return preview;
    };

    const saveCurrentCommand = () => {
        const trimmedCommand = command.trim();
        if (!trimmedCommand) {
            toast.error(t("exec.errors.emptyCommand"));
            return;
        }

        const resolvedName = getDefaultCommandName();
        const currentTimestamp = Date.now();
        const existingPreset = savedCommands.find(
            (item) => item.name === resolvedName,
        );

        const nextPreset: SavedCommandPreset = {
            id: existingPreset?.id ?? `${currentTimestamp}`,
            name: resolvedName,
            command: trimmedCommand,
            updatedAt: currentTimestamp,
        };

        const nextCommands = [
            nextPreset,
            ...savedCommands.filter((item) => item.id !== existingPreset?.id),
        ].slice(0, 12);

        syncSavedCommands(nextCommands);
        setCommandName(resolvedName);
        toast.success(
            existingPreset
                ? t("exec.savedCommandUpdated", {
                    defaultValue: "已更新保存命令",
                })
                : t("exec.savedCommandSaved", {
                    defaultValue: "命令已保存",
                }),
        );
    };

    const applySavedCommand = (preset: SavedCommandPreset) => {
        setCommand(preset.command);
        setCommandName(preset.name);
        toast.success(
            t("exec.savedCommandApplied", {
                defaultValue: "已填充保存命令",
            }),
        );
    };

    const removeSavedCommand = (presetId: string) => {
        const nextCommands = savedCommands.filter((item) => item.id !== presetId);
        syncSavedCommands(nextCommands);
        toast.success(
            t("exec.savedCommandDeleted", {
                defaultValue: "已删除保存命令",
            }),
        );
    };

    const getSelectedNodeNames = () => {
        return selectedNodes.map(uuid => {
            const node = nodeDetail.find(n => n.uuid === uuid);
            return node ? node.name : uuid;
        }).join(", ");
    };

    const getTaskStatus = (result: TaskResult) => {
        if (result.finished_at === null) {
            return {
                status: "running",
                variant: "info" as const,
                text: t("exec.status.running"),
            };
        }
        if (result.result === "执行超时") {
            return {
                status: "timeout",
                variant: "warning" as const,
                text: t("exec.status.timeout", "超时"),
            };
        }
        if (result.exit_code === 0) {
            return {
                status: "success",
                variant: "success" as const,
                text: t("common.success"),
            };
        }
        return {
            status: "failed",
            variant: "destructive" as const,
            text: t("common.error"),
        };
    };

    const completedResults = results.filter((result) => result.finished_at !== null).length;

    return (
        <AdminPageShell
            eyebrow={t("exec.title")}
            title="批量命令执行"
            description={t("exec.description")}
            stats={[
                {
                    label: "目标节点",
                    value: `${selectedNodes.length}`,
                    hint: selectedNodes.length > 0 ? getSelectedNodeNames() : "尚未选择节点。",
                    tone: "blue",
                },
                {
                    label: "执行状态",
                    value: executing ? t("exec.executing") : polling ? "轮询中" : "待执行",
                    hint: taskId ? `Task ID: ${taskId}` : "提交后会自动轮询结果。",
                    tone: polling ? "amber" : "emerald",
                },
                {
                    label: "结果进度",
                    value: `${completedResults} / ${results.length || 0}`,
                    hint: results.length > 0 ? "按节点维度汇总执行结果。" : "暂无执行结果。",
                    tone: results.length > 0 ? "slate" : "amber",
                },
            ]}
        >
            <AdminSurface className="py-2">
                <div className="grid gap-5 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]">
                    <section className="min-w-0 border-b border-slate-200/80 pb-4 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="block text-[13px] font-medium text-slate-900">
                                    {t("exec.selectNodes")}
                                </p>
                                <p className="block text-[12px] text-slate-500">
                                    {t("exec.selectedNodes", {
                                        defaultValue: "已选择节点",
                                    })}: {selectedNodes.length}
                                </p>
                            </div>
                        </div>
                        <div className="min-h-[320px]">
                            <NodeSelector
                                value={selectedNodes}
                                onChange={setSelectedNodes}
                                className="min-h-[320px]"
                            />
                        </div>
                        {selectedNodes.length > 0 && (
                            <p className="mt-2 block text-[12px] leading-5 text-slate-500">
                                {t("exec.selectedNodes", "已选择节点")}: {getSelectedNodeNames()}
                            </p>
                        )}
                    </section>

                    <section className="min-w-0">
                        <div className="flex flex-col gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Terminal size={15} className="text-slate-500" />
                                    <p className="text-[13px] font-medium text-slate-900">
                                        {t("exec.command")}
                                    </p>
                                </div>
                                <p className="block text-[12px] leading-5 text-slate-500">
                                    {taskId
                                        ? `Task ID: ${taskId}`
                                        : t("exec.commandEditorHint", {
                                            defaultValue: "支持保存常用命令，并对选中节点批量执行。",
                                        })}
                                </p>
                            </div>

                            <Textarea
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                placeholder={t("exec.commandPlaceholder")}
                                rows={7}
                                className="min-h-[180px] rounded-lg border-slate-200 bg-white text-[13px] leading-5 shadow-none focus-visible:ring-slate-200"
                            />

                            <div className="flex flex-col gap-2 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-end">
                                <div className="min-w-0 flex-1">
                                    <p className="mb-1 block text-[12px] text-slate-500">
                                        {t("exec.savedCommandName", {
                                            defaultValue: "命令名称",
                                        })}
                                    </p>
                                    <Input
                                        value={commandName}
                                        onChange={(e) => setCommandName(e.target.value)}
                                        placeholder={t("exec.savedCommandNamePlaceholder", {
                                            defaultValue: "留空时自动取命令首行",
                                        })}
                                        className="h-9 rounded-lg border-slate-200 bg-white text-[13px] shadow-none focus-visible:ring-slate-200"
                                    />
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={saveCurrentCommand}
                                    disabled={!command.trim()}
                                    className="rounded-lg border-slate-200 bg-white text-[12px] shadow-none hover:bg-slate-50"
                                >
                                    <Save size={15} />
                                    {t("exec.saveCommand", {
                                        defaultValue: "保存命令",
                                    })}
                                </Button>

                                <Button
                                    onClick={executeCommand}
                                    disabled={executing || !command.trim() || selectedNodes.length === 0}
                                    size="sm"
                                    className="rounded-lg text-[12px]"
                                >
                                    {executing ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                            {t("exec.executing")}
                                        </>
                                    ) : (
                                        <>
                                            <Play size={16} />
                                            {t("exec.execute")}
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="block text-[13px] font-medium text-slate-900">
                                            {t("exec.savedCommands", {
                                                defaultValue: "已保存命令",
                                            })}
                                        </p>
                                        <p className="block text-[12px] text-slate-500">
                                            {t("exec.savedCommandsHint", {
                                                defaultValue: "仅保存在当前浏览器，可一键回填。",
                                            })}
                                        </p>
                                    </div>
                                    {savedCommands.length > 0 && (
                                        <span className="text-[12px] text-slate-400">
                                            {savedCommands.length}
                                        </span>
                                    )}
                                </div>

                                {savedCommands.length === 0 ? (
                                    <div className="border border-dashed border-slate-200/80 px-3 py-4 text-[12px] text-slate-500">
                                        {t("exec.savedCommandsEmpty", {
                                            defaultValue: "还没有保存的命令。",
                                        })}
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-200/70 border-t border-slate-200/80">
                                        {savedCommands.map((preset) => (
                                            <div
                                                key={preset.id}
                                                className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between"
                                            >
                                                <div className="min-w-0">
                                                    <p className="block text-[13px] font-medium text-slate-900">
                                                        {preset.name}
                                                    </p>
                                                    <p className="block text-[12px] leading-5 text-slate-500">
                                                        {getCommandPreview(preset.command)}
                                                    </p>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => applySavedCommand(preset)}
                                                        className="rounded-md text-[12px]"
                                                    >
                                                        {t("exec.useSavedCommand", {
                                                            defaultValue: "使用",
                                                        })}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeSavedCommand(preset.id)}
                                                        className="h-8 w-8 rounded-md text-red-600 hover:bg-red-50 hover:text-red-700"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </AdminSurface>

            {/* 执行结果区域 */}
            {results.length > 0 && (
                <AdminSurface className="py-2">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-slate-900">
                                {t("exec.results", "执行结果")}
                            </p>
                            {taskId && (
                                <span className="text-[12px] text-slate-500">
                                    Task ID: {taskId}
                                </span>
                            )}
                        </div>

                        <div className="space-y-4">
                            {results.map((result) => {
                                const status = getTaskStatus(result);
                                return (
                                    <div
                                        key={result.client}
                                        className="border-b border-slate-200/70 py-4 last:border-b-0"
                                    >
                                        <div className="flex flex-col gap-3">
                                            {/* 节点信息和状态 */}
                                            <p className="text-base font-medium text-slate-900">
                                                {nodeDetail.find(n => n.uuid === result.client)?.name || result.client}
                                            </p>
                                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-medium text-slate-900">
                                                        {result.client_info.name}
                                                    </span>
                                                    <Badge
                                                        variant={status.variant}
                                                        className="rounded-md"
                                                    >
                                                        {status.status === "running" ? (
                                                            <>
                                                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
                                                                {status.text}
                                                            </>
                                                        ) : status.status === "success" ? (
                                                            <>
                                                                <CheckCircle2 size={12} />
                                                                {status.text}
                                                            </>
                                                        ) : status.status === "timeout" ? (
                                                            <>
                                                                <Clock size={12} />
                                                                {status.text}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertCircle size={12} />
                                                                {status.text}
                                                            </>
                                                        )}
                                                    </Badge>
                                                    {result.exit_code !== null && (
                                                        <span className="text-[12px] text-slate-500">
                                                            Exit Code: {result.exit_code}
                                                        </span>
                                                    )}
                                                </div>

                                                {result.result && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => copyOutput(result.result)}
                                                        className="h-8 w-8 rounded-md"
                                                    >
                                                        <Copy size={14} />
                                                    </Button>
                                                )}
                                            </div>

                                            {/* 时间信息 */}
                                            {/* <Flex gap="4" className="text-sm text-gray-500">
                                                <Text size="1" color="gray">
                                                    创建时间: {new Date(result.created_at).toLocaleString()}
                                                </Text>
                                                {result.finished_at && (
                                                    <Text size="1" color="gray">
                                                        完成时间: {new Date(result.finished_at).toLocaleString()}
                                                    </Text>
                                                )}
                                            </Flex> */}

                                            {/* 输出内容 */}
                                            {result.result && (
                                                <div className="border-l-2 border-slate-200 pl-4 font-mono text-sm overflow-x-auto">
                                                    <pre className="whitespace-pre-wrap">{result.result}</pre>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 轮询状态提示 */}
                        {polling && (
                            <div className="flex flex-col gap-3 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                    <span className="text-[12px] text-slate-500">
                                        正在获取最新执行状态...
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearPolling}
                                    className="rounded-lg border-slate-200 bg-white text-[12px] shadow-none hover:bg-slate-50"
                                >
                                    停止轮询
                                </Button>
                            </div>
                        )}
                    </div>
                </AdminSurface>
            )}
        </AdminPageShell>
    );
};

export default ExecPage;
