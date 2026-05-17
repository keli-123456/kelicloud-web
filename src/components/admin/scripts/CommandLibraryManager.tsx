import {
  Suspense,
  lazy,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Copy,
  FileCode2,
  PencilLine,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  AdminEmptyState,
  AdminSettingsSkeleton,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import {
  AdminDataTable,
  AdminDataTableCell,
  AdminDataTableEmptyRow,
  AdminDataTableHead,
  AdminDataTableHeadRow,
  AdminDataTableRow,
  AdminDataTableScroll,
} from "@/components/admin/AdminDataTable";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";
import {
  ADMIN_FORM_DIALOG_WIDE_CLASS,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_SCROLL_CLASS,
} from "@/components/admin/AdminFormStyles";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import NumberPicker from "@/components/ui/number-picker";
import {
  type CommandClipboard,
  useCommandClipboard,
} from "@/contexts/CommandClipboardContext";
import { useAdminPageTitle } from "@/contexts/AdminPageTitleContext";
import { cn } from "@/lib/utils";

type CommandFormValues = {
  name: string;
  text: string;
  remark: string;
  weight: string;
};

type ScriptsPageLocationState = {
  draftCommand?: Partial<Pick<CommandClipboard, "name" | "text" | "remark" | "weight">>;
} | null;

type PaginatedCommandResponse = {
  items: CommandClipboard[];
  total: number;
  page: number;
  limit: number;
};

const EMPTY_FORM_VALUES: CommandFormValues = {
  name: "",
  text: "",
  remark: "",
  weight: "0",
};

const DEFAULT_PAGE_SIZE = 20;

const scriptsPanelClass =
  "overflow-hidden rounded-lg border border-border bg-card shadow-sm shadow-slate-900/5";

const CodeEditor = lazy(async () => {
  const module = await import("@/components/ui/code-editor");
  return { default: module.CodeEditor };
});

const toFormValues = (
  command?: Partial<Pick<CommandClipboard, "name" | "text" | "remark" | "weight">>,
): CommandFormValues => ({
  name: command?.name ?? "",
  text: command?.text ?? "",
  remark: command?.remark ?? "",
  weight: typeof command?.weight === "number" ? String(command.weight) : "0",
});

const resolveCommandName = (
  values: CommandFormValues,
  fallback: string,
) => {
  const explicitName = values.name.trim();
  if (explicitName) {
    return explicitName;
  }

  const firstLine = values.text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return fallback;
  }

  return firstLine.length > 48 ? `${firstLine.slice(0, 48)}...` : firstLine;
};

const getCommandTitle = (command: CommandClipboard, fallbackLabel: string) => {
  const name = command.name.trim();
  if (name) return name;
  const firstLine = command.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return firstLine || fallbackLabel;
};

const getCommandPreview = (command: CommandClipboard) =>
  command.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "-";

const formatTimestamp = (value?: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

async function fetchCommandPage(
  page: number,
  limit: number,
  search: string,
  fallbackErrorMessage: string,
  signal?: AbortSignal,
): Promise<PaginatedCommandResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    __ts: String(Date.now()),
  });
  if (search) {
    params.set("search", search);
  }

  const response = await fetch(`/api/admin/clipboard?${params.toString()}`, {
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Requested-With": "XMLHttpRequest",
    },
    signal,
  });
  const payload = await response.json().catch(() => ({})) as {
    message?: string;
    data?: {
      items?: CommandClipboard[];
      total?: number;
      page?: number;
      limit?: number;
    };
  };

  if (!response.ok) {
    throw new Error(formatApiErrorMessage(payload.message || fallbackErrorMessage, { status: response.status }));
  }

  const data = payload.data;
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number(data?.total || 0),
    page: Number(data?.page || page),
    limit: Number(data?.limit || limit),
  };
}

type CommandLibraryManagerProps = {
  setPageTitle?: boolean;
};

