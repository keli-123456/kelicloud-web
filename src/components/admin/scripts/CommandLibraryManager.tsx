import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, PencilLine, Play, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import Loading from "@/components/loading";
import {
  AdminPageShell,
  AdminSurface,
} from "@/components/admin/AdminPageShell";
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
import { CodeEditor } from "@/components/ui/code-editor";
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

const formatTimestamp = (value?: string) => {
  if (!value) {
    return null;
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
  signal?: AbortSignal,
): Promise<PaginatedCommandResponse> {
  const response = await fetch(`/api/admin/clipboard?page=${page}&limit=${limit}&__ts=${Date.now()}`, {
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
    throw new Error(payload.message || "Failed to fetch commands");
  }

  const data = payload.data;
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number(data?.total || 0),
    page: Number(data?.page || page),
    limit: Number(data?.limit || limit),
  };
}

function buildPageNumbers(page: number, totalPages: number) {
  const siblingsCount = 1;
  const values: (number | string)[] = [];
  const leftSibling = Math.max(page - siblingsCount, 1);
  const rightSibling = Math.min(page + siblingsCount, totalPages);
  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < totalPages - 1;

  values.push(1);
  if (showLeftDots) {
    values.push("...");
  } else {
    for (let index = 2; index < leftSibling; index += 1) {
      values.push(index);
    }
  }

  for (let index = leftSibling; index <= rightSibling; index += 1) {
    if (index > 1 && index < totalPages) {
      values.push(index);
    }
  }

  if (showRightDots) {
    values.push("...");
  } else {
    for (let index = rightSibling + 1; index < totalPages; index += 1) {
      values.push(index);
    }
  }

  if (totalPages > 1) {
    values.push(totalPages);
  }

  return values;
}

export default function CommandLibraryManager() {
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
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<CommandClipboard | null>(null);
  const [formValues, setFormValues] = useState<CommandFormValues>(EMPTY_FORM_VALUES);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CommandClipboard | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const requestSequenceRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);
  const unknownErrorText = t("common.unknown_error", "Unknown error");

  useEffect(() => {
    if (!routeState?.draftCommand?.text) {
      return;
    }

    setEditingCommand(null);
    setFormValues(toFormValues(routeState.draftCommand));
    setEditorOpen(true);
    toast.success(
      t("command_clipboard.imported_draft", {
        defaultValue: "Draft imported from remote exec.",
      }),
    );

    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.search, navigate, routeState, t]);

  const totalPages = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const pageNumbers = useMemo(() => buildPageNumbers(page, totalPages), [page, totalPages]);
  const visibleStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const visibleEnd = total === 0 ? 0 : Math.min(page * limit, total);

  const loadCommands = useCallback(async (targetPage: number, targetLimit: number) => {
    const requestID = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestID;
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchCommandPage(targetPage, targetLimit, controller.signal);
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
        nextError instanceof Error
          ? nextError.message
          : unknownErrorText,
      );
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
      if (requestSequenceRef.current === requestID) {
        setLoading(false);
      }
    }
  }, [unknownErrorText]);

  useEffect(() => {
    void loadCommands(page, limit);
  }, [limit, loadCommands, page]);

  useEffect(() => () => {
    requestControllerRef.current?.abort();
  }, []);

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
        defaultValue: "Untitled command",
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
            defaultValue: "Saved command updated",
          }),
        );
        await loadCommands(page, limit);
      } else {
        await addCommand(
          resolvedName,
          formValues.text.trim(),
          formValues.remark.trim(),
          safeWeight,
        );
        toast.success(
          t("exec.savedCommandSaved", {
            defaultValue: "Command saved to library",
          }),
        );
        if (page === 1) {
          await loadCommands(1, limit);
        } else {
          setPage(1);
        }
      }

      setEditorOpen(false);
      setEditingCommand(null);
      setFormValues(EMPTY_FORM_VALUES);
    } catch (nextError) {
      toast.error(
        nextError instanceof Error
          ? nextError.message
          : t("exec.saveCommandFailed", {
              defaultValue: "Failed to save command",
            }),
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
          defaultValue: "Command deleted",
        }),
      );
      setDeleteTarget(null);
      await loadCommands(page, limit);
    } catch (nextError) {
      toast.error(
        nextError instanceof Error
          ? nextError.message
          : t("exec.deleteCommandFailed", {
              defaultValue: "Failed to delete command",
            }),
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
      toast.success(t("copy_success", { defaultValue: "Copied!" }));
    } catch {
      toast.error(t("common.unknown_error"));
    }
  };

  if (loading && commands.length === 0) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <>
      <AdminPageShell
        stats={[
          {
            label: t("command_clipboard.stats.total", {
              defaultValue: "Saved scripts",
            }),
            value: `${total}`,
            hint: t("exec.savedCommandsHint", {
              defaultValue:
                "Saved commands are stored in the database and can be inserted back or executed directly.",
            }),
            tone: "blue",
          },
          {
            label: t("command_clipboard.pagination.current_page", {
              defaultValue: "Current page",
            }),
            value: `${page} / ${totalPages}`,
            hint: t("command_clipboard.pagination.current_page_hint", {
              defaultValue: "Switch pages to browse older scripts.",
            }),
            tone: "emerald",
          },
          {
            label: t("command_clipboard.pagination.page_size", {
              defaultValue: "Page size",
            }),
            value: `${limit}`,
            hint: t("command_clipboard.pagination.page_size_hint", {
              defaultValue: "Changing page size reloads the script list immediately.",
            }),
            tone: "amber",
          },
        ]}
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button variant="outline" asChild>
              <Link to="/admin/exec">
                <Play size={15} />
                {t("command_clipboard.open_exec", {
                  defaultValue: "Remote exec",
                })}
              </Link>
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus size={15} />
              {t("command_clipboard.new_command", {
                defaultValue: "New script",
              })}
            </Button>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="text-slate-500 dark:text-slate-400">
                {t("command_clipboard.pagination.rows_per_page", {
                  defaultValue: "Rows per page",
                })}
              </span>
              <NumberPicker
                defaultValue={limit}
                onChange={(value) => {
                  setPage(1);
                  setLimit(value);
                }}
                min={5}
                max={100}
              />
            </div>
          </div>
        )}
      >
        <AdminSurface className="py-2">
          {commands.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center dark:border-slate-800 dark:bg-slate-950/40">
              <div className="space-y-2">
                <p className="text-base font-medium text-slate-900 dark:text-slate-100">
                  {t("exec.savedCommandsEmpty", {
                    defaultValue: "No saved commands yet.",
                  })}
                </p>
                <p className="mx-auto max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {t("command_clipboard.empty_description", {
                    defaultValue:
                      "Store reusable shell scripts here. Cloud and remote execution dialogs can reuse them.",
                  })}
                </p>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <Button onClick={openCreateDialog}>
                  <Plus size={15} />
                  {t("command_clipboard.new_command", {
                    defaultValue: "New script",
                  })}
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/admin/exec">
                    <Play size={15} />
                    {t("command_clipboard.open_exec", {
                      defaultValue: "Remote exec",
                    })}
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 px-1 text-sm text-slate-500 dark:text-slate-400">
                <span>
                  {t("command_clipboard.pagination.summary", {
                    defaultValue: "Showing {{start}}-{{end}} of {{total}} scripts",
                    start: visibleStart,
                    end: visibleEnd,
                    total,
                  })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void loadCommands(page, limit);
                  }}
                  disabled={loading}
                >
                  {t("common.refresh")}
                </Button>
              </div>

              <div className="grid gap-2">
                {commands.map((command) => {
                  const updatedAt = formatTimestamp(command.updated_at);
                  const metaText = command.remark?.trim()
                    || t("command_clipboard.updated_at", {
                      defaultValue: "Updated {{date}}",
                      date:
                        updatedAt ??
                        t("command_clipboard.stats.updated_empty", {
                          defaultValue: "No scripts yet.",
                        }),
                    });

                  return (
                    <article
                      key={command.id}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40"
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <h2 className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                              {command.name}
                            </h2>
                            <Badge variant="secondary" className="shrink-0">
                              {t("command_clipboard.weight_label", {
                                defaultValue: "Weight {{weight}}",
                                weight: command.weight,
                              })}
                            </Badge>
                          </div>
                          <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">
                            {metaText}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUseInExec(command)}
                          >
                            <Play size={14} />
                            {t("command_clipboard.use_in_exec", {
                              defaultValue: "Use in exec",
                            })}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              void handleCopy(command);
                            }}
                          >
                            <Copy size={14} />
                            {t("copy", { defaultValue: "Copy" })}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(command)}
                          >
                            <PencilLine size={14} />
                            {t("common.edit")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteTarget(command)}
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30 dark:hover:text-red-200"
                          >
                            <Trash2 size={14} />
                            {t("common.delete")}
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                >
                  {t("command_clipboard.pagination.previous", {
                    defaultValue: "Previous",
                  })}
                </Button>
                {pageNumbers.map((value, index) => (
                  typeof value === "number" ? (
                    <Button
                      key={`${value}-${index}`}
                      type="button"
                      variant={value === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(value)}
                    >
                      {value}
                    </Button>
                  ) : (
                    <span
                      key={`${value}-${index}`}
                      className="px-2 text-sm text-slate-400"
                    >
                      {value}
                    </span>
                  )
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages}
                >
                  {t("command_clipboard.pagination.next", {
                    defaultValue: "Next",
                  })}
                </Button>
              </div>
            </div>
          )}
        </AdminSurface>
      </AdminPageShell>

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
      <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden sm:max-w-4xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>
              {editingCommand
                ? t("command_clipboard.editor.edit_title", {
                    defaultValue: "Edit script",
                  })
                : t("command_clipboard.editor.add_title", {
                    defaultValue: "New script",
                  })}
            </DialogTitle>
            <DialogDescription>
              {t("command_clipboard.page_description", {
                defaultValue:
                  "Manage saved shell scripts for remote execution and cloud instance workflows.",
              })}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t("common.name")}
                </label>
                <Input
                  value={formValues.name}
                  onChange={(event) => handleEditorChange("name", event.target.value)}
                  placeholder={t("command_clipboard.editor.name_placeholder", {
                    defaultValue: "Deploy agent bootstrap",
                  })}
                />
              </div>

              <div className="min-h-0 space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t("common.content")}
                </label>
                <CodeEditor
                  value={formValues.text}
                  onChange={(value) => handleEditorChange("text", value)}
                  placeholder={t("command_clipboard.editor.content_placeholder", {
                    defaultValue: "#!/usr/bin/env bash",
                  })}
                  className="min-h-0"
                  minHeight="320px"
                  maxHeight="min(50vh, calc(100vh - 20rem))"
                  ariaLabel={t("common.content")}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("common.remark")}
                  </label>
                  <Input
                    value={formValues.remark}
                    onChange={(event) => handleEditorChange("remark", event.target.value)}
                    placeholder={t("command_clipboard.editor.remark_placeholder", {
                      defaultValue: "Optional notes for this script",
                    })}
                  />
                </div>

                <div className="space-y-2">
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

              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                {t("command_clipboard.editor.weight_hint", {
                  defaultValue: "Higher weights appear first.",
                })}
              </p>
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
                defaultValue: "Delete script?",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("command_clipboard.delete_description", {
                defaultValue:
                  "This removes the script from the shared library. Existing execution records will not be affected.",
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
