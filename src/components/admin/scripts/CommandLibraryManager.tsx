import { useEffect, useMemo, useState } from "react";
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

const EMPTY_FORM_VALUES: CommandFormValues = {
  name: "",
  text: "",
  remark: "",
  weight: "0",
};

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

export default function CommandLibraryManager() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state as ScriptsPageLocationState) ?? null;
  const { commands, loading, error, addCommand, updateCommand, deleteCommand } =
    useCommandClipboard();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<CommandClipboard | null>(null);
  const [formValues, setFormValues] = useState<CommandFormValues>(EMPTY_FORM_VALUES);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CommandClipboard | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

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

  const orderedCommands = useMemo(() => {
    return [...commands].sort((left, right) => {
      if (right.weight !== left.weight) {
        return right.weight - left.weight;
      }

      const rightTime = new Date(right.updated_at).getTime();
      const leftTime = new Date(left.updated_at).getTime();
      if (!Number.isNaN(rightTime) && !Number.isNaN(leftTime) && rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return right.id - left.id;
    });
  }, [commands]);

  const latestUpdatedAt = useMemo(() => {
    return commands.reduce<string | undefined>((latest, item) => {
      if (!latest) {
        return item.updated_at;
      }

      return new Date(item.updated_at).getTime() > new Date(latest).getTime()
        ? item.updated_at
        : latest;
    }, undefined);
  }, [commands]);

  const maxWeight = useMemo(() => {
    if (commands.length === 0) {
      return null;
    }
    return Math.max(...commands.map((item) => item.weight));
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
        {error.message}
      </div>
    );
  }

  return (
    <>
      <AdminPageShell
        actions={
          <>
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
          </>
        }
        stats={[
          {
            label: t("command_clipboard.stats.total", {
              defaultValue: "Saved scripts",
            }),
            value: commands.length,
            hint: t("exec.savedCommandsHint", {
              defaultValue:
                "Saved commands are stored in the database and can be inserted back or executed directly.",
            }),
            tone: "blue",
          },
          {
            label: t("command_clipboard.stats.weight", {
              defaultValue: "Top weight",
            }),
            value: maxWeight ?? t("common.none"),
            hint: t("command_clipboard.editor.weight_hint", {
              defaultValue: "Higher weights appear first.",
            }),
            tone: "amber",
          },
          {
            label: t("command_clipboard.stats.updated", {
              defaultValue: "Latest update",
            }),
            value:
              formatTimestamp(latestUpdatedAt) ??
              t("command_clipboard.stats.updated_empty", {
                defaultValue: "No scripts yet.",
              }),
            hint: t("command_clipboard.empty_description", {
              defaultValue:
                "Store reusable shell scripts here. Cloud and remote execution dialogs can reuse them.",
            }),
            tone: "slate",
          },
        ]}
      >
        <AdminSurface className="py-2">
          {orderedCommands.length === 0 ? (
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
            <div className="grid gap-2">
              {orderedCommands.map((command) => {
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
