import * as React from "react";
import { z } from "zod";
import type { Row } from "@tanstack/react-table";
import { t } from "i18next";
import { toast } from "sonner";
import {
  Copy,
  DollarSign,
  Download,
  Terminal,
  Trash2,
} from "lucide-react";

import { schema } from "@/components/admin/NodeTable/schema/node";
import { DataTableRefreshContext } from "@/components/admin/NodeTable/schema/DataTableRefreshContext";
import { EditDialog } from "./NodeEditDialog";
import { NodeDDNSDialog } from "./NodeDDNSDialog";
import { useSettings } from "@/lib/api";
import { buildAgentInstallScriptURL } from "@/lib/installScriptSource";
import { useAccount } from "@/contexts/AccountContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import {
  DangerConfirmDialog,
  EditDialogShell,
} from "@/components/ui/modal-shell";
import {
  FormActions,
  FormField,
  FormHelpText,
  FormSection,
  FormShell,
} from "@/components/ui/form-shell";

type ActionResponsePayload = {
  status?: string;
  message?: string;
  error?: string;
};

const readActionResponse = async (response: Response) => {
  const raw = (await response.text().catch(() => "")).trim();
  if (!raw) {
    return { payload: null as ActionResponsePayload | null, raw: "" };
  }

  try {
    return {
      payload: JSON.parse(raw) as ActionResponsePayload,
      raw,
    };
  } catch {
    return { payload: null as ActionResponsePayload | null, raw };
  }
};

const getActionErrorMessage = (
  response: Response,
  payload: ActionResponsePayload | null,
  raw: string,
  fallback: string,
) => {
  const detail =
    (typeof payload?.message === "string" ? payload.message : "") ||
    (typeof payload?.error === "string" ? payload.error : "") ||
    raw;

  return detail || `${fallback} (HTTP ${response.status})`;
};

async function removeClient(uuid: string) {
  const response = await fetch(`/api/admin/client/${uuid}/remove`, {
    method: "POST",
  });
  const { payload, raw } = await readActionResponse(response);
  if (!response.ok || payload?.status === "error") {
    throw new Error(
      getActionErrorMessage(
        response,
        payload,
        raw,
        t("admin.nodeTable.deleteFailed", "Failed to delete node"),
      ),
    );
  }
}

type InstallOptions = {
  disableWebSsh: boolean;
  disableAutoUpdate: boolean;
  ignoreUnsafeCert: boolean;
  ghproxy: string;
  dir: string;
  serviceName: string;
};

type Platform = "linux" | "windows" | "macos";

const NODE_INPUT_CLASS =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-[14px] shadow-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
const NODE_TEXTAREA_CLASS =
  "min-h-[120px] rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3 font-mono text-[13px] leading-6 shadow-none dark:border-slate-800 dark:bg-slate-900/50";

