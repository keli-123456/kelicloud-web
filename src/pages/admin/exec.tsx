import { useState, useRef, useEffect, type UIEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { toast } from "sonner";
import NodeSelector from "@/components/NodeSelector";
import {
    AdminEmptyState,
    AdminPageShell,
    AdminSettingsSkeleton,
    AdminSurface,
    AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    // New response format.
    status?: string;
    data?: {
        task_id: string;
    };
}

interface TaskResultResponse {
    success?: boolean;
    results?: TaskResult[];
    message?: string;
    // New response format.
    status?: string;
    data?: TaskResult[];
}

const EXEC_TIMEOUT_SENTINEL = "__KOMARI_EXEC_TIMEOUT__";

const getCodeLines = (value: string) => {
    const lines = value.split(/\r?\n/);
    return lines.length > 0 ? lines : [""];
};

const getLineNumbers = (value: string) =>
    Array.from({ length: Math.max(1, getCodeLines(value).length) }, (_, index) => index + 1);

type ExecPageLocationState = {
    presetCommand?: {
        name?: string;
        text?: string;
    };
} | null;

const ExecPage = () => {
    return (
        <NodeDetailsProvider>
            <ExecContent />
        </NodeDetailsProvider>
    );
};

const ExecContent = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const routeState = (location.state as ExecPageLocationState) ?? null;
    const { nodeDetail, isLoading, error } = useNodeDetails();
    const [command, setCommand] = useState("");
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
    const [executing, setExecuting] = useState(false);
    const [results, setResults] = useState<TaskResult[]>([]);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [polling, setPolling] = useState(false);

    // Keep polling handles in refs.
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const commandLineNumberRef = useRef<HTMLDivElement | null>(null);
    const commandLineNumbers = getLineNumbers(command);

    const syncCommandLineNumberScroll = (event: UIEvent<HTMLTextAreaElement>) => {
        if (commandLineNumberRef.current) {
            commandLineNumberRef.current.scrollTop = event.currentTarget.scrollTop;
        }
    };

    // Stop any active polling timers.
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

    // Clean up on unmount.
    useEffect(() => {
        return () => {
            clearPolling();
        };
    }, []);

    useEffect(() => {
        const presetCommand = routeState?.presetCommand;
        if (!presetCommand?.text) {
            return;
        }

        setCommand(presetCommand.text);
        toast.success(
            t("exec.savedCommandApplied", {
                defaultValue: "Command content applied",
            }),
        );

        navigate(`${location.pathname}${location.search}`, {
            replace: true,
            state: null,
        });
    }, [location.pathname, location.search, navigate, routeState, t]);

    if (isLoading) {
        return (
            <AdminPageShell
                title={t("exec.title", {
                    defaultValue: "远程执行",
                })}
                description={t("exec.page_description", {
                    defaultValue: "选择目标节点，编写一次性命令或复用脚本库，并在同一工作台追踪执行结果。",
                })}
            >
                <AdminSurface className="overflow-hidden border-y border-slate-200/80 dark:border-slate-800/90">
                    <div className="grid min-h-[520px] gap-4 p-4 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]">
                        <AdminSettingsSkeleton sections={3} />
                        <AdminTableSkeleton columns={4} rows={5} />
                    </div>
                </AdminSurface>
            </AdminPageShell>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
            </div>
        );
    }

    const getTimeoutOutput = () =>
        t("exec.status.timeout_output", "Execution timed out");
    const getDisplayOutput = (output: string) =>
        output === EXEC_TIMEOUT_SENTINEL ? getTimeoutOutput() : output;
    const getNodeDisplayAddress = (uuid: string) => {
        const node = nodeDetail.find((item) => item.uuid === uuid);
        return node?.ipv4 || node?.ipv6 || node?.name || uuid;
    };
    const getNodeDisplayName = (uuid: string) => {
        const node = nodeDetail.find((item) => item.uuid === uuid);
        return node?.name || uuid;
    };
    const shouldShowNodeName = (uuid: string) => {
        const address = getNodeDisplayAddress(uuid);
        const name = getNodeDisplayName(uuid);
        return Boolean(name) && name !== address && name !== uuid;
    };

    // Poll task results.
    const pollTaskResult = async (taskId: string) => {
        try {
            const response = await fetch(`/api/admin/task/${taskId}/result`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: TaskResultResponse = await response.json();
            let taskResults: TaskResult[] | undefined;

            // Support both the legacy and current response shapes.
            if (data.success && data.results) {
                taskResults = data.results;
            } else if (data.status === "success" && data.data) {
                taskResults = data.data;
            }

            if (taskResults) {
                setResults(taskResults);

                // Stop polling once every result is finished.
                const allCompleted = taskResults.every(result => result.finished_at !== null);
                if (allCompleted) {
                    clearPolling();
                    toast.success(t("exec.allCompleted", "All tasks executed successfully"));
                }
            }
        } catch (err) {
            console.error("Failed to poll task results:", err);
            clearPolling();
        }
    };

    // Start polling.
    const startPolling = (taskId: string) => {
        // Clear any previous polling cycle first.
        clearPolling();

        setPolling(true);

        // Run immediately once.
        pollTaskResult(taskId);

        // Continue polling on an interval.
        pollingIntervalRef.current = setInterval(() => {
            pollTaskResult(taskId);
        }, 2000);

        // Stop polling after 60 seconds and mark pending tasks as timed out.
        pollingTimeoutRef.current = setTimeout(() => {
            // Mark unfinished tasks as timed out.
            setResults(prevResults =>
                prevResults.map(result =>
                    result.finished_at === null
                        ? {
                            ...result,
                            finished_at: new Date().toISOString(),
                            exit_code: -1,
                            result: EXEC_TIMEOUT_SENTINEL,
                        }
                        : result
                )
            );
            clearPolling();
            toast.warning(t("exec.pollingTimeout", "Task execution timed out"));
        }, 60000);
    };

    const executeCommand = async (commandOverride?: string) => {
        const commandToRun = (commandOverride ?? command).trim();

        if (!commandToRun) {
            toast.error(t("exec.errors.emptyCommand"));
            return;
        }

        if (selectedNodes.length === 0) {
            toast.error(t("exec.errors.noNodes"));
            return;
        }

        // Clear any previous polling state.
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
                    command: commandToRun,
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
            const errorMessage =
                err instanceof Error ? err.message : t("common.unknown_error");
            toast.error(errorMessage);
        } finally {
            setExecuting(false);
        }
    };

    const copyOutput = (output: string) => {
        navigator.clipboard.writeText(output);
        toast.success(t("copy_success", "Copied!"));
    };

    const getSelectedNodeAddresses = () => selectedNodes
        .map((uuid) => getNodeDisplayAddress(uuid))
        .join(", ");

    const getTaskStatus = (result: TaskResult) => {
        if (result.finished_at === null) {
            return {
                status: "running",
                variant: "info" as const,
                text: t("exec.status.running"),
            };
        }
        if (result.result === EXEC_TIMEOUT_SENTINEL) {
            return {
                status: "timeout",
                variant: "warning" as const,
                text: t("exec.status.timeout", "Timeout"),
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

    return (
        <AdminPageShell
            title={t("exec.title", {
                defaultValue: "远程执行",
            })}
            description={t("exec.page_description", {
                defaultValue: "选择目标节点，编写一次性命令或复用脚本库，并在同一工作台追踪执行结果。",
            })}
        >
            <AdminSurface className="overflow-hidden border-y border-slate-200/80 dark:border-slate-800/90">
                <div className="grid min-h-[520px] xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]">
                    <section className="min-w-0 border-b border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-900/20 xl:border-b-0 xl:border-r">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="block text-[14px] font-medium text-slate-900 dark:text-slate-100">
                                    {t("exec.selectNodes")}
                                </p>
                                <p className="block text-sm leading-5 text-slate-500 dark:text-slate-400">
                                    {t("exec.selectNodesHint", {
                                        defaultValue: "从当前节点列表中选择需要执行命令的机器。",
                                    })}
                                </p>
                            </div>
                            <Badge variant="secondary" className="shrink-0 rounded-md">
                                {selectedNodes.length}
                            </Badge>
                        </div>
                        <div className="min-h-[360px]">
                            <NodeSelector
                                value={selectedNodes}
                                onChange={setSelectedNodes}
                                displayMode="ip"
                                className="min-h-[360px]"
                            />
                        </div>
                        {selectedNodes.length > 0 && (
                                <p className="mt-2 block text-sm leading-6 text-slate-500 dark:text-slate-400">
                                {t("exec.selectedNodes", {
                                    defaultValue: "已选节点",
                                })}: {getSelectedNodeAddresses()}
                            </p>
                        )}
                    </section>

                    <section className="min-w-0 p-4">
                        <div className="flex flex-col gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Terminal size={15} className="text-slate-500 dark:text-slate-400" />
                                    <p className="text-[14px] font-medium text-slate-900 dark:text-slate-100">
                                        {t("exec.command")}
                                    </p>
                                </div>
                                <p className="block text-sm leading-6 text-slate-500 dark:text-slate-400">
                                    {taskId
                                        ? `${t("exec.task_id_label", {
                                            defaultValue: "Task ID",
                                        })}: ${taskId}`
                                        : t("exec.commandEditorHint", {
                                            defaultValue: "可先在脚本库维护常用命令，也可以在这里临时输入一次性命令。",
                                        })}
                                </p>
                            </div>

                            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-none dark:border-slate-700">
                                <div className="flex h-9 items-center justify-between border-b border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-100">
                                    <div className="flex items-center gap-2 text-[12px] font-medium text-slate-600 dark:text-slate-600">
                                        <Terminal size={13} />
                                        <span>{t("exec.command", { defaultValue: "Command" })}</span>
                                    </div>
                                    <span className="text-[11px] text-slate-400 dark:text-slate-400">shell</span>
                                </div>
                                <div className="flex h-[260px] bg-white">
                                    <div
                                        ref={commandLineNumberRef}
                                        aria-hidden="true"
                                        className="h-full w-12 shrink-0 overflow-hidden border-r border-slate-200 bg-slate-50 px-2 py-3 text-right font-mono text-[12px] leading-6 text-slate-400 select-none dark:border-slate-700 dark:bg-slate-100 dark:text-slate-400"
                                    >
                                        {commandLineNumbers.map((lineNumber) => (
                                            <div key={lineNumber} className="h-6">
                                                {lineNumber}
                                            </div>
                                        ))}
                                    </div>
                                    <Textarea
                                        value={command}
                                        onChange={(e) => setCommand(e.target.value)}
                                        onScroll={syncCommandLineNumberScroll}
                                        placeholder={t("exec.commandPlaceholder")}
                                        rows={10}
                                        wrap="off"
                                        spellCheck={false}
                                        className="h-full min-h-full flex-1 resize-none overflow-auto rounded-none border-0 bg-white px-4 py-3 font-mono text-[13px] leading-6 text-slate-800 shadow-none outline-none whitespace-pre placeholder:text-slate-400 focus-visible:ring-0 dark:bg-white dark:text-slate-800 dark:placeholder:text-slate-400 [field-sizing:fixed] [scrollbar-gutter:stable]"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 border-b border-slate-200/80 pb-4 dark:border-slate-800/80 sm:flex-row sm:items-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        navigate("/admin/scripts", {
                                            state: {
                                                draftCommand: {
                                                    text: command,
                                                },
                                            },
                                        });
                                    }}
                                    disabled={!command.trim()}
                                    className="rounded-lg border-slate-200 bg-white text-sm shadow-none hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
                                >
                                    <Save size={15} />
                                    {t("command_clipboard.save_from_exec", {
                                        defaultValue: "保存到脚本库",
                                    })}
                                </Button>

                                <Button
                                    onClick={() => { void executeCommand(); }}
                                    disabled={executing || !command.trim() || selectedNodes.length === 0}
                                    size="sm"
                                    className="rounded-lg text-sm"
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

                            <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/30">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-[14px] font-medium text-slate-900 dark:text-slate-100">
                                            {t("command_clipboard.open_library", {
                                                defaultValue: "脚本库",
                                            })}
                                        </p>
                                        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                                            {t("command_clipboard.moved_hint", {
                                                defaultValue: "常用命令已迁移到独立脚本库，远程执行和云实例脚本弹窗都可以复用。",
                                            })}
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link to="/admin/scripts">
                                            <Save size={15} />
                                            {t("command_clipboard.open_library", {
                                                defaultValue: "脚本库",
                                            })}
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </AdminSurface>

            {/* Execution results. */}
            {results.length === 0 ? (
                <AdminEmptyState
                    icon={<Terminal size={18} />}
                    title={t("exec.results_empty_title", {
                        defaultValue: "暂无执行结果",
                    })}
                    description={t("exec.results_empty_description", {
                        defaultValue: "选择节点并执行命令后，每台节点的输出会在这里汇总。",
                    })}
                />
            ) : (
                <AdminSurface className="py-2">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {t("exec.results", "Execution results")}
                            </p>
                            {taskId && (
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    {t("exec.task_id_label", {
                                        defaultValue: "Task ID",
                                    })}: {taskId}
                                </span>
                            )}
                        </div>

                        <div className="space-y-4">
                            {results.map((result) => {
                                const status = getTaskStatus(result);
                                const output = result.result ? getDisplayOutput(result.result) : "";
                                const outputLines = getCodeLines(output);
                                return (
                                    <div
                                        key={result.client}
                                        className="border-b border-slate-200/70 py-4 last:border-b-0 dark:border-slate-800/70"
                                    >
                                        <div className="flex flex-col gap-3">
                                            {/* Node identity and status. */}
                                            <div className="min-w-0">
                                                <p className="truncate text-base font-medium text-slate-900 dark:text-slate-100">
                                                    {getNodeDisplayAddress(result.client)}
                                                </p>
                                                {shouldShowNodeName(result.client) && (
                                                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                                                        {getNodeDisplayName(result.client)}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                <div className="flex flex-wrap items-center gap-2">
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
                                                        <span className="text-sm text-slate-500 dark:text-slate-400">
                                                            {t("exec.exit_code_label", {
                                                                defaultValue: "Exit code",
                                                            })}: {result.exit_code}
                                                        </span>
                                                    )}
                                                </div>

                                                {result.result && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => copyOutput(output)}
                                                        className="h-8 w-8 rounded-md"
                                                    >
                                                        <Copy size={14} />
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Timestamps. */}
                                            {/* <Flex gap="4" className="text-sm text-gray-500">
                                                <Text size="1" color="gray">
                                                    Created at: {new Date(result.created_at).toLocaleString()}
                                                </Text>
                                                {result.finished_at && (
                                                    <Text size="1" color="gray">
                                                        Finished at: {new Date(result.finished_at).toLocaleString()}
                                                    </Text>
                                                )}
                                            </Flex> */}

                                            {/* Output. */}
                                            {result.result && (
                                                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-none dark:border-slate-700">
                                                    <div className="flex h-9 items-center justify-between border-b border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-100">
                                                        <div className="flex min-w-0 items-center gap-2 text-[12px] font-medium text-slate-600 dark:text-slate-600">
                                                            <Terminal size={13} />
                                                            <span className="truncate">
                                                                {t("exec.output_label", {
                                                                    defaultValue: "Output",
                                                                })}
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] text-slate-400 dark:text-slate-400">
                                                            stdout
                                                        </span>
                                                    </div>
                                                    <div className="max-h-[360px] overflow-auto overscroll-contain bg-white [scrollbar-gutter:stable]">
                                                        <div className="grid min-w-max grid-cols-[3rem_minmax(0,1fr)]">
                                                            <div
                                                                aria-hidden="true"
                                                                className="border-r border-slate-200 bg-slate-50 py-3 text-right font-mono text-[12px] leading-5 text-slate-400 select-none dark:border-slate-700 dark:bg-slate-100 dark:text-slate-400"
                                                            >
                                                                {outputLines.map((_, index) => (
                                                                    <div key={`${result.client}-${index}`} className="h-5 px-2">
                                                                        {index + 1}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <pre className="whitespace-pre px-4 py-3 font-mono text-[12px] leading-5 text-slate-800 dark:text-slate-800">{output}</pre>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Polling status. */}
                        {polling && (
                            <div className="flex flex-col gap-3 text-sm text-slate-500 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        {t("exec.polling_status", {
                                            defaultValue: "Fetching the latest execution state...",
                                        })}
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearPolling}
                                    className="rounded-lg border-slate-200 bg-white text-sm shadow-none hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
                                >
                                    {t("exec.stop_polling", {
                                        defaultValue: "Stop polling",
                                    })}
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
