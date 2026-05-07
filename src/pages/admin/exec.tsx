import { useState, useRef, useEffect, useMemo, useCallback, type ReactNode, type UIEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { NodeDetailsProvider, useNodeDetails } from "@/contexts/NodeDetailsContext";
import { useAdminPageTitle } from "@/contexts/AdminPageTitleContext";
import {
    CommandClipboardProvider,
    useCommandClipboard,
    type CommandClipboard,
} from "@/contexts/CommandClipboardContext";
import { useTranslation } from "react-i18next";
import {
    Play,
    Terminal,
    AlertCircle,
    CheckCircle2,
    Copy,
    Clock,
    Eye,
    Save,
    Plus,
    RefreshCw,
    Search,
} from "lucide-react";
import { toast } from "sonner";
import NodeSelector from "@/components/NodeSelector";
import {
    AdminEmptyState,
    AdminSettingsSkeleton,
    AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import {
    AdminPagination,
    useClientPagination,
} from "@/components/admin/AdminPagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";
import { cn } from "@/lib/utils";

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

interface TaskSummary {
    task_id: string;
    clients: string[];
    command: string;
    results: Array<{
        client: string;
        result: string;
        exit_code: number | null;
        finished_at: string | null;
        created_at: string;
    }>;
}

interface TaskListResponse {
    success?: boolean;
    status?: string;
    data?: TaskSummary[];
    message?: string;
}

const EXEC_TIMEOUT_SENTINEL = "__KOMARI_EXEC_TIMEOUT__";

const getCodeLines = (value: string) => {
    const lines = value.split(/\r?\n/);
    return lines.length > 0 ? lines : [""];
};

const getLineNumbers = (value: string) =>
    Array.from({ length: Math.max(1, getCodeLines(value).length) }, (_, index) => index + 1);

const getLineNumberColumnWidth = (lineCount: number) =>
    `calc(${Math.max(2, String(Math.max(1, lineCount)).length)}ch + 12px)`;

const getCommandEditorHeight = (lineCount: number) =>
    Math.min(260, Math.max(96, lineCount * 20 + 32));

const execPanelClass =
    "overflow-hidden rounded-lg border border-border bg-card shadow-sm shadow-slate-900/5";

type ExecStatusTone = "ok" | "warn" | "bad" | "info";

type ExecLibraryTab = "library" | "history" | "result";

type LoadTaskResultsOptions = {
    switchTab?: boolean;
    stopPolling?: boolean;
};

const formatTimestamp = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
};

const getCommandTitle = (command: CommandClipboard) => {
    const name = command.name.trim();
    if (name) return name;
    const firstLine = command.text.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    return firstLine || `Clipboard #${command.id}`;
};

const getTaskClients = (task: Partial<TaskSummary> | null | undefined) =>
    Array.isArray(task?.clients)
        ? task.clients.filter((client): client is string => typeof client === "string" && client.length > 0)
        : [];

const getTaskResults = (task: Partial<TaskSummary> | null | undefined): TaskSummary["results"] =>
    Array.isArray(task?.results)
        ? task.results
            .filter((result): result is TaskSummary["results"][number] =>
                Boolean(result) && typeof result === "object",
            )
            .map((result) => ({
                client: typeof result.client === "string" ? result.client : "",
                result: typeof result.result === "string" ? result.result : "",
                exit_code: typeof result.exit_code === "number" ? result.exit_code : null,
                finished_at: typeof result.finished_at === "string" ? result.finished_at : null,
                created_at: typeof result.created_at === "string" ? result.created_at : "",
            }))
        : [];

const normalizeTaskSummary = (item: Partial<TaskSummary> | null | undefined): TaskSummary | null => {
    if (!item || typeof item !== "object" || typeof item.task_id !== "string") {
        return null;
    }

    return {
        task_id: item.task_id,
        command: typeof item.command === "string" ? item.command : "",
        clients: getTaskClients(item),
        results: getTaskResults(item),
    };
};

const extractTaskSummaries = (payload: TaskListResponse | TaskSummary[]): TaskSummary[] => {
    const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data)
            ? payload.data
            : [];

    return items
        .map((item) => normalizeTaskSummary(item))
        .filter((item): item is TaskSummary => item !== null);
};

const getTaskCreatedAt = (task: TaskSummary) =>
    getTaskResults(task)
        .map((result) => result.created_at)
        .filter(Boolean)
        .sort()[0] || null;

const getTaskCompletion = (task: TaskSummary) => {
    const taskResults = getTaskResults(task);
    const taskClients = getTaskClients(task);
    const total = taskResults.length || taskClients.length;
    const finished = taskResults.filter((result) => result.finished_at !== null).length;
    return { finished, total };
};

const getTaskTone = (task: TaskSummary): ExecStatusTone => {
    const taskResults = getTaskResults(task);
    if (taskResults.some((result) => result.exit_code !== null && result.exit_code !== 0)) {
        return "bad";
    }
    if (taskResults.length > 0 && taskResults.every((result) => result.finished_at !== null)) {
        return "ok";
    }
    return "info";
};

const extractTaskResults = (payload: unknown): TaskResult[] | null => {
    if (Array.isArray(payload)) {
        return payload as TaskResult[];
    }
    const response = payload as TaskResultResponse;
    if (Array.isArray(response.results)) {
        return response.results;
    }
    if (Array.isArray(response.data)) {
        return response.data;
    }
    return null;
};

type ExecPageLocationState = {
    presetCommand?: {
        name?: string;
        text?: string;
    };
} | null;

