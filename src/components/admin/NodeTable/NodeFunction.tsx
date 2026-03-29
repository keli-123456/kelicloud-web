import * as React from "react";
import { z } from "zod";
import { schema } from "@/components/admin/NodeTable/schema/node";
import { DataTableRefreshContext } from "@/components/admin/NodeTable/schema/DataTableRefreshContext";
import { Terminal, Trash2, Copy, Download, DollarSign } from "lucide-react";
import { t } from "i18next";
import type { Row } from "@tanstack/react-table";
import { EditDialog } from "./NodeEditDialog";
import { NodeDDNSDialog } from "./NodeDDNSDialog";
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
        <Dialog.Content>
          <Dialog.Title>
            {t("admin.nodeTable.installCommand", "Install command")}
          </Dialog.Title>
          <div className="flex flex-col gap-4">
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

            <Flex direction="column" gap="2">
              <label className="text-base font-bold">
                {t("admin.nodeTable.installOptions", "Install options")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Flex gap="2">
                  <Checkbox
                    checked={installOptions.disableWebSsh}
                    onCheckedChange={(checked) => {
                      setInstallOptions((prev) => ({
                        ...prev,
                        disableWebSsh: Boolean(checked),
                      }));
                    }}
                  />
                  <label
                    className="text-sm font-normal"
                    onClick={() => {
                      setInstallOptions((prev) => ({
                        ...prev,
                        disableWebSsh: !prev.disableWebSsh,
                      }));
                    }}
                  >
                    {t("admin.nodeTable.disableWebSsh", "Disable remote control")}
                  </label>
                </Flex>
                <Flex gap="2">
                  <Checkbox
                    checked={installOptions.disableAutoUpdate}
                    onCheckedChange={(checked) => {
                      setInstallOptions((prev) => ({
                        ...prev,
                        disableAutoUpdate: Boolean(checked),
                      }));
                    }}
                  ></Checkbox>
                  <label
                    className="text-sm font-normal"
                    onClick={() => {
                      setInstallOptions((prev) => ({
                        ...prev,
                        disableAutoUpdate: !prev.disableAutoUpdate,
                      }));
                    }}
                  >
                    {t("admin.nodeTable.disableAutoUpdate", "Disable auto update")}
                  </label>
                </Flex>
                <Flex gap="2">
                  <Checkbox
                    checked={installOptions.ignoreUnsafeCert}
                    onCheckedChange={(checked) => {
                      setInstallOptions((prev) => ({
                        ...prev,
                        ignoreUnsafeCert: Boolean(checked),
                      }));
                    }}
                  />
                  <label
                    className="text-sm font-normal"
                    onClick={() => {
                      setInstallOptions((prev) => ({
                        ...prev,
                        ignoreUnsafeCert: !prev.ignoreUnsafeCert,
                      }));
                    }}
                  >
                    {t("admin.nodeTable.ignoreUnsafeCert", "Ignore unsafe cert")}
                  </label>
                </Flex>
              </div>
              <Flex direction="column" gap="2">
                <label className="text-sm font-bold">
                  {t("admin.nodeTable.ghproxy", "GitHub proxy")}
                </label>
                <TextField.Root
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
                ></TextField.Root>
                <label className="text-sm font-bold">
                  {t("admin.nodeTable.install_dir", "Installation directory")}
                </label>
                <TextField.Root
                  placeholder={t(
                    "admin.nodeTable.install_dir_placeholder",
                    "安装目录，为空则使用默认目录(/opt/komari-agent)"
                  )}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      dir: e.target.value,
                    }))
                  }
                ></TextField.Root>
                <label className="text-sm font-bold">
                  {t("admin.nodeTable.serviceName", "Service name")}
                </label>
                <TextField.Root
                  placeholder={t(
                    "admin.nodeTable.serviceName_placeholder",
                    "服务名称，为空则使用默认名称(komari-agent)"
                  )}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      serviceName: e.target.value,
                    }))
                  }
                ></TextField.Root>
              </Flex>
            </Flex>
            <Flex direction="column" gap="2">
              <label className="text-base font-bold">
                {t("admin.nodeTable.generatedCommand", "Command")}
              </label>
              <div className="relative">
                <TextArea
                  disabled
                  className="w-full"
                  style={{ minHeight: "80px" }}
                  value={generateCommand()}
                />
              </div>
            </Flex>
            <Flex justify="center">
              <Button
                style={{ width: "100%" }}
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
      {/** Edit Button */}
      <EditDialog item={row.original} />
      {/** Edit Money */}
      <Dialog.Root> 
        <Dialog.Trigger>
          <IconButton variant="ghost">
           <DollarSign className="p-1" />
          </IconButton>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>{t("admin.nodeTable.editNodePrice")}</Dialog.Title>
          <label>
            123
          </label>
        </Dialog.Content>
      </Dialog.Root>
      {/** Delete Button */}
      <Dialog.Root>
        <Dialog.Trigger>
          <IconButton variant="ghost" color="red" className="text-destructive">
            <Trash2 className="p-1" />
          </IconButton>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>{t("admin.nodeTable.confirmDelete")}</Dialog.Title>
          <Dialog.Description>
            {t("admin.nodeTable.cannotUndo")}
          </Dialog.Description>
          <Flex gap="2" justify={"end"}>
            <Dialog.Close>
              <Button variant="soft">{t("admin.nodeTable.cancel")}</Button>
            </Dialog.Close>
            <Dialog.Trigger>
              <Button
                disabled={removing}
                color="red"
                onClick={async () => {
                  setRemoving(true);
                  try {
                    await removeClient(row.original.uuid);
                    toast.success(t("admin.nodeTable.deleteSuccess", "Node deleted"));
                    if (refreshTable) refreshTable();
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : String(error)
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