export function ActionsCell({ row }: { row: Row<z.infer<typeof schema>> }) {
  const refreshTable = React.useContext(DataTableRefreshContext);
  const { settings } = useSettings();
  const { hasFeature } = useAccount();

  const [installDialogOpen, setInstallDialogOpen] = React.useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [selectedPlatform, setSelectedPlatform] = React.useState<Platform>("linux");
  const [installOptions, setInstallOptions] = React.useState<InstallOptions>({
    disableWebSsh: false,
    disableAutoUpdate: false,
    ignoreUnsafeCert: false,
    ghproxy: "",
    dir: "",
    serviceName: "",
  });

  const generateCommand = () => {
    const host = window.location.origin;
    const token = row.original.token;
    const args = ["-e", host, "-t", token];

    if (installOptions.disableWebSsh) args.push("--disable-web-ssh");
    if (installOptions.disableAutoUpdate) args.push("--disable-auto-update");
    if (installOptions.ignoreUnsafeCert) args.push("--ignore-unsafe-cert");

    if (installOptions.ghproxy) {
      const ghproxy = installOptions.ghproxy.startsWith("http")
        ? installOptions.ghproxy
        : `http://${installOptions.ghproxy}`;
      args.push("--install-ghproxy", ghproxy);
    }
    if (installOptions.dir) args.push("--install-dir", installOptions.dir);
    if (installOptions.serviceName) {
      args.push("--install-service-name", installOptions.serviceName);
    }

    const installShUrl = buildAgentInstallScriptURL(settings.base_scripts_url, "install.sh");
    const installPsUrl = buildAgentInstallScriptURL(settings.base_scripts_url, "install.ps1");

    if (selectedPlatform === "linux") {
      return `wget -qO- ${installShUrl} | sudo bash -s -- ${args.join(" ")}`;
    }
    if (selectedPlatform === "macos") {
      return `zsh <(curl -sL ${installShUrl}) ${args.join(" ")}`;
    }

    let finalCommand =
      "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command " +
      `"iwr '${installPsUrl}' -UseBasicParsing -OutFile 'install.ps1'; & '.\\install.ps1'`;
    args.forEach((arg) => {
      finalCommand += ` '${arg}'`;
    });
    finalCommand += '"';
    return finalCommand;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copy_success", "Copied!"));
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  const handleDelete = async () => {
    setRemoving(true);
    try {
      await removeClient(row.original.uuid);
      toast.success(t("admin.nodeTable.deleteSuccess", "Node deleted"));
      if (refreshTable) refreshTable();
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex justify-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("admin.nodeTable.installCommand", "Install command")}
        onClick={() => setInstallDialogOpen(true)}
      >
        <Download className="size-4" />
      </Button>

      <a href={`/terminal?uuid=${row.original.uuid}`} target="_blank" rel="noreferrer">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("terminal.title", { defaultValue: "Terminal" })}
        >
          <Terminal className="size-4" />
        </Button>
      </a>

      {hasFeature("cloud_dns") ? <NodeDDNSDialog item={row.original} /> : null}
      <EditDialog item={row.original} />

      <Button
        variant="ghost"
        size="icon"
        aria-label={t("admin.nodeTable.editNodePrice", "Edit node price")}
        onClick={() => setPriceDialogOpen(true)}
      >
        <DollarSign className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label={t("admin.nodeTable.confirmDelete", "Delete node")}
        className="text-destructive hover:text-destructive"
        onClick={() => setDeleteDialogOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>

      <EditDialogShell
        open={installDialogOpen}
        onOpenChange={setInstallDialogOpen}
        size="xl"
        title={t("admin.nodeTable.installCommand", "Install command")}
        description={t(
          "admin.nodeTable.installDialogDescription",
          "Generate a ready-to-run install command and copy it to the target host.",
        )}
        footer={(
          <FormActions className="sm:justify-center">
            <Button
              className="w-full sm:w-auto"
              onClick={() => void copyToClipboard(generateCommand())}
            >
              <Copy size={16} />
              {t("copy", "Copy")}
            </Button>
          </FormActions>
        )}
      >
        <FormShell>
          <FormSection
            title={t("admin.nodeTable.platform", "Platform")}
            description={t(
              "admin.nodeTable.platform_hint",
              "Choose the runtime platform before generating the command.",
            )}
          >
            <div className="panel-muted p-1">
              <SegmentedControl.Root
                value={selectedPlatform}
                onValueChange={(value) => setSelectedPlatform(value as Platform)}
              >
                <SegmentedControl.Item value="linux">Linux</SegmentedControl.Item>
                <SegmentedControl.Item value="windows">Windows</SegmentedControl.Item>
                <SegmentedControl.Item value="macos">macOS</SegmentedControl.Item>
              </SegmentedControl.Root>
            </div>
          </FormSection>

          <FormSection
            title={t("admin.nodeTable.installOptions", "Install options")}
            description={t(
              "admin.nodeTable.installOptions_hint",
              "Optional flags remain grouped here for easier review.",
            )}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-3 text-sm dark:border-slate-800/80 dark:bg-slate-900/40">
                <Checkbox
                  checked={installOptions.disableWebSsh}
                  onCheckedChange={(checked) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      disableWebSsh: Boolean(checked),
                    }))
                  }
                />
                <span>{t("admin.nodeTable.disableWebSsh", "Disable remote control")}</span>
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-3 text-sm dark:border-slate-800/80 dark:bg-slate-900/40">
                <Checkbox
                  checked={installOptions.disableAutoUpdate}
                  onCheckedChange={(checked) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      disableAutoUpdate: Boolean(checked),
                    }))
                  }
                />
                <span>{t("admin.nodeTable.disableAutoUpdate", "Disable auto update")}</span>
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-3 text-sm dark:border-slate-800/80 dark:bg-slate-900/40">
                <Checkbox
                  checked={installOptions.ignoreUnsafeCert}
                  onCheckedChange={(checked) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      ignoreUnsafeCert: Boolean(checked),
                    }))
                  }
                />
                <span>{t("admin.nodeTable.ignoreUnsafeCert", "Ignore unsafe cert")}</span>
              </label>
            </div>

            <FormSection advanced toggleLabel={t("admin.nodeTable.advanced", "Advanced options")}>
              <FormField label={t("admin.nodeTable.ghproxy", "GitHub proxy")}>
                <Input
                  className={NODE_INPUT_CLASS}
                  placeholder={t(
                    "admin.nodeTable.ghproxy_placeholder",
                    "GitHub proxy, leave blank to disable proxy",
                  )}
                  value={installOptions.ghproxy}
                  onChange={(event) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      ghproxy: event.target.value,
                    }))
                  }
                />
              </FormField>

              <FormField label={t("admin.nodeTable.install_dir", "Installation directory")}>
                <Input
                  className={NODE_INPUT_CLASS}
                  placeholder={t(
                    "admin.nodeTable.install_dir_placeholder",
                    "Leave blank to use default (/opt/komari-agent)",
                  )}
                  value={installOptions.dir}
                  onChange={(event) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      dir: event.target.value,
                    }))
                  }
                />
              </FormField>

              <FormField label={t("admin.nodeTable.serviceName", "Service name")}>
                <Input
                  className={NODE_INPUT_CLASS}
                  placeholder={t(
                    "admin.nodeTable.serviceName_placeholder",
                    "Leave blank to use default (komari-agent)",
                  )}
                  value={installOptions.serviceName}
                  onChange={(event) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      serviceName: event.target.value,
                    }))
                  }
                />
              </FormField>
            </FormSection>
          </FormSection>

          <FormSection title={t("admin.nodeTable.generatedCommand", "Command")}>
            <Textarea disabled className={NODE_TEXTAREA_CLASS} value={generateCommand()} />
            <FormHelpText>
              {t(
                "admin.nodeTable.generatedCommandHint",
                "Run this command on the target node shell.",
              )}
            </FormHelpText>
          </FormSection>
        </FormShell>
      </EditDialogShell>

      <EditDialogShell
        open={priceDialogOpen}
        onOpenChange={setPriceDialogOpen}
        size="sm"
        title={t("admin.nodeTable.editNodePrice")}
        description={t(
          "admin.nodeTable.editNodePriceDescription",
          "This pricing form is still a placeholder and will be migrated in a later iteration.",
        )}
      >
        <FormShell>
          <FormField label="Placeholder">
            <Input className={NODE_INPUT_CLASS} value="123" readOnly />
          </FormField>
        </FormShell>
      </EditDialogShell>

      <DangerConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("admin.nodeTable.confirmDelete")}
        description={t("admin.nodeTable.cannotUndo")}
        confirmLabel={
          removing
            ? t("admin.nodeTable.deleting", "Deleting...")
            : t("admin.nodeTable.confirm", "Confirm")
        }
        cancelLabel={t("admin.nodeTable.cancel", "Cancel")}
        confirmDisabled={removing}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
