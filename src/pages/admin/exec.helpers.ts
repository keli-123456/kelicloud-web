export interface TaskResult {
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

export interface ExecResponse {
    success?: boolean;
    task_id?: string;
    clients?: string[];
    message?: string;
    status?: string;
    data?: {
        task_id: string;
    };
}

export interface TaskResultResponse {
    success?: boolean;
    results?: TaskResult[];
    message?: string;
    status?: string;
    data?: TaskResult[];
}

export interface TaskSummary {
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

export interface TaskListResponse {
    success?: boolean;
    status?: string;
    data?: TaskSummary[];
    message?: string;
}

export type ScriptFormValues = {
    name: string;
    text: string;
    remark: string;
    weight: string;
};

export const EMPTY_SCRIPT_FORM_VALUES: ScriptFormValues = {
    name: "",
    text: "",
    remark: "",
    weight: "0",
};

export const EXEC_TIMEOUT_SENTINEL = "__KOMARI_EXEC_TIMEOUT__";

export type ExecStatusTone = "ok" | "warn" | "bad" | "info";

export type ExecLibraryTab = "library" | "history" | "result";

export type LoadTaskResultsOptions = {
    switchTab?: boolean;
    stopPolling?: boolean;
};

export type CommandTitleInput = {
    name: string;
    text: string;
};

export type ScriptFormCommandInput = Partial<{
    name: string;
    text: string;
    remark: string;
    weight: number;
}>;

export const getCodeLines = (value: string) => {
    const lines = value.split(/\r?\n/);
    return lines.length > 0 ? lines : [""];
};

export const getLineNumbers = (value: string) =>
    Array.from({ length: Math.max(1, getCodeLines(value).length) }, (_, index) => index + 1);

export const getLineNumberColumnWidth = (lineCount: number) =>
    `calc(${Math.min(4, Math.max(2, String(Math.max(1, lineCount)).length))}ch + 6px)`;

export const getCommandEditorHeight = (lineCount: number) =>
    Math.min(260, Math.max(96, lineCount * 20 + 32));

export const formatTimestamp = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
};

export const getCommandTitle = (command: CommandTitleInput, fallbackLabel: string) => {
    const name = command.name.trim();
    if (name) return name;
    const firstLine = command.text.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    return firstLine || fallbackLabel;
};

export const getTaskClients = (task: Partial<TaskSummary> | null | undefined) =>
    Array.isArray(task?.clients)
        ? task.clients.filter((client): client is string => typeof client === "string" && client.length > 0)
        : [];

export const getTaskResults = (task: Partial<TaskSummary> | null | undefined): TaskSummary["results"] =>
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

export const normalizeTaskSummary = (item: Partial<TaskSummary> | null | undefined): TaskSummary | null => {
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

export const extractTaskSummaries = (payload: TaskListResponse | TaskSummary[]): TaskSummary[] => {
    const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data)
            ? payload.data
            : [];

    return items
        .map((item) => normalizeTaskSummary(item))
        .filter((item): item is TaskSummary => item !== null);
};

export const getTaskCreatedAt = (task: TaskSummary | null | undefined) =>
    getTaskResults(task).map((result) => result.created_at).filter(Boolean).sort()[0] || null;

export const toScriptFormValues = (
    command?: ScriptFormCommandInput,
): ScriptFormValues => ({
    name: command?.name ?? "",
    text: command?.text ?? "",
    remark: command?.remark ?? "",
    weight: typeof command?.weight === "number" ? String(command.weight) : "0",
});

export const resolveScriptName = (values: ScriptFormValues, fallback: string) => {
    const explicitName = values.name.trim();
    if (explicitName) return explicitName;

    const firstLine = values.text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
    if (!firstLine) return fallback;
    return firstLine.length > 48 ? `${firstLine.slice(0, 48)}...` : firstLine;
};

export const getTaskCompletion = (task: TaskSummary) => {
    const taskResults = getTaskResults(task);
    const taskClients = getTaskClients(task);
    const total = taskResults.length || taskClients.length;
    const finished = taskResults.filter((result) => result.finished_at !== null).length;
    return { finished, total };
};

export const getTaskTone = (task: TaskSummary): ExecStatusTone => {
    const taskResults = getTaskResults(task);
    if (taskResults.some((result) => result.exit_code !== null && result.exit_code !== 0)) {
        return "bad";
    }
    if (taskResults.length > 0 && taskResults.every((result) => result.finished_at !== null)) {
        return "ok";
    }
    return "info";
};

export const extractTaskResults = (payload: unknown): TaskResult[] | null => {
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