const ExecPage = () => {
    return (
        <NodeDetailsProvider>
            <CommandClipboardProvider>
                <ExecContent />
            </CommandClipboardProvider>
        </NodeDetailsProvider>
    );
};

const ExecContent = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const routeState = (location.state as ExecPageLocationState) ?? null;
    const { nodeDetail, isLoading, error } = useNodeDetails();
    const {
        commands,
        loading: commandsLoading,
        error: commandsError,
    } = useCommandClipboard();
    const [command, setCommand] = useState("");
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
    const [executing, setExecuting] = useState(false);
    const [results, setResults] = useState<TaskResult[]>([]);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [polling, setPolling] = useState(false);
    const [activeTab, setActiveTab] = useState<ExecLibraryTab>("library");
    const [librarySearch, setLibrarySearch] = useState("");
    const [recentTasks, setRecentTasks] = useState<TaskSummary[]>([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [tasksError, setTasksError] = useState<string | null>(null);
    const [selectedResultTaskId, setSelectedResultTaskId] = useState<string | null>(null);
    const [resultLoading, setResultLoading] = useState(false);
    const [resultError, setResultError] = useState<string | null>(null);

    // Keep polling handles in refs.
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const commandLineNumberRef = useRef<HTMLDivElement | null>(null);
    const commandLineNumbers = getLineNumbers(command);
    const commandLineNumberColumnWidth = getLineNumberColumnWidth(commandLineNumbers.length);
    const commandEditorHeight = getCommandEditorHeight(commandLineNumbers.length);
    const pageTitle = t("exec.title", {
        defaultValue: "远程执行",
    });

    useAdminPageTitle(
        pageTitle,
        t("exec.page_description", {
            defaultValue: "选择目标节点，编写一次性命令或复用脚本库，并在同一工作台追踪执行结果。",
        }),
    );

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

    const loadRecentTasks = useCallback(async (silent = false) => {
        if (!silent) {
            setTasksLoading(true);
        }
        setTasksError(null);
        try {
            const response = await fetch("/api/admin/task/all", {
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    Accept: "application/json",
                    "Cache-Control": "no-cache, no-store, max-age=0",
                    Pragma: "no-cache",
                    "X-Requested-With": "XMLHttpRequest",
                },
            });
            const payload = await response.json().catch(() => ({})) as TaskListResponse | TaskSummary[];
            if (!response.ok) {
                throw new Error(formatApiErrorMessage(!Array.isArray(payload) && payload.message ? payload.message : "Failed to fetch tasks", { status: response.status }));
            }
            setRecentTasks(extractTaskSummaries(payload));
        } catch (err) {
            const message = getReadableErrorMessage(err, "获取执行任务失败，请刷新后重试。");
            setTasksError(message);
            setRecentTasks([]);
        } finally {
            if (!silent) {
                setTasksLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void loadRecentTasks();
    }, [loadRecentTasks]);

    const normalizedLibrarySearch = librarySearch.trim().toLowerCase();
    const filteredCommands = useMemo(() => {
        const search = normalizedLibrarySearch;
        const sortedCommands = [...commands].sort((left, right) => {
            const weightDiff = (right.weight ?? 0) - (left.weight ?? 0);
            if (weightDiff !== 0) return weightDiff;
            return String(right.updated_at || "").localeCompare(String(left.updated_at || ""));
        });

        if (!search) {
            return sortedCommands;
        }

        return sortedCommands.filter((item) =>
            [
                item.name,
                item.remark,
                item.text,
                String(item.weight ?? ""),
            ].some((value) => String(value || "").toLowerCase().includes(search)),
        );
    }, [commands, normalizedLibrarySearch]);
    const commandPagination = useClientPagination(filteredCommands, {
        initialPageSize: 8,
        resetKey: normalizedLibrarySearch,
    });
    const visibleCommands = commandPagination.pageItems;
    const filteredRecentTasks = useMemo(
        () => {
            const search = normalizedLibrarySearch;
            const filteredTasks = search
                ? recentTasks.filter((item) => {
                    const taskClients = getTaskClients(item);
                    const taskResults = getTaskResults(item);

                    return [
                        item.task_id,
                        taskClients.join(" "),
                        taskResults.map((result) => result.client).join(" "),
                        taskResults.map((result) => result.result).join(" "),
                    ].some((value) => String(value || "").toLowerCase().includes(search));
                })
                : recentTasks;

            return [...filteredTasks]
                .sort((left, right) =>
                    String(getTaskCreatedAt(right) || "").localeCompare(String(getTaskCreatedAt(left) || "")),
                );
        },
        [normalizedLibrarySearch, recentTasks],
    );
    const recentTaskPagination = useClientPagination(filteredRecentTasks, {
        initialPageSize: 8,
        resetKey: normalizedLibrarySearch,
    });
    const visibleRecentTasks = recentTaskPagination.pageItems;

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
            setSelectedResultTaskId(taskId);
            setResultError(null);
            const response = await fetch(`/api/admin/task/${taskId}/result`);
            if (!response.ok) {
                throw new Error(formatApiErrorMessage(`HTTP error! status: ${response.status}`, { status: response.status }));
            }

            const data: TaskResultResponse = await response.json();
            const taskResults = extractTaskResults(data);

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
        setSelectedResultTaskId(taskId);
        setActiveTab("result");

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
        setSelectedResultTaskId(null);
        setResultError(null);

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
                throw new Error(formatApiErrorMessage(errorData.message || `HTTP error! status: ${response.status}`, { status: response.status }));
            }

            const data: ExecResponse = await response.json();

            if (data.success && data.task_id) {
                setTaskId(data.task_id);
                setSelectedResultTaskId(data.task_id);
                toast.success(t("exec.taskStarted"));
                startPolling(data.task_id);
                void loadRecentTasks(true);
            } else if (data.status === "success" && data.data?.task_id) {
                setTaskId(data.data.task_id);
                setSelectedResultTaskId(data.data.task_id);
                toast.success(t("exec.taskStarted"));
                startPolling(data.data.task_id);
                void loadRecentTasks(true);
            } else {
                throw new Error(formatApiErrorMessage(data.message || "Failed to fetch tasks"));
            }
        } catch (err) {
            const errorMessage = getReadableErrorMessage(err, t("common.unknown_error"));
            toast.error(errorMessage);
        } finally {
            setExecuting(false);
        }
    };

    const copyOutput = (output: string) => {
        navigator.clipboard.writeText(output);
        toast.success(t("copy_success", "Copied!"));
    };

    const loadTaskResults = async (
        targetTaskId: string,
        options: LoadTaskResultsOptions = {},
    ) => {
        const trimmedTaskId = targetTaskId.trim();
        if (!trimmedTaskId) return;

        if (options.stopPolling !== false) {
            clearPolling();
        }

        setSelectedResultTaskId(trimmedTaskId);
        setTaskId(trimmedTaskId);
        setResultLoading(true);
        setResultError(null);
        if (options.switchTab) {
            setActiveTab("result");
        }

        try {
            const response = await fetch(`/api/admin/task/${encodeURIComponent(trimmedTaskId)}/result`, {
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    Accept: "application/json",
                    "Cache-Control": "no-cache, no-store, max-age=0",
                    Pragma: "no-cache",
                    "X-Requested-With": "XMLHttpRequest",
                },
            });
            const payload = await response.json().catch(() => ({}));
            if (response.status === 404) {
                setResults([]);
                return;
            }
            if (!response.ok) {
                const message = typeof payload?.message === "string"
                    ? payload.message
                    : "Failed to fetch task results";
                throw new Error(formatApiErrorMessage(message, { status: response.status }));
            }

            const taskResults = extractTaskResults(payload);
            if (!taskResults) {
                throw new Error(formatApiErrorMessage("Unexpected task result response"));
            }
            setResults(taskResults);
        } catch (err) {
            const message = getReadableErrorMessage(err, "获取任务结果失败，请稍后重试。");
            setResultError(message);
            setResults([]);
        } finally {
            setResultLoading(false);
        }
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

    const selectedNodeNames = selectedNodes.map((uuid) => getNodeDisplayName(uuid));
    const nodeConfigText = selectedNodes.length
        ? t("exec.selected_nodes_summary", {
            count: selectedNodes.length,
            names: selectedNodeNames.slice(0, 2).join(", "),
            extra: selectedNodes.length > 2 ? ` +${selectedNodes.length - 2}` : "",
            defaultValue: "{{count}} 台 · {{names}}{{extra}}",
        })
        : t("exec.select_nodes_placeholder", {
            defaultValue: "按分组选择 · 请选择节点",
        });
    const nodePreviewNames = selectedNodeNames.length > 0
        ? selectedNodeNames.slice(0, 2)
        : nodeDetail.slice(0, 2).map((node) => node.name || node.uuid);
    const terminalCommand = command.trim() || visibleCommands[0]?.text || "whoami";
    const terminalResultLines = results.length > 0
        ? results.slice(0, 3).map((result) => {
            const status = getTaskStatus(result);
            const firstLine =
                getCodeLines(getDisplayOutput(result.result || ""))
                    .find((line) => line.trim().length > 0)
                    ?.trim() || status.text;
            return {
                node: getNodeDisplayName(result.client),
                text: `exit ${result.exit_code ?? "..."} · ${firstLine}`,
                tone: status.status === "success" ? "ok" as const : status.status === "failed" ? "bad" as const : "info" as const,
            };
        })
        : [];
    const currentTaskId = selectedResultTaskId || taskId;
    const resultSearch = normalizedLibrarySearch;
    const filteredCurrentResults = resultSearch
        ? results.filter((item) =>
            [
                item.client,
                getNodeDisplayName(item.client),
                getNodeDisplayAddress(item.client),
                item.result,
            ].some((value) => String(value || "").toLowerCase().includes(resultSearch)),
        )
        : results;
    const resultPagination = useClientPagination(filteredCurrentResults, {
        initialPageSize: 8,
        resetKey: `${currentTaskId || ""}:${resultSearch}`,
    });
    const visibleCurrentResults = resultPagination.pageItems;
    const resultFinishedCount = results.filter((item) => item.finished_at !== null).length;
    const resultFailedCount = results.filter((item) => item.exit_code !== null && item.exit_code !== 0).length;
    const selectedTaskSummary = currentTaskId
        ? recentTasks.find((item) => item.task_id === currentTaskId) ?? null
        : null;
    const previewClientNames = selectedTaskSummary
        ? getTaskClients(selectedTaskSummary).slice(0, 2).map((uuid) => getNodeDisplayName(uuid))
        : nodePreviewNames;

    if (isLoading) {
        return (
            <div className="flex min-w-0 flex-col gap-[14px] p-3 sm:p-4 md:p-6">
                <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                        <div className="h-7 w-44 rounded-md bg-muted" />
                        <div className="mt-2 h-4 w-[min(560px,70vw)] rounded-md bg-muted" />
                    </div>
                    <div className="hidden h-9 w-28 rounded-md bg-muted sm:block" />
                </div>
                <div className="grid gap-[14px] xl:grid-cols-[minmax(0,1fr)_360px]">
                    <section className={execPanelClass}>
                        <AdminTableSkeleton columns={5} rows={5} className="p-4" />
                    </section>
                    <section className={execPanelClass}>
                        <AdminSettingsSkeleton sections={4} className="p-4" />
                    </section>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="m-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:m-4 md:m-6">
                {error}
            </div>
        );
    }

    return (
        <div className="flex min-w-0 flex-col gap-[14px] p-3 sm:p-4 md:p-6">
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                <Button asChild className="h-9 shrink-0 rounded-md px-4 text-sm">
                    <Link to="/admin/scripts">
                        <Plus size={15} />
                        {t("command_clipboard.new_command", { defaultValue: "新建脚本" })}
                    </Link>
                </Button>
            </div>

            <div className="grid gap-[14px] xl:grid-cols-[minmax(0,1fr)_360px]">
                <section className={execPanelClass}>
                    <div className="flex min-h-[54px] flex-col gap-3 border-b border-border px-[14px] py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex w-full rounded-md border border-border bg-muted/30 p-1 sm:w-auto">
                            <ExecToolbarTab active={activeTab === "library"} onClick={() => setActiveTab("library")}>
                                {t("command_clipboard.open_library", { defaultValue: "脚本库" })}
                            </ExecToolbarTab>
                            <ExecToolbarTab active={activeTab === "history"} onClick={() => setActiveTab("history")}>
                                {t("exec.history", { defaultValue: "执行记录" })}
                            </ExecToolbarTab>
                            <ExecToolbarTab active={activeTab === "result"} onClick={() => setActiveTab("result")}>
                                {t("exec.result", { defaultValue: "结果" })}
                            </ExecToolbarTab>
                        </div>
                        <div className="flex w-full gap-2 sm:w-auto">
                            <div className="relative min-w-0 flex-1 sm:w-[260px]">
                                <Search
                                    size={14}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                />
                                <input
                                    value={librarySearch}
                                    onChange={(event) => setLibrarySearch(event.target.value)}
                                    placeholder={
                                        activeTab === "history"
                                            ? t("exec.search_history", { defaultValue: "搜索 Task / 节点" })
                                            : activeTab === "result"
                                                ? t("exec.search_result", { defaultValue: "搜索节点 / 输出" })
                                                : t("exec.search_library", { defaultValue: "搜索脚本 / 备注" })
                                    }
                                    className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/35"
                                />
                            </div>
                            {activeTab === "history" && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                        void loadRecentTasks();
                                    }}
                                    disabled={tasksLoading}
                                    className="h-9 w-9 rounded-md"
                                >
                                    <RefreshCw size={14} className={tasksLoading ? "animate-spin" : undefined} />
                                </Button>
                            )}
                            {activeTab === "result" && currentTaskId && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                        void loadTaskResults(currentTaskId, {
                                            stopPolling: false,
                                        });
                                    }}
                                    disabled={resultLoading}
                                    className="h-9 w-9 rounded-md"
                                >
                                    <RefreshCw size={14} className={resultLoading ? "animate-spin" : undefined} />
                                </Button>
                            )}
                        </div>
                    </div>

                    {activeTab === "library" && (
                        <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[680px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30 text-[12px] font-semibold text-muted-foreground">
                                        <th className="px-[14px] py-3">{t("command_clipboard.table.script", { defaultValue: "脚本" })}</th>
                                        <th className="px-[14px] py-3">{t("command_clipboard.table.remark", { defaultValue: "备注" })}</th>
                                        <th className="px-[14px] py-3">{t("command_clipboard.table.updated_at", { defaultValue: "更新时间" })}</th>
                                        <th className="px-[14px] py-3">{t("command_clipboard.table.weight", { defaultValue: "权重" })}</th>
                                        <th className="px-[14px] py-3 text-right">{t("common.action", { defaultValue: "操作" })}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {commandsLoading ? (
                                        <tr>
                                            <td colSpan={5} className="px-[14px] py-5">
                                                <AdminTableSkeleton columns={5} rows={3} />
                                            </td>
                                        </tr>
                                    ) : commandsError ? (
                                        <tr>
                                            <td colSpan={5} className="px-[14px] py-5 text-sm text-destructive">
                                                {commandsError.message}
                                            </td>
                                        </tr>
                                    ) : visibleCommands.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-[14px] py-8">
                                                <AdminEmptyState
                                                    icon={<Terminal size={18} />}
                                                    title={t("exec.library_empty_title", { defaultValue: "暂无脚本" })}
                                                    description={t("exec.library_empty_description", { defaultValue: "Clipboard 为空。" })}
                                                    actions={
                                                        <Button asChild size="sm">
                                                            <Link to="/admin/scripts">
                                                                <Plus size={14} />
                                                                {t("command_clipboard.new_command", { defaultValue: "新建脚本" })}
                                                            </Link>
                                                        </Button>
                                                    }
                                                    className="min-h-28 border-0 bg-muted/25 shadow-none"
                                                />
                                            </td>
                                        </tr>
                                    ) : visibleCommands.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/25"
                                        >
                                            <td className="px-[14px] py-3 align-top">
                                                <button
                                                    type="button"
                                                    onClick={() => setCommand(item.text)}
                                                    className="block max-w-[260px] truncate text-left text-[13px] font-semibold leading-5 text-foreground hover:text-primary"
                                                >
                                                    {getCommandTitle(item)}
                                                </button>
                                                <span className="block max-w-[320px] truncate font-mono text-[11px] leading-4 text-muted-foreground">
                                                    {item.text}
                                                </span>
                                            </td>
                                            <td className="max-w-[220px] px-[14px] py-3 align-middle text-[12px] text-foreground">
                                                <span className="block truncate">{item.remark || "-"}</span>
                                            </td>
                                            <td className="px-[14px] py-3 align-middle text-[12px] text-foreground">
                                                {formatTimestamp(item.updated_at)}
                                            </td>
                                            <td className="px-[14px] py-3 align-middle">
                                                <Badge variant="secondary" className="h-6 rounded-full px-2 text-[11px]">
                                                    {item.weight}
                                                </Badge>
                                            </td>
                                            <td className="px-[14px] py-3 align-middle">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setCommand(item.text);
                                                            void executeCommand(item.text);
                                                        }}
                                                        disabled={executing || selectedNodes.length === 0}
                                                        className="h-8 rounded-md px-2 text-[12px]"
                                                    >
                                                        执行
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setCommand(item.text)}
                                                        className="h-8 rounded-md px-2 text-[12px]"
                                                    >
                                                        插入
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {!commandsLoading && !commandsError ? (
                            <AdminPagination
                                page={commandPagination.page}
                                totalPages={commandPagination.totalPages}
                                total={commandPagination.total}
                                pageSize={commandPagination.pageSize}
                                visibleStart={commandPagination.visibleStart}
                                visibleEnd={commandPagination.visibleEnd}
                                onPageChange={commandPagination.setPage}
                                onPageSizeChange={commandPagination.setPageSize}
                                pageSizeOptions={[8, 20, 50]}
                                itemLabel={t("admin.pagination.scripts", { defaultValue: "scripts" })}
                                compact
                            />
                        ) : null}
                        </>
                    )}

                    {activeTab === "history" && (
                        <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30 text-[12px] font-semibold text-muted-foreground">
                                        <th className="px-[14px] py-3">Task ID</th>
                                        <th className="px-[14px] py-3">{t("exec.table.nodes", { defaultValue: "节点" })}</th>
                                        <th className="px-[14px] py-3">{t("exec.table.created_at", { defaultValue: "创建时间" })}</th>
                                        <th className="px-[14px] py-3">{t("exec.table.receipts", { defaultValue: "回执" })}</th>
                                        <th className="px-[14px] py-3">{t("exec.table.status", { defaultValue: "状态" })}</th>
                                        <th className="px-[14px] py-3 text-right">{t("common.action", { defaultValue: "操作" })}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasksLoading ? (
                                        <tr>
                                            <td colSpan={6} className="px-[14px] py-5">
                                                <AdminTableSkeleton columns={6} rows={3} />
                                            </td>
                                        </tr>
                                    ) : tasksError ? (
                                        <tr>
                                            <td colSpan={6} className="px-[14px] py-5 text-sm text-destructive">
                                                {tasksError}
                                            </td>
                                        </tr>
                                    ) : visibleRecentTasks.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-[14px] py-8">
                                                <AdminEmptyState
                                                    icon={<Clock size={18} />}
                                                    title={t("exec.history_empty_title", { defaultValue: "暂无执行记录" })}
                                                    description={t("exec.history_empty_description", { defaultValue: "Task 列表为空。" })}
                                                    className="min-h-28 border-0 bg-muted/25 shadow-none"
                                                />
                                            </td>
                                        </tr>
                                    ) : visibleRecentTasks.map((item) => {
                                        const completion = getTaskCompletion(item);
                                        const tone = getTaskTone(item);
                                        const selected = currentTaskId === item.task_id;
                                        return (
                                            <tr
                                                key={item.task_id}
                                                onClick={() => {
                                                    void loadTaskResults(item.task_id, {
                                                        switchTab: true,
                                                    });
                                                }}
                                                className={cn(
                                                    "cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-muted/25",
                                                    selected && "bg-blue-50/70 dark:bg-blue-950/20",
                                                )}
                                            >
                                                <td className="px-[14px] py-3 align-middle">
                                                    <span className="block max-w-[220px] truncate font-mono text-[12px] text-foreground">
                                                        {item.task_id}
                                                    </span>
                                                    <span className="block max-w-[220px] truncate text-[11px] leading-4 text-muted-foreground">
                                                        {t("exec.command_not_stored", { defaultValue: "command 不由后端保存" })}
                                                    </span>
                                                </td>
                                                <td className="px-[14px] py-3 align-middle text-[12px] text-foreground">
                                                    {t("exec.node_count", {
                                                        count: getTaskClients(item).length,
                                                        defaultValue: "{{count}} 台",
                                                    })}
                                                </td>
                                                <td className="px-[14px] py-3 align-middle text-[12px] text-foreground">
                                                    {formatTimestamp(getTaskCreatedAt(item))}
                                                </td>
                                                <td className="px-[14px] py-3 align-middle text-[12px] text-foreground">
                                                    {completion.finished}/{completion.total}
                                                </td>
                                                <td className="px-[14px] py-3 align-middle">
                                                    <ExecStatus tone={tone}>
                                                        {tone === "bad"
                                                            ? t("exec.status.abnormal", { defaultValue: "异常" })
                                                            : tone === "ok"
                                                                ? t("exec.status.done", { defaultValue: "完成" })
                                                                : t("exec.status.running", { defaultValue: "运行中" })}
                                                    </ExecStatus>
                                                </td>
                                                <td className="px-[14px] py-3 align-middle">
                                                    <div className="flex justify-end">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                void loadTaskResults(item.task_id, {
                                                                    switchTab: true,
                                                                });
                                                            }}
                                                            className="h-8 rounded-md px-2 text-[12px]"
                                                        >
                                                            <Eye size={14} />
                                                            {t("exec.view_results", { defaultValue: "查看结果" })}
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {!tasksLoading && !tasksError ? (
                            <AdminPagination
                                page={recentTaskPagination.page}
                                totalPages={recentTaskPagination.totalPages}
                                total={recentTaskPagination.total}
                                pageSize={recentTaskPagination.pageSize}
                                visibleStart={recentTaskPagination.visibleStart}
                                visibleEnd={recentTaskPagination.visibleEnd}
                                onPageChange={recentTaskPagination.setPage}
                                onPageSizeChange={recentTaskPagination.setPageSize}
                                pageSizeOptions={[8, 20, 50]}
                                itemLabel={t("admin.pagination.tasks", { defaultValue: "tasks" })}
                                compact
                            />
                        ) : null}
                        </>
                    )}

                    {activeTab === "result" && (
                        <div className="flex flex-col">
                            {currentTaskId && (
                                <div className="grid gap-2 border-b border-border bg-muted/20 px-[14px] py-3 sm:grid-cols-3">
                                    <ExecSummaryItem label="Task" value={currentTaskId} mono />
                                    <ExecSummaryItem
                                        label={t("exec.summary.nodes", { defaultValue: "节点" })}
                                        value={t("exec.node_count", {
                                            count: selectedTaskSummary ? getTaskClients(selectedTaskSummary).length : results.length,
                                            defaultValue: "{{count}} 台",
                                        })}
                                    />
                                    <ExecSummaryItem
                                        label={t("exec.summary.results", { defaultValue: "结果" })}
                                        value={t("exec.result_progress_summary", {
                                            finished: resultFinishedCount,
                                            total: results.length || 0,
                                            failed: resultFailedCount,
                                            defaultValue: "{{finished}}/{{total}} 完成 · {{failed}} 异常",
                                        })}
                                    />
                                </div>
                            )}
                            {resultLoading ? (
                                <div className="p-[14px]">
                                    <AdminTableSkeleton columns={3} rows={3} />
                                </div>
                            ) : resultError ? (
                                <div className="px-[14px] py-5 text-sm text-destructive">
                                    {resultError}
                                </div>
                            ) : visibleCurrentResults.length === 0 ? (
                                <div className="p-[14px]">
                                    <AdminEmptyState
                                        icon={<Terminal size={18} />}
                                        title={t("exec.current_result_empty_title", { defaultValue: "暂无当前结果" })}
                                        description={currentTaskId
                                            ? t("exec.current_result_empty_pending", { defaultValue: "这个 Task 还没有返回结果。" })
                                            : t("exec.current_result_empty_description", { defaultValue: "从执行记录中选择一个 Task，或创建任务后查看结果。" })}
                                        className="min-h-28 border-0 bg-muted/25 shadow-none"
                                    />
                                </div>
                            ) : visibleCurrentResults.map((item) => {
                                const status = getTaskStatus(item);
                                const output = item.result ? getDisplayOutput(item.result) : status.text;
                                return (
                                    <button
                                        type="button"
                                        key={item.client}
                                        onClick={() => setActiveTab("result")}
                                        className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-[14px] py-2.5 text-left last:border-b-0 hover:bg-muted/25"
                                    >
                                        <div className="min-w-0">
                                            <strong className="block truncate text-[13px] font-semibold leading-5 text-foreground">
                                                {getNodeDisplayName(item.client)}
                                            </strong>
                                            <span className="block truncate font-mono text-[11px] leading-4 text-muted-foreground">
                                                {output}
                                            </span>
                                        </div>
                                        <Badge variant={status.variant} className="h-6 rounded-full px-2 text-[11px]">
                                            {status.text}
                                        </Badge>
                                    </button>
                                );
                            })}
                            {!resultLoading && !resultError ? (
                                <AdminPagination
                                    page={resultPagination.page}
                                    totalPages={resultPagination.totalPages}
                                    total={resultPagination.total}
                                    pageSize={resultPagination.pageSize}
                                    visibleStart={resultPagination.visibleStart}
                                    visibleEnd={resultPagination.visibleEnd}
                                    onPageChange={resultPagination.setPage}
                                    onPageSizeChange={resultPagination.setPageSize}
                                    pageSizeOptions={[8, 20, 50]}
                                    itemLabel={t("admin.pagination.results", { defaultValue: "results" })}
                                    compact
                                />
                            ) : null}
                        </div>
                    )}

                    <div className="border-t border-border p-[14px]">
                        <div className="overflow-hidden rounded-lg border border-slate-900 bg-slate-950 shadow-sm">
                            <div className="flex h-9 items-center justify-between border-b border-white/10 px-3">
                                <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-300">
                                    <Terminal size={13} />
                                    task preview
                                </div>
                                <span className="font-mono text-[11px] text-slate-500">
                                    {currentTaskId ? `task ${currentTaskId.slice(0, 8)}...` : "/api/admin/task/exec"}
                                </span>
                            </div>
                            <div className="min-h-[166px] overflow-auto px-4 py-3 font-mono text-[12px] leading-6 text-slate-300">
                                <div><span className="text-emerald-300">$</span> task_id={currentTaskId ? `${currentTaskId.slice(0, 8)}...` : "pending"}</div>
                                <div><span className="text-emerald-300">$</span> clients={JSON.stringify(previewClientNames)}</div>
                                <div><span className="text-emerald-300">$</span> command="{terminalCommand}"</div>
                                <div className="h-4" />
                                {terminalResultLines.length === 0 ? (
                                    <div className="text-slate-500">waiting for task result...</div>
                                ) : terminalResultLines.map((line) => (
                                    <div key={`${line.node}-${line.text}`}>
                                        <span className={line.tone === "bad" ? "text-red-300" : "text-emerald-300"}>
                                            {line.node}
                                        </span>{" "}
                                        {line.text}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className={execPanelClass}>
                    <ExecPanelHead title={t("exec.configuration", { defaultValue: "执行配置" })} meta="/api/admin/task/exec" />
                    <div className="flex flex-col gap-4 p-[14px]">
                        <ExecField label={t("exec.target_nodes", { defaultValue: "目标节点" })}>
                            <div className="rounded-md border border-input bg-background p-2">
                                <NodeSelector
                                    value={selectedNodes}
                                    onChange={setSelectedNodes}
                                    displayMode="ip"
                                    hiddenDescription
                                    className="h-[238px]"
                                    scrollAreaClassName="flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
                                />
                            </div>
                            <div className="mt-2 flex min-h-9 items-center rounded-md border border-input bg-muted/35 px-3 text-[12px] leading-5 text-foreground">
                                <span className="truncate">{nodeConfigText}</span>
                            </div>
                            {selectedNodes.length > 0 && (
                                <p className="mt-1 truncate text-[11px] leading-4 text-muted-foreground">
                                    {getSelectedNodeAddresses()}
                                </p>
                            )}
                        </ExecField>

                        <ExecField label={t("exec.timeout_policy", { defaultValue: "超时策略" })}>
                            <div className="flex min-h-9 items-center rounded-md border border-input bg-muted/35 px-3 text-[12px] leading-5 text-foreground">
                                {t("exec.timeout_policy_description", { defaultValue: "后端创建 Task，前端轮询 60 秒" })}
                            </div>
                        </ExecField>

                        <ExecField label={t("exec.command_content", { defaultValue: "命令内容" })}>
                            <div className="overflow-hidden rounded-md border border-input bg-background">
                                <div className="flex h-8 items-center justify-between border-b border-border bg-muted/30 px-3">
                                    <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
                                        <Terminal size={13} />
                                        shell
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">
                                        {commandLineNumbers.length} lines
                                    </span>
                                </div>
                                <div
                                    className="flex bg-background"
                                    style={{ height: commandEditorHeight }}
                                >
                                    <div
                                        ref={commandLineNumberRef}
                                        aria-hidden="true"
                                        className="h-full shrink-0 overflow-hidden border-r border-border bg-muted/30 px-1.5 py-2.5 text-right font-mono text-[12px] leading-5 tabular-nums text-muted-foreground select-none"
                                        style={{ width: commandLineNumberColumnWidth }}
                                    >
                                        {commandLineNumbers.map((lineNumber) => (
                                            <div key={lineNumber} className="h-5">
                                                {lineNumber}
                                            </div>
                                        ))}
                                    </div>
                                    <Textarea
                                        value={command}
                                        onChange={(e) => setCommand(e.target.value)}
                                        onScroll={syncCommandLineNumberScroll}
                                        placeholder={t("exec.commandPlaceholder")}
                                        rows={6}
                                        wrap="off"
                                        spellCheck={false}
                                        className="h-full min-h-full flex-1 resize-none overflow-auto rounded-none border-0 bg-background px-3 py-2.5 font-mono text-[12px] leading-5 text-foreground shadow-none outline-none whitespace-pre placeholder:text-muted-foreground focus-visible:ring-0 [field-sizing:fixed] [scrollbar-gutter:stable]"
                                    />
                                </div>
                            </div>
                        </ExecField>

                        <Button
                            onClick={() => { void executeCommand(); }}
                            disabled={executing || !command.trim() || selectedNodes.length === 0}
                            className="h-10 w-full rounded-md text-sm"
                        >
                            {executing ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    {t("exec.executing")}
                                </>
                            ) : (
                                <>
                                    <Play size={16} />
                                    创建任务
                                </>
                            )}
                        </Button>

                        <div className="grid grid-cols-2 gap-2">
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
                                className="h-9 rounded-md text-[12px]"
                            >
                                <Save size={14} />
                                保存
                            </Button>
                            <Button variant="outline" size="sm" asChild className="h-9 rounded-md text-[12px]">
                                <Link to="/admin/scripts">
                                    <Save size={14} />
                                    脚本库
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </div>

            <section className={execPanelClass}>
                <ExecPanelHead
                    title={t("exec.results", { defaultValue: "执行结果" })}
                    meta={currentTaskId ? `Task ${currentTaskId}` : "TaskResult"}
                />

                {resultLoading ? (
                    <div className="p-[14px]">
                        <AdminTableSkeleton columns={4} rows={3} />
                    </div>
                ) : resultError ? (
                    <div className="px-[14px] py-5 text-sm text-destructive">
                        {resultError}
                    </div>
                ) : results.length === 0 ? (
                    <div className="p-[14px]">
                        <AdminEmptyState
                            icon={<Terminal size={18} />}
                            title={t("exec.results_empty_title", {
                                defaultValue: "暂无执行结果",
                            })}
                            description={t("exec.results_empty_description", {
                                defaultValue: "选择节点并执行命令后，每台节点的输出会在这里汇总。",
                            })}
                            className="min-h-32 border-0 bg-muted/25 shadow-none"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {results.map((result) => {
                            const status = getTaskStatus(result);
                            const output = result.result ? getDisplayOutput(result.result) : "";
                            const outputLines = getCodeLines(output);
                            const outputLineNumberColumnWidth = getLineNumberColumnWidth(outputLines.length);
                            const statusTone: ExecStatusTone =
                                status.status === "success"
                                    ? "ok"
                                    : status.status === "timeout"
                                        ? "warn"
                                        : status.status === "running"
                                            ? "info"
                                            : "bad";

                            return (
                                <div
                                    key={result.client}
                                    className="border-b border-border p-[14px] last:border-b-0"
                                >
                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="truncate text-[14px] font-semibold leading-5 text-foreground">
                                                    {getNodeDisplayAddress(result.client)}
                                                </p>
                                                {shouldShowNodeName(result.client) && (
                                                    <p className="truncate text-[12px] leading-5 text-muted-foreground">
                                                        {getNodeDisplayName(result.client)}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                                                <ExecStatus tone={statusTone}>
                                                    {status.status === "running" ? (
                                                        <>
                                                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
                                                </ExecStatus>
                                                {result.exit_code !== null && (
                                                    <Badge variant="secondary" className="h-6 rounded-full px-2 text-[11px]">
                                                        exit {result.exit_code}
                                                    </Badge>
                                                )}
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
                                        </div>

                                        {result.result && (
                                            <div className="overflow-hidden rounded-lg border border-slate-900 bg-slate-950">
                                                <div className="flex h-9 items-center justify-between border-b border-white/10 px-3">
                                                    <div className="flex min-w-0 items-center gap-2 text-[12px] font-semibold text-slate-300">
                                                        <Terminal size={13} />
                                                        <span className="truncate">
                                                            {t("exec.output_label", {
                                                                defaultValue: "Output",
                                                            })}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] text-slate-500">stdout</span>
                                                </div>
                                                <div className="max-h-[360px] overflow-auto overscroll-contain [scrollbar-gutter:stable]">
                                                    <div
                                                        className="grid min-w-max"
                                                        style={{ gridTemplateColumns: `${outputLineNumberColumnWidth} minmax(0, 1fr)` }}
                                                    >
                                                        <div
                                                            aria-hidden="true"
                                                            className="border-r border-white/10 bg-white/[0.03] py-2.5 text-right font-mono text-[12px] leading-5 tabular-nums text-slate-500 select-none"
                                                        >
                                                            {outputLines.map((_, index) => (
                                                                <div key={`${result.client}-${index}`} className="h-5 px-1.5">
                                                                    {index + 1}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <pre className="whitespace-pre px-3 py-2.5 font-mono text-[12px] leading-5 text-slate-200">{output}</pre>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {polling && (
                    <div className="flex flex-col gap-3 border-t border-border px-[14px] py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <span className="text-sm">
                                {t("exec.polling_status", {
                                    defaultValue: "Fetching the latest execution state...",
                                })}
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={clearPolling}
                            className="h-9 rounded-md text-sm"
                        >
                            {t("exec.stop_polling", {
                                defaultValue: "Stop polling",
                            })}
                        </Button>
                    </div>
                )}
            </section>
        </div>
    );
};

function ExecPanelHead({
    title,
    meta,
}: {
    title: ReactNode;
    meta: ReactNode;
}) {
    return (
        <div className="flex min-h-[52px] items-center justify-between gap-3 border-b border-border px-4">
            <strong className="text-sm font-semibold leading-5 text-foreground">
                {title}
            </strong>
            <span className="truncate text-[12px] leading-4 text-muted-foreground">
                {meta}
            </span>
        </div>
    );
}

function ExecToolbarTab({
    active = false,
    onClick,
    children,
}: {
    active?: boolean;
    onClick?: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "h-7 flex-1 rounded px-3 text-[12px] font-semibold leading-none text-muted-foreground transition-colors sm:flex-none",
                active
                    ? "bg-background text-foreground shadow-sm"
                    : "hover:bg-background/70 hover:text-foreground",
            )}
        >
            {children}
        </button>
    );
}

function ExecSummaryItem({
    label,
    value,
    mono = false,
}: {
    label: ReactNode;
    value: ReactNode;
    mono?: boolean;
}) {
    return (
        <div className="min-w-0 rounded-md border border-border bg-background px-3 py-2">
            <div className="text-[11px] font-semibold leading-4 text-muted-foreground">
                {label}
            </div>
            <div className={cn(
                "mt-1 truncate text-[12px] leading-5 text-foreground",
                mono && "font-mono",
            )}>
                {value}
            </div>
        </div>
    );
}

function ExecField({
    label,
    children,
}: {
    label: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="block min-w-0">
            <span className="mb-1.5 block text-[12px] font-semibold leading-4 text-muted-foreground">
                {label}
            </span>
            {children}
        </div>
    );
}

function ExecStatus({
    tone,
    children,
}: {
    tone: ExecStatusTone;
    children: ReactNode;
}) {
    const toneClass = {
        ok: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300",
        warn: "bg-amber-50 text-amber-700 dark:bg-amber-950/25 dark:text-amber-300",
        bad: "bg-red-50 text-red-700 dark:bg-red-950/25 dark:text-red-300",
        info: "bg-blue-50 text-blue-700 dark:bg-blue-950/25 dark:text-blue-300",
    }[tone];

    return (
        <span
            className={cn(
                "inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-[11px] font-bold leading-none",
                toneClass,
            )}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {children}
        </span>
    );
}

export default ExecPage;
