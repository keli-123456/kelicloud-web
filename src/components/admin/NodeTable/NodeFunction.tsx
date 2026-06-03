import * as React from "react";
import { z } from "zod";
import { schema } from "@/components/admin/NodeTable/schema/node";
import { DataTableRefreshContext } from "@/components/admin/NodeTable/schema/DataTableRefreshContext";
import { Terminal, Trash2, Copy, Download, DollarSign, Network } from "lucide-react";
import { t } from "i18next";
import type { Row } from "@tanstack/react-table";
import { EditDialog } from "./NodeEditDialog";
import { NodeDDNSDialog } from "./NodeDDNSDialog";
import { NodePortForwardDialog } from "./NodePortForwardDialog";
import {
  Button,
  Checkbox,
  Dialog,
  Flex,
  IconButton,
  SegmentedControl,
  TextArea,
  TextField,
} from "@/components/admin/admin-ui";
import { toast } from "sonner";
import { useSettings } from "@/lib/api";
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";
import { buildAgentInstallScriptURL } from "@/lib/installScriptSource";
import { useAccount } from "@/contexts/AccountContext";

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
  fallback: string
) => {
  const detail =
    (typeof payload?.message === "string" ? payload.message : "") ||
    (typeof payload?.error === "string" ? payload.error : "") ||
    raw;

  return formatApiErrorMessage(detail || `${fallback} (HTTP ${response.status})`, { status: response.status });
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

const NODE_DIALOG_CONTENT_CLASS =
  "admin-dialog max-h-[90vh] w-[min(96vw,840px)] overflow-y-auto overscroll-contain p-5 [scrollbar-gutter:stable]";
const NODE_DIALOG_COMPACT_CONTENT_CLASS =
  "admin-dialog max-h-[90vh] w-[min(96vw,560px)] overflow-y-auto overscroll-contain p-5 [scrollbar-gutter:stable]";
const NODE_DIALOG_SECTION_CLASS =
  "space-y-4 border-t border-border bg-transparent pt-4";
const NODE_DIALOG_FOOTER_CLASS =
  "admin-panel-footer sticky bottom-0 -mx-5 -mb-5 mt-5 flex flex-col-reverse gap-2 px-5 py-3 backdrop-blur sm:flex-row sm:justify-end";
const NODE_INPUT_CLASS =
  "h-10 rounded-md border border-input bg-[var(--surface)] px-3 text-[14px] shadow-none hover:bg-[var(--surface-hover)]";
const NODE_TEXTAREA_CLASS =
  "min-h-[120px] max-h-[320px] overflow-y-auto rounded-md border border-input bg-[var(--surface)] px-4 py-3 font-mono text-[13px] leading-6 whitespace-pre-wrap break-words shadow-none [overflow-wrap:anywhere]";

export function ActionsCell({ row }: { row: Row<z.infer<typeof schema>> }) {
  const refreshTable = React.useContext(DataTableRefreshContext);
  const { settings } = useSettings();
  const { hasFeature } = useAccount();
  const [removing, setRemoving] = React.useState(false);
  const [selectedPlatform, setSelectedPlatform] =
    React.useState<Platform>("linux");
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
    let args = ["-e", host, "-t", token];
    // 根据安装选项生成参数
    if (installOptions.disableWebSsh) {
      args.push("--disable-web-ssh");
    }
    if (installOptions.disableAutoUpdate) {
      args.push("--disable-auto-update");
    }
    if (installOptions.ignoreUnsafeCert) {
      args.push("--ignore-unsafe-cert");
    }
    if (installOptions.ghproxy) {
      if (!installOptions.ghproxy.startsWith("http")) {
        installOptions.ghproxy = `http://${installOptions.ghproxy}`;
      }
      args.push(`--install-ghproxy`);
      args.push(installOptions.ghproxy);
    }
    if (installOptions.dir) {
      args.push(`--install-dir`);
      args.push(installOptions.dir);
    }
    if (installOptions.serviceName) {
      args.push(`--install-service-name`);
      args.push(installOptions.serviceName);
    }

    let finalCommand = "";
    const installShUrl = buildAgentInstallScriptURL(
      settings.base_scripts_url,
      "install.sh"
    );
    const installPsUrl = buildAgentInstallScriptURL(
      settings.base_scripts_url,
      "install.ps1"
    );
    switch (selectedPlatform) {
      case "linux":
        finalCommand =
          `wget -qO- ${installShUrl} | sudo bash -s -- ` +
          args.join(" ");
        break;
      case "windows":
        finalCommand =
          `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ` +
          `"iwr '${installPsUrl}'` +
          ` -UseBasicParsing -OutFile 'install.ps1'; &` +
          ` '.\\install.ps1'`;
        args.forEach((arg) => {
          finalCommand += ` '${arg}'`;
        });
        finalCommand += `"`;
        break;
      case "macos":
        finalCommand =
            `zsh <(curl -sL ${installShUrl}) ` +
            args.join(" ");
        break;
    }
    return finalCommand;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copy_success", "Copied!"));
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      <Dialog.Root>
        <Dialog.Trigger>
          <IconButton variant="ghost">
            <Download className="p-1" />
          </IconButton>
        </Dialog.Trigger>
        <Dialog.Content className={NODE_DIALOG_CONTENT_CLASS}>
          <Dialog.Title>
            {t("admin.nodeTable.installCommand", "Install command")}
          </Dialog.Title>
          <Dialog.Description className="mt-2">
            Generate a ready-to-run agent install command without leaving the node
            table workflow.
          </Dialog.Description>
          <div className="mt-4 flex flex-col gap-4">
            <div className={NODE_DIALOG_SECTION_CLASS}>
              <div>
                <div className="section-kicker">
                  {t("admin.nodeTable.platform", "Platform")}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Switch the target environment first, then refine the command for
                  that runtime.
                </p>
              </div>
              <div className="panel-muted p-1">
                <SegmentedControl.Root
                  value={selectedPlatform}
                  onValueChange={(value) => setSelectedPlatform(value as Platform)}
                >
                  <SegmentedControl.Item value="linux">Linux</SegmentedControl.Item>
                  <SegmentedControl.Item value="windows">
                    Windows
                  </SegmentedControl.Item>
                  <SegmentedControl.Item value="macos">macOS</SegmentedControl.Item>
                </SegmentedControl.Root>
              </div>
            </div>

            <div className={NODE_DIALOG_SECTION_CLASS}>
              <div>
                <div className="section-kicker">
                  {t("admin.nodeTable.installOptions", "安装选项")}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  可选参数会集中在这里，生成命令时更容易确认用途。
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-3 text-sm dark:border-slate-800/80 dark:bg-slate-900/40">
                  <Checkbox
                    checked={installOptions.disableWebSsh}
                    onCheckedChange={(checked) => {
                      setInstallOptions((prev) => ({
                        ...prev,
                        disableWebSsh: Boolean(checked),
                      }));
                    }}
                  />
                  <span>
                    {t("admin.nodeTable.disableWebSsh", "Disable remote control")}
                  </span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-3 text-sm dark:border-slate-800/80 dark:bg-slate-900/40">
                  <Checkbox
                    checked={installOptions.disableAutoUpdate}
                    onCheckedChange={(checked) => {
                      setInstallOptions((prev) => ({
                        ...prev,
                        disableAutoUpdate: Boolean(checked),
                      }));
                    }}
                  />
                  <span>
                    {t("admin.nodeTable.disableAutoUpdate", "Disable auto update")}
                  </span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-3 text-sm dark:border-slate-800/80 dark:bg-slate-900/40">
                  <Checkbox
                    checked={installOptions.ignoreUnsafeCert}
                    onCheckedChange={(checked) => {
                      setInstallOptions((prev) => ({
                        ...prev,
                        ignoreUnsafeCert: Boolean(checked),
                      }));
                    }}
                  />
                  <span>
                    {t("admin.nodeTable.ignoreUnsafeCert", "Ignore unsafe cert")}
                  </span>
                </label>
              </div>
              <Flex direction="column" gap="3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("admin.nodeTable.ghproxy", "GitHub proxy")}
                  </label>
                  <TextField.Root
                    className={NODE_INPUT_CLASS}
                    placeholder={t(
                      "admin.nodeTable.ghproxy_placeholder",
                      "GitHub 代理，为空则不使用代理"
                    )}
                    onChange={(e) =>
                      setInstallOptions((prev) => ({
                        ...prev,
                        ghproxy: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("admin.nodeTable.install_dir", "Installation directory")}
                  </label>
                  <TextField.Root
                    className={NODE_INPUT_CLASS}
                    placeholder={t(
                      "admin.nodeTable.install_dir_placeholder",
                      "安装目录，为空则使用默认目录(/opt/kelicloud-agent)"
                    )}
                    onChange={(e) =>
                      setInstallOptions((prev) => ({
                        ...prev,
                        dir: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("admin.nodeTable.serviceName", "Service name")}
                  </label>
                  <TextField.Root
                    className={NODE_INPUT_CLASS}
                    placeholder={t(
                      "admin.nodeTable.serviceName_placeholder",
                      "服务名称，为空则使用默认名称(kelicloud-agent)"
                    )}
                    onChange={(e) =>
                      setInstallOptions((prev) => ({
                        ...prev,
                        serviceName: e.target.value,
                      }))
                    }
                  />
                </div>
              </Flex>
            </div>

            <div className={NODE_DIALOG_SECTION_CLASS}>
              <div>
                <div className="section-kicker">
                  {t("admin.nodeTable.generatedCommand", "Command")}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Copy the final command directly into the target host shell.
                </p>
              </div>
              <TextArea
                disabled
                resize="none"
                wrap="soft"
                className={`w-full ${NODE_TEXTAREA_CLASS}`}
                style={{ overflowWrap: "anywhere" }}
                value={generateCommand()}
              />
            </div>

            <Flex justify="center" className={NODE_DIALOG_FOOTER_CLASS}>
              <Button
                className="w-full sm:w-auto"
                onClick={() => copyToClipboard(generateCommand())}
              >
                <Copy size={16} />
                {t("copy")}
              </Button>
            </Flex>
          </div>
        </Dialog.Content>
      </Dialog.Root>
      <a href={`/terminal?uuid=${row.original.uuid}`} target="_blank">
        <IconButton variant="ghost">
          <Terminal className="p-1" />
        </IconButton>
      </a>
      {hasFeature("cloud_dns") ? <NodeDDNSDialog item={row.original} /> : null}
      <NodePortForwardDialog
        item={row.original}
        trigger={(
          <IconButton variant="ghost" title={t("admin.nodeTable.portForward.title", "端口中转")}>
            <Network className="p-1" />
          </IconButton>
        )}
      />
      {/** Edit Button */}
      <EditDialog item={row.original} />
      {/** Edit Money */}
      <Dialog.Root> 
        <Dialog.Trigger>
          <IconButton variant="ghost">
           <DollarSign className="p-1" />
          </IconButton>
        </Dialog.Trigger>
        <Dialog.Content className={NODE_DIALOG_COMPACT_CONTENT_CLASS}>
          <Dialog.Title>{t("admin.nodeTable.editNodePrice")}</Dialog.Title>
          <Dialog.Description className="mt-2">
            This entry is still pending a proper pricing form and currently remains
            a placeholder surface.
          </Dialog.Description>
          <div className="mt-4 border-t border-slate-200/80 pt-4 dark:border-slate-800">
            <label className="block text-sm font-medium text-muted-foreground">
              Placeholder
            </label>
            <TextField.Root
              className={`${NODE_INPUT_CLASS} mt-2`}
              value="123"
              readOnly
            />
          </div>
        </Dialog.Content>
      </Dialog.Root>
      {/** Delete Button */}
      <Dialog.Root>
        <Dialog.Trigger>
          <IconButton variant="ghost" color="red" className="text-destructive">
            <Trash2 className="p-1" />
          </IconButton>
        </Dialog.Trigger>
        <Dialog.Content className={NODE_DIALOG_COMPACT_CONTENT_CLASS}>
          <Dialog.Title>{t("admin.nodeTable.confirmDelete")}</Dialog.Title>
          <Dialog.Description className="mt-2">
            {t("admin.nodeTable.cannotUndo")}
          </Dialog.Description>
          <div className="mt-4 border-l-2 border-red-300 py-2 pl-3 text-sm text-red-700 dark:border-red-800 dark:text-red-200">
            <p className="text-sm leading-6 text-red-700 dark:text-red-200">
              Deleting a node removes it from the management console immediately.
              This action cannot be undone.
            </p>
          </div>
          <Flex gap="2" justify={"end"} className={NODE_DIALOG_FOOTER_CLASS}>
            <Dialog.Close>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
              >
                {t("admin.nodeTable.cancel")}
              </Button>
            </Dialog.Close>
            <Dialog.Trigger>
              <Button
                disabled={removing}
                color="red"
                className="w-full sm:w-auto"
                onClick={async () => {
                  setRemoving(true);
                  try {
                    await removeClient(row.original.uuid);
                    toast.success(t("admin.nodeTable.deleteSuccess", "Node deleted"));
                    if (refreshTable) refreshTable();
                  } catch (error) {
                    toast.error(
                      getReadableErrorMessage(error)
                    );
                  } finally {
                    setRemoving(false);
                  }
                }}
              >
                {removing
                  ? t("admin.nodeTable.deleting")
                  : t("admin.nodeTable.confirm")}
              </Button>
            </Dialog.Trigger>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}