export default function CommandLibraryManager({
  setPageTitle = true,
}: CommandLibraryManagerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state as ScriptsPageLocationState) ?? null;
  const { addCommand, updateCommand, deleteCommand } =
    useCommandClipboard();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commands, setCommands] = useState<CommandClipboard[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<CommandClipboard | null>(null);
  const [formValues, setFormValues] = useState<CommandFormValues>(EMPTY_FORM_VALUES);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CommandClipboard | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [selectedCommandId, setSelectedCommandId] = useState<number | null>(null);
  const requestSequenceRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);
  const unknownErrorText = t("common.unknown_error", "未知错误");
  const deferredSearchTerm = useDeferredValue(searchTerm.trim());
  const pageTitle = t("exec.savedCommands", {
    defaultValue: "脚本库",
  });

  useAdminPageTitle(
    pageTitle,
    t("command_clipboard.page_description", {
      defaultValue: "集中管理远程执行和云实例场景复用的脚本命令。",
    }),
    setPageTitle,
  );

  useEffect(() => {
    if (!routeState?.draftCommand?.text) {
      return;
    }

    setEditingCommand(null);
    setFormValues(toFormValues(routeState.draftCommand));
    setEditorOpen(true);
    toast.success(
      t("command_clipboard.imported_draft", {
        defaultValue: "已从远程执行导入草稿。",
      }),
    );

    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    });
}, [location.pathname, location.search, navigate, routeState, t]);

  const totalPages = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const visibleStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const visibleEnd = total === 0 ? 0 : Math.min(page * limit, total);
  const hasActiveSearch = deferredSearchTerm.length > 0;
  const showEmptyLibraryState = !hasActiveSearch && total === 0;
  const selectedCommand = commands.find((command) => command.id === selectedCommandId) ?? commands[0] ?? null;

  const loadCommands = useCallback(async (targetPage: number, targetLimit: number, targetSearch: string) => {
    const requestID = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestID;
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchCommandPage(
        targetPage,
        targetLimit,
        targetSearch,
        t("command_clipboard.fetch_failed", {
          defaultValue: "读取脚本列表失败",
        }),
        controller.signal,
      );
      if (requestSequenceRef.current !== requestID) {
        return;
      }

      const nextTotalPages = Math.max(1, Math.ceil(data.total / Math.max(data.limit, 1)));
      if (targetPage > nextTotalPages) {
        setCommands([]);
        setTotal(data.total);
        setPage(nextTotalPages);
        return;
      }

      setCommands(data.items);
      setTotal(data.total);
      setPage(Math.min(Math.max(data.page, 1), nextTotalPages));
      setLimit(data.limit);
    } catch (nextError) {
      if (controller.signal.aborted) {
        return;
      }
      setError(
        getReadableErrorMessage(nextError, unknownErrorText),
      );
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
      if (requestSequenceRef.current === requestID) {
        setLoading(false);
      }
    }
  }, [t, unknownErrorText]);

  useEffect(() => {
    void loadCommands(page, limit, deferredSearchTerm);
  }, [deferredSearchTerm, limit, loadCommands, page]);

  useEffect(() => () => {
    requestControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    setSelectedCommandId((current) => {
      if (commands.some((command) => command.id === current)) {
        return current;
      }
      return commands[0]?.id ?? null;
    });
  }, [commands]);

  const openCreateDialog = () => {
    setEditingCommand(null);
    setFormValues(EMPTY_FORM_VALUES);
    setEditorOpen(true);
  };

  const openEditDialog = (command: CommandClipboard) => {
    setEditingCommand(command);
    setFormValues(toFormValues(command));
    setEditorOpen(true);
  };

  const handleEditorChange = (
    field: keyof CommandFormValues,
    value: string,
  ) => {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formValues.text.trim()) {
      toast.error(t("exec.errors.emptyCommand"));
      return;
    }

    const resolvedName = resolveCommandName(
      formValues,
      t("exec.savedCommandUntitled", {
        defaultValue: "未命名脚本",
      }),
    );
    const weight = Number.parseInt(formValues.weight, 10);
    const safeWeight = Number.isNaN(weight) ? 0 : weight;

    setSubmitting(true);
    try {
      if (editingCommand) {
        await updateCommand(
          editingCommand.id,
          resolvedName,
          formValues.text.trim(),
          formValues.remark.trim(),
          safeWeight,
        );
        toast.success(
          t("exec.savedCommandUpdated", {
            defaultValue: "脚本已更新",
          }),
        );
        await loadCommands(page, limit, deferredSearchTerm);
      } else {
        await addCommand(
          resolvedName,
          formValues.text.trim(),
          formValues.remark.trim(),
          safeWeight,
        );
        toast.success(
          t("exec.savedCommandSaved", {
            defaultValue: "脚本已保存到脚本库",
          }),
        );
        if (page === 1) {
          await loadCommands(1, limit, deferredSearchTerm);
        } else {
          setPage(1);
        }
      }

      setEditorOpen(false);
      setEditingCommand(null);
      setFormValues(EMPTY_FORM_VALUES);
    } catch (nextError) {
      toast.error(
        getReadableErrorMessage(nextError, t("exec.saveCommandFailed", {
              defaultValue: "保存脚本失败",
            })),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setRemovingId(deleteTarget.id);
    try {
      await deleteCommand(deleteTarget.id);
      toast.success(
        t("exec.savedCommandDeleted", {
          defaultValue: "脚本已删除",
        }),
      );
      setDeleteTarget(null);
      await loadCommands(page, limit, deferredSearchTerm);
    } catch (nextError) {
      toast.error(
        getReadableErrorMessage(nextError, t("exec.deleteCommandFailed", {
              defaultValue: "删除脚本失败",
            })),
      );
    } finally {
      setRemovingId(null);
    }
  };

  const handleUseInExec = (command: CommandClipboard) => {
    navigate("/admin/exec", {
      state: {
        presetCommand: {
          name: command.name,
          text: command.text,
        },
      },
    });
  };

  const handleCopy = async (command: CommandClipboard) => {
    try {
      await navigator.clipboard.writeText(command.text);
      toast.success(t("copy_success", { defaultValue: "已复制" }));
    } catch {
      toast.error(getReadableErrorMessage(null, t("common.unknown_error")));
    }
  };

  if (loading && commands.length === 0) {
    return (
      <div className="flex min-w-0 flex-col gap-[14px] p-3 sm:p-4 md:p-6">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="h-7 w-28 rounded-md bg-muted" />
            <div className="mt-2 h-4 w-[min(560px,70vw)] rounded-md bg-muted" />
          </div>
          <div className="hidden h-9 w-28 rounded-md bg-muted sm:block" />
        </div>
        <div className="grid gap-[14px] md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="min-h-[92px] rounded-lg border border-border bg-card p-[14px] shadow-sm shadow-slate-900/5">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="mt-3 h-7 w-14 rounded bg-muted" />
              <div className="mt-3 h-3 w-32 rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="grid gap-[14px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className={scriptsPanelClass}>
            <AdminTableSkeleton columns={5} rows={6} className="p-4" />
          </section>
          <section className={scriptsPanelClass}>
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
    <>
      <div className="flex min-w-0 flex-col gap-[14px] p-3 sm:p-4 md:p-6">
        <div className="grid gap-[14px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className={scriptsPanelClass}>
            <div className="flex min-h-[54px] flex-col gap-3 border-b border-border px-[14px] py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex w-full rounded-md border border-border bg-muted/30 p-1 sm:w-auto">
                <ScriptToolbarTab active>{t("command_clipboard.open_library", { defaultValue: "脚本库" })}</ScriptToolbarTab>
                <ScriptToolbarLink to="/admin/exec">{t("exec.history", { defaultValue: "执行记录" })}</ScriptToolbarLink>
                <ScriptToolbarLink to="/admin/exec">{t("exec.result", { defaultValue: "结果" })}</ScriptToolbarLink>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                <Button onClick={openCreateDialog} className="h-9 shrink-0 rounded-md px-3 text-[12px]">
                  <Plus size={14} />
                  {t("command_clipboard.new_command", { defaultValue: "新建脚本" })}
                </Button>
                <div className="relative min-w-0 flex-1 sm:min-w-[260px]">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setPage(1);
                    }}
                    placeholder={t("command_clipboard.search_placeholder", { defaultValue: "按脚本名、备注或内容搜索" })}
                    className="h-9 rounded-md pl-9 text-[12px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <NumberPicker
                    defaultValue={limit}
                    onChange={(value) => {
                      setPage(1);
                      setLimit(value);
                    }}
                    min={5}
                    max={100}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      void loadCommands(page, limit, deferredSearchTerm);
                    }}
                    disabled={loading}
                    className="h-9 w-9 rounded-md"
                  >
                    <RefreshCw size={14} className={loading ? "animate-spin" : undefined} />
                  </Button>
                </div>
              </div>
            </div>

            {showEmptyLibraryState ? (
              <div className="p-[14px]">
                <AdminEmptyState
                  icon={<FileCode2 size={18} />}
                  title={t("command_clipboard.empty_title", { defaultValue: "暂无脚本" })}
                  description={t("command_clipboard.empty_description", { defaultValue: "把可复用的 Shell 脚本收在这里，云实例和远程执行弹窗都可以继续复用。" })}
                  actions={
                    <Button onClick={openCreateDialog} size="sm">
                      <Plus size={14} />
                      {t("command_clipboard.new_command", { defaultValue: "新建脚本" })}
                    </Button>
                  }
                  className="min-h-[320px] border-0 bg-muted/25 shadow-none"
                />
              </div>
            ) : (
              <>
                <AdminDataTableScroll>
                  <AdminDataTable minWidth={760}>
                    <thead>
                      <AdminDataTableHeadRow>
                        <AdminDataTableHead>{t("command_clipboard.table.script", { defaultValue: "脚本" })}</AdminDataTableHead>
                        <AdminDataTableHead>{t("command_clipboard.table.remark", { defaultValue: "备注" })}</AdminDataTableHead>
                        <AdminDataTableHead>{t("command_clipboard.table.weight", { defaultValue: "权重" })}</AdminDataTableHead>
                        <AdminDataTableHead>{t("command_clipboard.table.updated_at_short", { defaultValue: "更新" })}</AdminDataTableHead>
                        <AdminDataTableHead sticky="right" align="right" className="w-[72px]">
                          {t("common.action", { defaultValue: "操作" })}
                        </AdminDataTableHead>
                      </AdminDataTableHeadRow>
                    </thead>
                    <tbody>
                      {commands.length === 0 ? (
                        <AdminDataTableEmptyRow colSpan={5}>
                          <AdminEmptyState
                            icon={<Search size={18} />}
                            title={t("command_clipboard.search_empty", { defaultValue: "没有匹配的脚本" })}
                            description={t("command_clipboard.search_empty_description", { defaultValue: "可以按名称、备注或脚本内容搜索。" })}
                            className="min-h-28 border-0 bg-muted/25 shadow-none"
                          />
                        </AdminDataTableEmptyRow>
                      ) : commands.map((command) => {
                        const selected = selectedCommand?.id === command.id;
                        return (
                          <AdminDataTableRow
                            key={command.id}
                            selected={selected}
                            interactive
                            onClick={() => setSelectedCommandId(command.id)}
                          >
                            <AdminDataTableCell className="align-top">
                              <strong className="block max-w-[280px] truncate text-[13px] font-semibold leading-5 text-foreground">
                                {getCommandTitle(
                                  command,
                                  t("command_clipboard.script_label", {
                                    defaultValue: "脚本 #{{id}}",
                                    id: command.id,
                                  }),
                                )}
                              </strong>
                              <span className="block max-w-[360px] truncate font-mono text-[11px] leading-4 text-muted-foreground">
                                {getCommandPreview(command)}
                              </span>
                            </AdminDataTableCell>
                            <AdminDataTableCell className="max-w-[220px]">
                              <span className="block truncate">{command.remark || "-"}</span>
                            </AdminDataTableCell>
                            <AdminDataTableCell>
                              <Badge variant="secondary" className="h-6 rounded-full px-2 text-[11px]">
                                {command.weight}
                              </Badge>
                            </AdminDataTableCell>
                            <AdminDataTableCell>
                              {formatTimestamp(command.updated_at)}
                            </AdminDataTableCell>
                            <AdminDataTableCell sticky="right" align="right">
                              <AdminRowActions
                                actions={[
                                  {
                                    label: t("common.execute", { defaultValue: "执行" }),
                                    icon: <Play size={14} />,
                                    onSelect: () => handleUseInExec(command),
                                  },
                                  {
                                    label: t("common.edit", { defaultValue: "编辑" }),
                                    icon: <PencilLine size={14} />,
                                    onSelect: () => openEditDialog(command),
                                  },
                                  {
                                    label: t("common.copy", { defaultValue: "复制" }),
                                    icon: <Copy size={14} />,
                                    onSelect: () => {
                                      void handleCopy(command);
                                    },
                                  },
                                  {
                                    label: t("common.delete", { defaultValue: "删除" }),
                                    icon: <Trash2 size={14} />,
                                    destructive: true,
                                    onSelect: () => setDeleteTarget(command),
                                  },
                                ]}
                              />
                            </AdminDataTableCell>
                          </AdminDataTableRow>
                        );
                      })}
                    </tbody>
                  </AdminDataTable>
                </AdminDataTableScroll>

                <AdminPagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  pageSize={limit}
                  visibleStart={visibleStart}
                  visibleEnd={visibleEnd}
                  onPageChange={setPage}
                  itemLabel={t("command_clipboard.pagination.items", { defaultValue: "脚本" })}
                />
              </>
            )}
          </section>

          <section className={scriptsPanelClass}>
            <ScriptPanelHead
              title={t("command_clipboard.detail_title", { defaultValue: "脚本详情" })}
              meta={
                selectedCommand
                  ? t("command_clipboard.script_label", {
                    defaultValue: "脚本 #{{id}}",
                    id: selectedCommand.id,
                  })
                  : t("command_clipboard.no_script_selected", { defaultValue: "未选择脚本" })
              }
            />
            {selectedCommand ? (
              <div className="flex flex-col gap-4 p-[14px]">
                <div className="space-y-1">
                  <h2 className="truncate text-[15px] font-semibold leading-6 text-foreground">
                    {getCommandTitle(
                      selectedCommand,
                      t("command_clipboard.script_label", {
                        defaultValue: "脚本 #{{id}}",
                        id: selectedCommand.id,
                      }),
                    )}
                  </h2>
                  <p className="text-[12px] leading-5 text-muted-foreground">
                    {selectedCommand.remark || t("command_clipboard.remark_empty", { defaultValue: "暂无备注" })}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <ScriptInfo label={t("command_clipboard.table.weight", { defaultValue: "权重" })} value={selectedCommand.weight} />
                  <ScriptInfo label={t("common.create", { defaultValue: "创建" })} value={formatTimestamp(selectedCommand.created_at)} />
                  <ScriptInfo label={t("command_clipboard.table.updated_at_short", { defaultValue: "更新" })} value={formatTimestamp(selectedCommand.updated_at)} className="col-span-2" />
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-900 bg-slate-950 shadow-sm">
                  <div className="flex h-9 items-center justify-between border-b border-white/10 px-3">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-300">
                      <FileCode2 size={13} />
                      {t("command_clipboard.script_content", { defaultValue: "脚本内容" })}
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">shell</span>
                  </div>
                  <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap px-4 py-3 font-mono text-[12px] leading-6 text-slate-200">
                    {selectedCommand.text}
                  </pre>
                </div>

                <div className="grid gap-2">
                  <Button onClick={() => handleUseInExec(selectedCommand)} className="h-9 rounded-md text-sm">
                    <Play size={15} />
                    {t("command_clipboard.use_in_exec", { defaultValue: "带入执行" })}
                  </Button>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void handleCopy(selectedCommand);
                      }}
                      className="h-9 rounded-md text-[12px]"
                    >
                      <Copy size={14} />
                      {t("common.copy", { defaultValue: "复制" })}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(selectedCommand)}
                      className="h-9 rounded-md text-[12px]"
                    >
                      <PencilLine size={14} />
                      {t("common.edit", { defaultValue: "编辑" })}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(selectedCommand)}
                      className="h-9 rounded-md border-red-200 text-[12px] text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      <Trash2 size={14} />
                      {t("common.delete", { defaultValue: "删除" })}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-[14px]">
                <AdminEmptyState
                  icon={<FileCode2 size={18} />}
                  title={t("command_clipboard.select_title", { defaultValue: "选择脚本" })}
