import React from "react";
import { ArrowDown, ArrowUp, ListChecks, Search, Settings2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import type { FailoverScriptOption } from "@/lib/failover";
import { cn } from "@/lib/utils";

type SelectedScriptEntry = {
  id: string;
  script: FailoverScriptOption | null;
};

type FailoverScriptPolicyDialogProps = {
  title: string;
  description: string;
  scripts: FailoverScriptOption[];
  selectedScriptIDs: string[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onToggleScript: (scriptID: string, checked: boolean) => void;
  onMoveScript: (scriptID: string, targetIndex: number) => void;
  onRemoveScript: (scriptID: string) => void;
  timeoutValue?: string;
  onTimeoutChange?: (value: string) => void;
  className?: string;
};

function formatScriptID(scriptID: string) {
  return `#${scriptID}`;
}

function getScriptDisplayName(scriptID: string, script: FailoverScriptOption | null) {
  return script?.name || formatScriptID(scriptID);
}

function filterScripts(scripts: FailoverScriptOption[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return scripts;
  }
  return scripts.filter((script) => {
    const haystack = `${script.name || ""} ${script.remark || ""} ${script.id}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

function buildSelectedEntries(
  selectedScriptIDs: string[],
  scriptLookup: Map<string, FailoverScriptOption>,
): SelectedScriptEntry[] {
  return selectedScriptIDs.map((id) => ({
    id,
    script: scriptLookup.get(id) || null,
  }));
}

export default function FailoverScriptPolicyDialog({
  title,
  description,
  scripts,
  selectedScriptIDs,
  searchQuery,
  onSearchQueryChange,
  onToggleScript,
  onMoveScript,
  onRemoveScript,
  timeoutValue,
  onTimeoutChange,
  className,
}: FailoverScriptPolicyDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const selectedIDSet = React.useMemo(() => new Set(selectedScriptIDs), [selectedScriptIDs]);
  const scriptLookup = React.useMemo(
    () => new Map(scripts.map((script) => [String(script.id), script])),
    [scripts],
  );
  const selectedEntries = React.useMemo(
    () => buildSelectedEntries(selectedScriptIDs, scriptLookup),
    [scriptLookup, selectedScriptIDs],
  );
  const filteredScripts = React.useMemo(
    () => filterScripts(scripts, searchQuery),
    [scripts, searchQuery],
  );

  const selectedNames = selectedEntries.map(({ id, script }) => getScriptDisplayName(id, script));
  const visibleNames = selectedNames.slice(0, 2);
  const hiddenCount = Math.max(0, selectedNames.length - visibleNames.length);
  const hasTimeout = timeoutValue !== undefined && onTimeoutChange !== undefined;
  const summary = selectedNames.length > 0
    ? `${visibleNames.join(" -> ")}${hiddenCount > 0 ? ` +${hiddenCount}` : ""}`
    : t("failover.editor.no_script", { defaultValue: "No script" });

  return (
    <div className={cn("rounded-lg border bg-background p-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Label>{title}</Label>
            <Badge variant={selectedNames.length > 0 ? "info" : "secondary"}>
              {selectedNames.length > 0
                ? t("failover.editor.scripts_selected", {
                  defaultValue: "{{count}} selected",
                  count: selectedNames.length,
                })
                : t("failover.editor.no_script", { defaultValue: "No script" })}
            </Badge>
            {hasTimeout ? (
              <Badge variant="outline">
                {t("failover.editor.script_timeout_summary", {
                  defaultValue: "{{seconds}}s timeout",
                  seconds: timeoutValue || "600",
                })}
              </Badge>
            ) : null}
          </div>
          <div className="line-clamp-1 break-words text-sm text-slate-700 dark:text-slate-200">
            {summary}
          </div>
          <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setOpen(true)} className="shrink-0">
          <Settings2 className="size-4" />
          {t("failover.editor.configure_scripts", { defaultValue: "Configure scripts" })}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.82fr)]">
            <section className="min-w-0 rounded-lg border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ListChecks className="size-4 text-blue-600" />
                  {t("failover.editor.scripts_execution_order_title", {
                    defaultValue: "Execution order",
                  })}
                </div>
                <Badge variant="secondary">
                  {t("failover.editor.scripts_selected", {
                    defaultValue: "{{count}} selected",
                    count: selectedEntries.length,
                  })}
                </Badge>
              </div>

              {hasTimeout ? (
                <div className="grid gap-2 border-b px-3 py-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
                  <Label className="text-sm">
                    {t("failover.editor.script_timeout", { defaultValue: "Script timeout (s)" })}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={timeoutValue}
                    onChange={(event) => onTimeoutChange(event.target.value)}
                  />
                </div>
              ) : null}

              <div className="max-h-[45vh] overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
                {selectedEntries.length > 0 ? (
                  selectedEntries.map(({ id, script }, index) => {
                    const canMoveUp = index > 0;
                    const canMoveDown = index < selectedEntries.length - 1;
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-3 border-b px-3 py-2.5 text-sm last:border-b-0"
                      >
                        <Badge variant="secondary" className="min-w-8 justify-center">
                          {index + 1}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-slate-900 dark:text-slate-50">
                            {getScriptDisplayName(id, script)}
                          </div>
                          {script?.remark ? (
                            <div className="truncate text-xs text-muted-foreground" title={script.remark}>
                              {script.remark}
                            </div>
                          ) : null}
                          {!script ? (
                            <div className="truncate text-xs text-amber-700 dark:text-amber-300">
                              {t("failover.editor.script_missing_hint", {
                                defaultValue: "This script is no longer in the library, but it will stay in the saved execution order until you remove it.",
                              })}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => onMoveScript(id, index - 1)}
                            disabled={!canMoveUp}
                            title={t("failover.editor.move_script_up", { defaultValue: "Move script up" })}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => onMoveScript(id, index + 1)}
                            disabled={!canMoveDown}
                            title={t("failover.editor.move_script_down", { defaultValue: "Move script down" })}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => onRemoveScript(id)}
                            title={t("failover.editor.remove_script", { defaultValue: "Remove script" })}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {t("failover.editor.scripts_execution_order_empty_detail", {
                      defaultValue: "No scripts are selected yet. Pick scripts below, then reorder them here from top to bottom.",
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className="min-w-0 rounded-lg border">
              <div className="space-y-3 border-b px-3 py-3">
                <div className="text-sm font-medium">
                  {t("failover.editor.available_scripts", {
                    defaultValue: "Available scripts",
                  })}
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => onSearchQueryChange(event.target.value)}
                    className="pl-9"
                    placeholder={t("failover.editor.scripts_search_placeholder", {
                      defaultValue: "Search scripts by name or remark, e.g. sg1",
                    })}
                  />
                </div>
              </div>

              <div className="max-h-[45vh] overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
                {scripts.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {t("scripts.empty", { defaultValue: "No saved scripts yet." })}
                  </div>
                ) : filteredScripts.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {t("failover.editor.scripts_search_empty", {
                      defaultValue: "No matching scripts",
                    })}
                  </div>
                ) : (
                  filteredScripts.map((script) => {
                    const scriptID = String(script.id);
                    const checked = selectedIDSet.has(scriptID);
                    return (
                      <label
                        key={script.id}
                        className="flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) => onToggleScript(scriptID, Boolean(nextChecked))}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-slate-900 dark:text-slate-50">
                            {script.name || formatScriptID(scriptID)}
                          </div>
                          {script.remark ? (
                            <div className="truncate text-xs text-muted-foreground" title={script.remark}>
                              {script.remark}
                            </div>
                          ) : null}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">
                {t("common.done", { defaultValue: "Done" })}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
