import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { toast } from "sonner";
import NodeSelector from "@/components/NodeSelector";
import {
    AdminPageShell,
    AdminSurface,
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
        return <Loading />;
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
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

    const completedResults = results.filter((result) => result.finished_at !== null).length;

    return (
        <AdminPageShell
            actions={(
                <Button variant="outline" asChild>
                    <Link to="/admin/scripts">
                        <Save size={15} />
                        {t("command_clipboard.open_library", {
                            defaultValue: "Script library",
                        })}
                    </Link>
                </Button>
            )}
            stats={[
                {
                    label: t("exec.stats.target_nodes", {
                        defaultValue: "Target nodes",
                    }),
                    value: `${selectedNodes.length}`,
                    hint: selectedNodes.length > 0
                        ? getSelectedNodeAddresses()
                        : t("exec.stats.target_nodes_empty", {
                            defaultValue: "No nodes selected yet.",
                        }),
                    tone: "blue",
                },
                {
                    label: t("exec.stats.execution_status", {
                        defaultValue: "Execution status",
                    }),
                    value: executing
                        ? t("exec.executing")
                        : polling
                            ? t("exec.stats.polling", {
                                defaultValue: "Polling",
                            })
                            : t("exec.stats.idle", {
                                defaultValue: "Idle",
                            }),
                    hint: taskId
                        ? `${t("exec.task_id_label", {
                            defaultValue: "Task ID",
                        })}: ${taskId}`
                        : t("exec.stats.execution_status_hint", {
                            defaultValue: "Results will be polled automatically after submission.",
                        }),
                    tone: polling ? "amber" : "emerald",
                },
                {
                    label: t("exec.stats.result_progress", {
                        defaultValue: "Result progress",
                    }),
                    value: `${completedResults} / ${results.length || 0}`,
                    hint: results.length > 0
                        ? t("exec.stats.result_progress_hint", {
                            defaultValue: "Execution results are summarized per node.",
                        })
                        : t("exec.stats.result_progress_empty", {
                            defaultValue: "No execution results yet.",
                        }),
                    tone: results.length > 0 ? "slate" : "amber",
                },
            ]}
        >
            <AdminSurface className="py-2">
                <div className="grid gap-5 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]">
                    <section className="min-w-0 border-b border-slate-200/80 pb-4 dark:border-slate-800/80 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="block text-[14px] font-medium text-slate-900 dark:text-slate-100">
                                    {t("exec.selectNodes")}
                                </p>
                                <p className="block text-[13px] text-slate-500 dark:text-slate-400">
                                    {t("exec.selectedNodes", {
                                        defaultValue: "Selected nodes",
                                    })}: {selectedNodes.length}
                                </p>
                            </div>
                        </div>
                        <div className="min-h-[320px]">
                            <NodeSelector
                                value={selectedNodes}
                                onChange={setSelectedNodes}
                                displayMode="ip"
                                className="min-h-[320px]"
                            />
                        </div>
                        {selectedNodes.length > 0 && (
                            <p className="mt-2 block text-[13px] leading-6 text-slate-500 dark:text-slate-400">
                                {t("exec.selectedNodes", "Selected nodes")}: {getSelectedNodeAddresses()}
                            </p>
                        )}
                    </section>

                    <section className="min-w-0">
                        <div className="flex flex-col gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Terminal size={15} className="text-slate-500 dark:text-slate-400" />
                                    <p className="text-[14px] font-medium text-slate-900 dark:text-slate-100">
                                        {t("exec.command")}
                                    </p>
                                </div>
                                <p className="block text-[13px] leading-6 text-slate-500 dark:text-slate-400">
                                    {taskId
                                        ? `${t("exec.task_id_label", {
                                            defaultValue: "Task ID",
                                        })}: ${taskId}`
                                        : t("exec.commandEditorHint", {
                                            defaultValue: "Manage reusable scripts on the library page, then run commands in bulk on selected nodes.",
                                        })}
                                </p>
                            </div>

                            <Textarea
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                placeholder={t("exec.commandPlaceholder")}
                                rows={7}
                                className="min-h-[180px] rounded-lg border-slate-200 bg-white text-[14px] leading-6 shadow-none focus-visible:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus-visible:ring-slate-700"
                            />

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
                                    className="rounded-lg border-slate-200 bg-white text-[13px] shadow-none hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
                                >
                                    <Save size={15} />
                                    {t("command_clipboard.save_from_exec", {
                                        defaultValue: "Save on library page",
                                    })}
                                </Button>

                                <Button
                                    onClick={() => { void executeCommand(); }}
                                    disabled={executing || !command.trim() || selectedNodes.length === 0}
                                    size="sm"
                                    className="rounded-lg text-[13px]"
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

                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-[14px] font-medium text-slate-900 dark:text-slate-100">
                                            {t("command_clipboard.open_library", {
                                                defaultValue: "Script library",
                                            })}
                                        </p>
                                        <p className="text-[13px] leading-6 text-slate-500 dark:text-slate-400">
                                            {t("command_clipboard.moved_hint", {
                                                defaultValue: "Command saving has moved to a dedicated script library page.",
                                            })}
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link to="/admin/scripts">
                                            <Save size={15} />
                                            {t("command_clipboard.open_library", {
                                                defaultValue: "Script library",
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
            {results.length > 0 && (
                <AdminSurface className="py-2">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {t("exec.results", "Execution results")}
                            </p>
                            {taskId && (
                                <span className="text-[13px] text-slate-500 dark:text-slate-400">
                                    {t("exec.task_id_label", {
                                        defaultValue: "Task ID",
                                    })}: {taskId}
                                </span>
                            )}
                        </div>

                        <div className="space-y-4">
                            {results.map((result) => {
                                const status = getTaskStatus(result);
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
                                                    <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">
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
                                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">
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
                                                        onClick={() => copyOutput(getDisplayOutput(result.result))}
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
                                                <div className="overflow-x-auto border-l-2 border-slate-200 pl-4 font-mono text-sm dark:border-slate-800">
                                                    <pre className="whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                                                        {getDisplayOutput(result.result)}
                                                    </pre>
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
                                    <span className="text-[13px] text-slate-500 dark:text-slate-400">
                                        {t("exec.polling_status", {
                                            defaultValue: "Fetching the latest execution state...",
                                        })}
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearPolling}
                                    className="rounded-lg border-slate-200 bg-white text-[13px] shadow-none hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
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