description={t("command_clipboard.select_description", { defaultValue: "从左侧选择一条脚本记录查看内容和操作。" })}
                  className="min-h-[320px] border-0 bg-muted/25 shadow-none"
                />
              </div>
            )}
          </section>
        </div>
      </div>

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setEditingCommand(null);
            setFormValues(EMPTY_FORM_VALUES);
          }
        }}
      >
        <DialogContent
          className={cn(
            ADMIN_FORM_DIALOG_WIDE_CLASS,
            "h-[min(92vh,920px)] sm:max-w-[calc(100vw-2rem)] lg:max-w-6xl xl:max-w-7xl",
          )}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {editingCommand
              ? t("command_clipboard.editor.edit_title", {
                    defaultValue: "编辑脚本",
                  })
                : t("command_clipboard.editor.add_title", {
                    defaultValue: "新增脚本",
                  })}
            </DialogTitle>
            <DialogDescription>
              {t("command_clipboard.page_description", {
                defaultValue:
                  "集中管理用于远程执行和云实例场景的脚本。",
              })}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className={cn(ADMIN_FORM_SCROLL_CLASS, "flex flex-col gap-4")}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_10rem]">
                <div className={ADMIN_FORM_FIELD_CLASS}>
                  <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("common.name")}
                  </label>
                  <Input
                    value={formValues.name}
                    onChange={(event) => handleEditorChange("name", event.target.value)}
                    placeholder={t("command_clipboard.editor.name_placeholder", {
                      defaultValue: "部署代理服务",
                    })}
                  />
                </div>

                <div className={ADMIN_FORM_FIELD_CLASS}>
                  <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("common.weight")}
                  </label>
                  <Input
                    type="number"
                    value={formValues.weight}
                    onChange={(event) => handleEditorChange("weight", event.target.value)}
                  />
                </div>
              </div>

              <div className={ADMIN_FORM_FIELD_CLASS}>
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t("common.remark")}
                </label>
                  <Input
                    value={formValues.remark}
                    onChange={(event) => handleEditorChange("remark", event.target.value)}
                    placeholder={t("command_clipboard.editor.remark_placeholder", {
                      defaultValue: "脚本备注（可选）",
                    })}
                  />
                </div>

              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                {t("command_clipboard.editor.weight_hint", {
                  defaultValue: "权重越高，排序越靠前。",
                })}
              </p>

              <div className={cn(ADMIN_FORM_FIELD_CLASS, "min-h-0")}>
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t("common.content")}
                </label>
                <Suspense
                  fallback={
                    <div className="min-h-[320px] rounded-md border border-dashed border-border/60 bg-muted/20 p-4">
                      <div className="space-y-3">
                        <div className="h-3 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                        {Array.from({ length: 8 }).map((_, index) => (
                          <div
                            key={index}
                            className="h-3 animate-pulse rounded bg-slate-200 dark:bg-slate-800"
                            style={{ width: `${92 - ((index * 9) % 34)}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  }
                >
                  <CodeEditor
                    value={formValues.text}
                    onChange={(value) => handleEditorChange("text", value)}
                    placeholder={t("command_clipboard.editor.content_placeholder", {
                      defaultValue: "#!/usr/bin/env bash",
                    })}
                    className="min-h-0"
                    height="clamp(460px, 64vh, 720px)"
                    minHeight="clamp(420px, 58vh, 640px)"
                    maxHeight="min(76vh, 760px)"
                    ariaLabel={t("common.content")}
                  />
                </Suspense>
              </div>
            </div>

            <DialogFooter className="mt-4 shrink-0">
              <DialogClose asChild>
                <Button variant="outline">{t("common.cancel")}</Button>
              </DialogClose>
              <Button type="submit" disabled={submitting}>
                {editingCommand ? t("common.update") : t("common.add")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("command_clipboard.delete_title", {
                defaultValue: "确定要删除这个脚本吗？",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("command_clipboard.delete_description", {
                defaultValue:
                  "删除后该脚本将从脚本库移除，不会影响已有执行记录。",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingId !== null}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={removingId !== null}
              className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ScriptPanelHead({
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

function ScriptToolbarTab({
  active = false,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
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

function ScriptToolbarLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex h-7 flex-1 items-center justify-center rounded px-3 text-[12px] font-semibold leading-none text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground sm:flex-none"
    >
      {children}
    </Link>
  );
}

function ScriptInfo({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-border bg-muted/25 px-3 py-2", className)}>
      <div className="text-[11px] font-semibold leading-4 text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate text-[12px] leading-5 text-foreground">
        {value}
      </div>
    </div>
  );
}
