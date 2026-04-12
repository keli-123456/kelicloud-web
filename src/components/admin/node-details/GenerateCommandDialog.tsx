import * as React from "react";
import { t as translate } from "i18next";
import { Copy, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import Tips from "@/components/ui/tips";
import type { NodeDetail } from "@/contexts/NodeDetailsContext";
import type { SettingsResponse } from "@/lib/api";
import { buildAgentInstallScriptURL } from "@/lib/installScriptSource";

const NODE_DIALOG_CONTENT_CLASS =
  "left-0 top-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 overflow-y-auto overscroll-contain rounded-none border-0 bg-background p-4 shadow-none [scrollbar-gutter:stable] sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90vh] sm:w-[min(96vw,1040px)] sm:max-w-[min(96vw,1040px)] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-[24px] sm:border sm:border-border/70 sm:bg-background sm:p-5 sm:shadow-2xl lg:p-6";
const NODE_DIALOG_HINT_CLASS =
  "text-[13px] leading-6 text-muted-foreground";
const NODE_INPUT_CLASS =
  "h-11 rounded-xl border border-border/70 bg-background px-3 text-[14px] shadow-none";
const NODE_DIALOG_SECTION_DIVIDER =
  "border-b border-border/70";
const COMMAND_TOOLBAR_CLASS =
  "flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3 py-2";
const COMMAND_PREVIEW_CLASS =
  "min-h-[180px] max-h-[44vh] w-full overflow-x-auto overflow-y-auto whitespace-pre rounded-b-[12px] px-3 py-3 pr-4 font-mono text-[12px] leading-6 text-foreground";
const COMMAND_PREVIEW_WRAPPER_CLASS =
  "overflow-hidden rounded-[12px] border border-border/70 bg-muted/40";
const NODE_SECTION_TITLE_CLASS =
  "text-[14px] font-semibold leading-6 text-foreground break-keep";
const NODE_OPTION_LABEL_CLASS =
  "min-w-0 text-sm leading-6 text-foreground break-keep";

const TextField = { Root: Input };

type Platform = "linux" | "windows" | "macos";

type InstallOptions = {
  disableWebSsh: boolean;
  disableAutoUpdate: boolean;
  ignoreUnsafeCert: boolean;
  memoryIncludeCache: boolean;
  ghproxy: string;
  dir: string;
  serviceName: string;
  includeNics: string;
  excludeNics: string;
  includeMountpoints: string;
  monthRotate: string;
};

type GenerateCommandPreferences = {
  selectedPlatform: Platform;
  installOptions: InstallOptions;
  enableGhproxy: boolean;
  enableCustomDir: boolean;
  enableCustomServiceName: boolean;
  enableIncludeNics: boolean;
  enableExcludeNics: boolean;
  enableIncludeMountpoints: boolean;
  enableMonthRotate: boolean;
};

const INSTALL_COMMAND_PREFERENCES_STORAGE_KEY =
  "komari-node-install-command-preferences-v1";

const DEFAULT_INSTALL_OPTIONS: InstallOptions = {
  disableWebSsh: false,
  disableAutoUpdate: false,
  ignoreUnsafeCert: false,
  memoryIncludeCache: false,
  ghproxy: "",
  dir: "",
  serviceName: "",
  includeNics: "",
  excludeNics: "",
  includeMountpoints: "",
  monthRotate: "",
};

const DEFAULT_GENERATE_COMMAND_PREFERENCES: GenerateCommandPreferences = {
  selectedPlatform: "linux",
  installOptions: DEFAULT_INSTALL_OPTIONS,
  enableGhproxy: false,
  enableCustomDir: false,
  enableCustomServiceName: false,
  enableIncludeNics: false,
  enableExcludeNics: false,
  enableIncludeMountpoints: false,
  enableMonthRotate: false,
};

let cachedGenerateCommandPreferences: GenerateCommandPreferences | null = null;

const shellQuote = (value: string) => `'${value.replace(/'/g, `'"'"'`)}'`;

const powershellQuote = (value: string) => `'${value.replace(/'/g, "''")}'`;

const encodeBase64Url = (value: string) => {
  const binary = Array.from(new TextEncoder().encode(value), (byte) =>
    String.fromCharCode(byte),
  ).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const getShellLabel = (
  platform: Platform,
  t: (key: string, options?: Record<string, string>) => string,
) => {
  switch (platform) {
    case "windows":
      return t("admin.nodeTable.shell.powershell", { defaultValue: "PowerShell" });
    case "macos":
      return t("admin.nodeTable.shell.zsh", { defaultValue: "zsh" });
    default:
      return t("admin.nodeTable.shell.bash", { defaultValue: "bash" });
  }
};

const encodeScopedAutoDiscoveryKey = (key: string, group: string) =>
  group ? `${key}::group-b64=${encodeBase64Url(group)}` : key;

const getDefaultGroupLabel = () =>
  translate("admin.nodeTable.defaultGroup", {
    defaultValue: "Default group",
  });

const getDefaultInstallDir = (platform: Platform) => {
  switch (platform) {
    case "windows":
      return "$Env:ProgramFiles\\Komari";
    case "macos":
      return "/usr/local/komari";
    default:
      return "/opt/komari";
  }
};

const loadGenerateCommandPreferences = (): GenerateCommandPreferences => {
  if (cachedGenerateCommandPreferences) {
    return cachedGenerateCommandPreferences;
  }

  if (typeof window === "undefined") {
    return DEFAULT_GENERATE_COMMAND_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(
      INSTALL_COMMAND_PREFERENCES_STORAGE_KEY,
    );
    if (!raw) {
      cachedGenerateCommandPreferences = DEFAULT_GENERATE_COMMAND_PREFERENCES;
      return DEFAULT_GENERATE_COMMAND_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as Partial<GenerateCommandPreferences>;
    const next: GenerateCommandPreferences = {
      ...DEFAULT_GENERATE_COMMAND_PREFERENCES,
      ...parsed,
      selectedPlatform:
        parsed.selectedPlatform === "windows"
        || parsed.selectedPlatform === "macos"
        || parsed.selectedPlatform === "linux"
          ? parsed.selectedPlatform
          : "linux",
      installOptions: {
        ...DEFAULT_INSTALL_OPTIONS,
        ...(parsed.installOptions || {}),
      },
    };
    cachedGenerateCommandPreferences = next;
    return next;
  } catch {
    cachedGenerateCommandPreferences = DEFAULT_GENERATE_COMMAND_PREFERENCES;
    return DEFAULT_GENERATE_COMMAND_PREFERENCES;
  }
};

const saveGenerateCommandPreferences = (
  preferences: GenerateCommandPreferences,
) => {
  cachedGenerateCommandPreferences = preferences;
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    INSTALL_COMMAND_PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences),
  );
};

const AdvancedRow = ({
  id,
  label,
  enabled,
  placeholder,
  value,
  onEnabledChange,
  onValueChange,
  type = "text",
  min,
  max,
}: {
  id: string;
  label: string;
  enabled: boolean;
  placeholder: string;
  value: string;
  onEnabledChange: (enabled: boolean) => void;
  onValueChange: (value: string) => void;
  type?: "text" | "number";
  min?: string;
  max?: string;
}) => (
  <div className="border-b border-border/70 py-2 last:border-b-0">
    <div className="flex items-center justify-between gap-3">
      <label
        htmlFor={id}
        className="min-w-0 flex-1 text-sm font-medium leading-6 text-foreground break-keep"
      >
        {label}
      </label>
      <Switch
        id={id}
        checked={enabled}
        onCheckedChange={(checked) => onEnabledChange(Boolean(checked))}
        aria-label={label}
      />
    </div>
    {enabled ? (
      <div className="mt-2">
        <TextField.Root
          className={NODE_INPUT_CLASS}
          placeholder={placeholder}
          value={value}
          type={type}
          min={min}
          max={max}
          onChange={(event) => onValueChange(event.target.value)}
        />
      </div>
    ) : null}
  </div>
);

export default function GenerateCommandDialog({
  open,
  onOpenChange,
  node,
  nodes,
  settings,
  groupMode = false,
  presetGroupName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node?: NodeDetail;
  nodes?: NodeDetail[];
  settings: SettingsResponse;
  groupMode?: boolean;
  presetGroupName?: string;
}) {
  const availableNodes = React.useMemo(
    () => nodes ?? (node ? [node] : []),
    [node, nodes],
  );
  const initialPreferences = React.useMemo(
    () => loadGenerateCommandPreferences(),
    [],
  );
  const [selectedNodeId, setSelectedNodeId] = React.useState(
    node?.uuid ?? availableNodes[0]?.uuid ?? "",
  );
  const [selectedPlatform, setSelectedPlatform] = React.useState<Platform>(
    initialPreferences.selectedPlatform,
  );
  const [installOptions, setInstallOptions] = React.useState<InstallOptions>(
    initialPreferences.installOptions,
  );
  const [enableGhproxy, setEnableGhproxy] = React.useState(
    initialPreferences.enableGhproxy,
  );
  const [enableCustomDir, setEnableCustomDir] = React.useState(
    initialPreferences.enableCustomDir,
  );
  const [enableCustomServiceName, setEnableCustomServiceName] =
    React.useState(initialPreferences.enableCustomServiceName);
  const [enableIncludeNics, setEnableIncludeNics] = React.useState(
    initialPreferences.enableIncludeNics,
  );
  const [enableExcludeNics, setEnableExcludeNics] = React.useState(
    initialPreferences.enableExcludeNics,
  );
  const [enableIncludeMountpoints, setEnableIncludeMountpoints] =
    React.useState(initialPreferences.enableIncludeMountpoints);
  const [enableMonthRotate, setEnableMonthRotate] = React.useState(
    initialPreferences.enableMonthRotate,
  );
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const scopedGroupName =
    groupMode && presetGroupName && presetGroupName !== getDefaultGroupLabel()
      ? presetGroupName.trim()
      : "";
  const [groupName, setGroupName] = React.useState(scopedGroupName);
  const autoDiscoveryKey = String(settings?.auto_discovery_key || "").trim();
  const useAutoDiscovery = autoDiscoveryKey.length >= 12;
  const normalizedGroupName = groupName.trim();
  const scopedAutoDiscoveryKey = encodeScopedAutoDiscoveryKey(
    autoDiscoveryKey,
    normalizedGroupName,
  );
  const availableGroups = React.useMemo(
    () =>
      Array.from(
        new Set(
          availableNodes
            .map((item) => String(item.group || "").trim())
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [availableNodes],
  );
  const activeNode =
    node
    ?? availableNodes.find((item) => item.uuid === selectedNodeId)
    ?? availableNodes[0];
  const hasMountedPreferenceSync = React.useRef(false);
  const { t } = useTranslation();

  React.useEffect(() => {
    if (!groupMode) return;
    setGroupName(scopedGroupName);
  }, [groupMode, scopedGroupName]);

  React.useEffect(() => {
    if (!hasMountedPreferenceSync.current) {
      hasMountedPreferenceSync.current = true;
      return;
    }

    saveGenerateCommandPreferences({
      selectedPlatform,
      installOptions,
      enableGhproxy,
      enableCustomDir,
      enableCustomServiceName,
      enableIncludeNics,
      enableExcludeNics,
      enableIncludeMountpoints,
      enableMonthRotate,
    });
  }, [
    enableCustomDir,
    enableCustomServiceName,
    enableExcludeNics,
    enableGhproxy,
    enableIncludeMountpoints,
    enableIncludeNics,
    enableMonthRotate,
    installOptions,
    selectedPlatform,
  ]);

  React.useEffect(() => {
    if (useAutoDiscovery || groupMode) {
      return;
    }
    if (node?.uuid) {
      setSelectedNodeId(node.uuid);
      return;
    }

    if (
      availableNodes.length > 0
      && !availableNodes.some((item) => item.uuid === selectedNodeId)
    ) {
      setSelectedNodeId(availableNodes[0].uuid);
    }
  }, [availableNodes, groupMode, node?.uuid, selectedNodeId, useAutoDiscovery]);

  const restoreDefaults = React.useCallback(() => {
    setSelectedPlatform(DEFAULT_GENERATE_COMMAND_PREFERENCES.selectedPlatform);
    setInstallOptions(DEFAULT_GENERATE_COMMAND_PREFERENCES.installOptions);
    setEnableGhproxy(DEFAULT_GENERATE_COMMAND_PREFERENCES.enableGhproxy);
    setEnableCustomDir(DEFAULT_GENERATE_COMMAND_PREFERENCES.enableCustomDir);
    setEnableCustomServiceName(
      DEFAULT_GENERATE_COMMAND_PREFERENCES.enableCustomServiceName,
    );
    setEnableIncludeNics(DEFAULT_GENERATE_COMMAND_PREFERENCES.enableIncludeNics);
    setEnableExcludeNics(DEFAULT_GENERATE_COMMAND_PREFERENCES.enableExcludeNics);
    setEnableIncludeMountpoints(
      DEFAULT_GENERATE_COMMAND_PREFERENCES.enableIncludeMountpoints,
    );
    setEnableMonthRotate(DEFAULT_GENERATE_COMMAND_PREFERENCES.enableMonthRotate);
    toast.success(
      t("admin.nodeTable.restoreDefaultsSuccess", {
        defaultValue: "已恢复默认参数",
      }),
    );
  }, [t]);

  const generateCommand = () => {
    if (groupMode && (!useAutoDiscovery || !normalizedGroupName)) return "";
    if (!useAutoDiscovery && !activeNode) return "";

    const host = (() => {
      if (!settings.script_domain) {
        return window.location.origin;
      }
      if (settings.script_domain.startsWith("http")) {
        return settings.script_domain.replace(/\/+$/, "");
      }
      return `http://${settings.script_domain.replace(/\/+$/, "")}`;
    })();

    const args = ["-e", host];
    if (useAutoDiscovery) {
      args.push(
        "--auto-discovery",
        groupMode ? scopedAutoDiscoveryKey : autoDiscoveryKey,
      );
    } else {
      args.push("-t", activeNode?.token || "");
    }

    if (installOptions.disableWebSsh) {
      args.push("--disable-web-ssh");
    }
    if (installOptions.disableAutoUpdate) {
      args.push("--disable-auto-update");
    }
    if (installOptions.ignoreUnsafeCert) {
      args.push("--ignore-unsafe-cert");
    }
    if (installOptions.memoryIncludeCache) {
      args.push("--memory-include-cache");
    }
    if (enableGhproxy && installOptions.ghproxy) {
      const finalUrl = (
        installOptions.ghproxy.startsWith("http")
          ? installOptions.ghproxy
          : `http://${installOptions.ghproxy}`
      ).replace(/\/+$/, "");
      args.push("--install-ghproxy");
      args.push(finalUrl);
    }
    if (enableCustomDir && installOptions.dir) {
      args.push("--install-dir");
      args.push(installOptions.dir);
    }
    if (enableCustomServiceName && installOptions.serviceName) {
      args.push("--install-service-name");
      args.push(installOptions.serviceName);
    }
    if (enableIncludeNics && installOptions.includeNics) {
      args.push("--include-nics");
      args.push(installOptions.includeNics);
    }
    if (enableExcludeNics && installOptions.excludeNics) {
      args.push("--exclude-nics");
      args.push(installOptions.excludeNics);
    }
    if (enableIncludeMountpoints && installOptions.includeMountpoints) {
      args.push("--include-mountpoint");
      args.push(installOptions.includeMountpoints);
    }
    if (enableMonthRotate) {
      const rotateVal = (installOptions.monthRotate || "").trim() || "1";
      args.push("--month-rotate");
      args.push(rotateVal);
    }

    const effectiveInstallDir =
      enableCustomDir && installOptions.dir.trim()
        ? installOptions.dir.trim()
        : getDefaultInstallDir(selectedPlatform);
    const scriptFile = selectedPlatform === "windows" ? "install.ps1" : "install.sh";
    let scriptUrl = buildAgentInstallScriptURL(
      settings.base_scripts_url,
      scriptFile,
    );

    if (enableGhproxy && installOptions.ghproxy) {
      scriptUrl = scriptUrl.slice(8);
      if (installOptions.ghproxy.endsWith("/")) {
        scriptUrl = `${installOptions.ghproxy}${scriptUrl}`;
      } else {
        scriptUrl = `${installOptions.ghproxy}/${scriptUrl}`;
      }
      if (!scriptUrl.startsWith("http")) {
        scriptUrl = `http://${scriptUrl}`;
      }
    }

    const shellArgs = args.map(shellQuote).join(" ");
    switch (selectedPlatform) {
      case "linux":
        return groupMode && useAutoDiscovery
          ? `AUTO_DISCOVERY_FILE=${shellQuote(`${effectiveInstallDir}/auto-discovery.json`)}; if [ -f "$AUTO_DISCOVERY_FILE" ]; then if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then sudo rm -f "$AUTO_DISCOVERY_FILE"; else rm -f "$AUTO_DISCOVERY_FILE"; fi; fi; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then wget -qO- ${shellQuote(
              scriptUrl,
            )} | sudo bash -s -- ${shellArgs}; else wget -qO- ${shellQuote(
              scriptUrl,
            )} | bash -s -- ${shellArgs}; fi`
          : `wget -qO- ${shellQuote(scriptUrl)} | sudo bash -s -- ${shellArgs}`;
      case "windows": {
        let finalCommand = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "`;
        if (groupMode && useAutoDiscovery) {
          const windowsInstallDir =
            enableCustomDir && installOptions.dir.trim()
              ? powershellQuote(installOptions.dir.trim())
              : "$Env:ProgramFiles\\Komari";
          finalCommand += `$ksBindFile = Join-Path ${windowsInstallDir} 'auto-discovery.json'; if (Test-Path $ksBindFile) { Remove-Item $ksBindFile -Force }; `;
        }
        finalCommand +=
          `iwr ${powershellQuote(scriptUrl)}` +
          ` -UseBasicParsing -OutFile 'install.ps1'; &` +
          ` '.\\install.ps1'`;
        args.forEach((arg) => {
          finalCommand += ` ${powershellQuote(arg)}`;
        });
        finalCommand += `"`;
        return finalCommand;
      }
      case "macos":
        if (groupMode && useAutoDiscovery) {
          const macInstallDir =
            enableCustomDir && installOptions.dir.trim()
              ? shellQuote(installOptions.dir.trim())
              : `$(if [ "$(id -u)" -eq 0 ] || [ -w /usr/local ]; then printf %s /usr/local/komari; else printf %s "$HOME/.komari"; fi)`;
          return (
            `AUTO_DISCOVERY_DIR=${macInstallDir}; AUTO_DISCOVERY_FILE="$AUTO_DISCOVERY_DIR/auto-discovery.json"; ` +
            `if [ -f "$AUTO_DISCOVERY_FILE" ]; then rm -f "$AUTO_DISCOVERY_FILE"; fi; ` +
            `zsh <(curl -sL ${shellQuote(scriptUrl)}) ${shellArgs}`
          );
        }
        return `zsh <(curl -sL ${shellQuote(scriptUrl)}) ${shellArgs}`;
    }
  };

  const command = generateCommand();
  const shellLabel = getShellLabel(selectedPlatform, (key, options) =>
    t(key, options),
  );
  const commandHint = groupMode
    ? useAutoDiscovery
      ? t(
          "admin.nodeTable.autoDiscoveryGroupHint",
          "输入分组名称后，复制这条命令到任意服务器执行，节点会自动注册并归入该分组。已绑定过的机器再次执行时，会自动清理旧绑定后重新接入。",
        )
      : t(
          "admin.nodeTable.autoDiscoveryDisabledGroup",
          "先到“设置 > 通用”里设置自动发现密钥，创建分组命令才会生效。",
        )
    : useAutoDiscovery
      ? t(
          "admin.nodeTable.autoDiscoveryGeneralHint",
          "当前使用通用自动接入命令。任意服务器执行后会自动注册到你的面板。",
        )
      : t(
          "admin.nodeTable.autoDiscoveryDisabledSingle",
          "当前还没启用自动发现密钥，所以这里仍是旧的单节点模式。到“设置 > 通用”里设置自动发现密钥后，这里会变成通用接入命令。",
        );
  const copyDisabled = groupMode
    ? !useAutoDiscovery || !normalizedGroupName
    : !useAutoDiscovery && !activeNode;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copy_success", "Copied!"));
    } catch (error) {
      console.error("Failed to copy text: ", error);
    }
  };

  const showNodeSelect =
    !groupMode && !useAutoDiscovery && !node && availableNodes.length > 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={NODE_DIALOG_CONTENT_CLASS}>
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold leading-7 text-foreground break-keep">
            {groupMode
              ? scopedGroupName
                ? `${t("admin.nodeTable.installCommand", "Install command")} · ${scopedGroupName}`
                : t("admin.nodeTable.groupInstallCommand", "Create group install command")
              : useAutoDiscovery
                ? `${t("admin.nodeTable.installCommand", "Install command")} · ${t("admin.nodeTable.autoEnroll", "Auto-enroll")}`
                : node
                  ? `${t("admin.nodeTable.installCommand", "Install command")} · ${activeNode?.name || "-"}`
                  : t("admin.nodeTable.installCommand", "Install command")}
          </DialogTitle>
          <DialogDescription className={NODE_DIALOG_HINT_CLASS}>
            {t(
              "admin.nodeTable.installDialogDescription",
              "Platform selection and install parameters are remembered and reused next time.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-4 text-sm">
          <div className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
            <p className="text-sm font-medium leading-6 text-foreground break-keep">
              {t("admin.nodeTable.currentCommandHint", {
                defaultValue: "当前命令提示",
              })}
            </p>
            <p className={`mt-1 ${NODE_DIALOG_HINT_CLASS}`}>
              {commandHint}
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <section className="order-1 min-w-0 xl:order-2">
              <div className={NODE_SECTION_TITLE_CLASS}>
                {t("admin.nodeTable.generatedCommand", "Command")}
              </div>
              <p className={`mt-1 ${NODE_DIALOG_HINT_CLASS}`}>
                {t(
                  "admin.nodeTable.generatedCommandHelp",
                  "Copy this command and run it directly on the target server.",
                )}
              </p>
              <div className="mt-3 min-w-0">
                <div className={COMMAND_PREVIEW_WRAPPER_CLASS}>
                  <div className={COMMAND_TOOLBAR_CLASS}>
                    <Badge variant="secondary">{shellLabel}</Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 shrink-0"
                      disabled={copyDisabled}
                      onClick={() => void copyToClipboard(command)}
                      aria-label={t("admin.nodeTable.copyCommand", {
                        defaultValue: "复制部署命令",
                      })}
                    >
                      <Copy size={14} />
                      {t("copy")}
                    </Button>
                  </div>
                  <pre className={COMMAND_PREVIEW_CLASS}>
                    <code className="block min-w-max">{command || ""}</code>
                  </pre>
                </div>
              </div>
            </section>

            <div className="order-2 min-w-0 space-y-5 xl:order-1">
              {groupMode ? (
                <>
                  <section className="space-y-2">
                    <div className={NODE_SECTION_TITLE_CLASS}>
                      {t("admin.nodeTable.groupName", "分组名称")}
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                      <div className="text-xs leading-5 text-muted-foreground break-keep">
                        {t("admin.nodeTable.groupLabel", {
                          defaultValue: "分组",
                        })}
                      </div>
                      <div className="mt-1 text-sm font-medium leading-6 text-foreground break-keep">
                        {normalizedGroupName || t("admin.nodeTable.defaultGroup", "默认分组")}
                      </div>
                    </div>
                    <TextField.Root
                      className={NODE_INPUT_CLASS}
                      placeholder={t(
                        "admin.nodeTable.groupNamePlaceholder",
                        "For example: Hong Kong / Japan / Production",
                      )}
                      value={groupName}
                      onChange={(event) => setGroupName(event.target.value)}
                    />
                    {availableGroups.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {availableGroups.map((group) => (
                          <button
                            key={group}
                            type="button"
                            className={`rounded-full border px-3 py-1 text-[13px] font-medium leading-5 transition-colors break-keep ${
                              normalizedGroupName === group
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border bg-background text-muted-foreground hover:text-foreground"
                            }`}
                            onClick={() => setGroupName(group)}
                          >
                            {group}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </section>
                  <div className={NODE_DIALOG_SECTION_DIVIDER} />
                </>
              ) : null}

              {showNodeSelect ? (
                <>
                  <section>
                    <label className={NODE_SECTION_TITLE_CLASS}>
                      {t("admin.nodeTable.selectNode", "Select node")}
                    </label>
                    <select
                      className="mt-2 h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm text-foreground outline-none"
                      value={selectedNodeId}
                      onChange={(event) => setSelectedNodeId(event.target.value)}
                    >
                      {availableNodes.map((item) => (
                        <option key={item.uuid} value={item.uuid}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </section>
                  <div className={NODE_DIALOG_SECTION_DIVIDER} />
                </>
              ) : null}

              <section>
                <label className={NODE_SECTION_TITLE_CLASS}>
                  {t("admin.nodeTable.platform", "安装平台")}
                </label>
                <div className="mt-2">
                  <SegmentedControl.Root
                    value={selectedPlatform}
                    onValueChange={(value) => setSelectedPlatform(value as Platform)}
                  >
                    <SegmentedControl.Item value="linux">Linux</SegmentedControl.Item>
                    <SegmentedControl.Item value="windows">Windows</SegmentedControl.Item>
                    <SegmentedControl.Item value="macos">macOS</SegmentedControl.Item>
                  </SegmentedControl.Root>
                </div>
              </section>

              <div className={NODE_DIALOG_SECTION_DIVIDER} />

              <section>
                <label className={NODE_SECTION_TITLE_CLASS}>
                  {t("admin.nodeTable.installOptions", "安装选项")}
                </label>
                <div className="mt-3 space-y-2">
                  <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
                    <Checkbox
                      id="install-disable-web-ssh"
                      className="mt-1 shrink-0"
                      checked={installOptions.disableWebSsh}
                      onCheckedChange={(checked) => {
                        setInstallOptions((previous) => ({
                          ...previous,
                          disableWebSsh: Boolean(checked),
                        }));
                      }}
                    />
                    <label htmlFor="install-disable-web-ssh" className={NODE_OPTION_LABEL_CLASS}>
                      {t("admin.nodeTable.disableWebSsh")}
                    </label>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
                    <Checkbox
                      id="install-disable-auto-update"
                      className="mt-1 shrink-0"
                      checked={installOptions.disableAutoUpdate}
                      onCheckedChange={(checked) => {
                        setInstallOptions((previous) => ({
                          ...previous,
                          disableAutoUpdate: Boolean(checked),
                        }));
                      }}
                    />
                    <label htmlFor="install-disable-auto-update" className={NODE_OPTION_LABEL_CLASS}>
                      {t("admin.nodeTable.disableAutoUpdate", "Disable auto update")}
                    </label>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
                    <Checkbox
                      id="install-ignore-unsafe-cert"
                      className="mt-1 shrink-0"
                      checked={installOptions.ignoreUnsafeCert}
                      onCheckedChange={(checked) => {
                        setInstallOptions((previous) => ({
                          ...previous,
                          ignoreUnsafeCert: Boolean(checked),
                        }));
                      }}
                    />
                    <label htmlFor="install-ignore-unsafe-cert" className={NODE_OPTION_LABEL_CLASS}>
                      {t("admin.nodeTable.ignoreUnsafeCert", "Ignore unsafe cert")}
                    </label>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
                    <Checkbox
                      id="install-memory-include-cache"
                      className="mt-1 shrink-0"
                      checked={installOptions.memoryIncludeCache}
                      onCheckedChange={(checked) => {
                        setInstallOptions((previous) => ({
                          ...previous,
                          memoryIncludeCache: Boolean(checked),
                        }));
                      }}
                    />
                    <label
                      htmlFor="install-memory-include-cache"
                      className={`${NODE_OPTION_LABEL_CLASS} flex items-center gap-2`}
                    >
                      <span>{t("admin.nodeTable.memoryModeAvailable", "Include cache memory")}</span>
                      <Tips size="14">
                        {t("admin.nodeTable.memoryModeAvailable_tip")}
                      </Tips>
                    </label>
                  </div>
                </div>
                {installOptions.ignoreUnsafeCert ? (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    {t("admin.nodeTable.ignoreUnsafeCertWarning", {
                      defaultValue:
                        "已开启“忽略不安全证书”。仅在你确认网络可信且证书链无法暂时修复时使用。",
                    })}
                  </p>
                ) : null}
              </section>

              <div className={NODE_DIALOG_SECTION_DIVIDER} />

              <section>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className={NODE_SECTION_TITLE_CLASS}>
                    {t("admin.nodeTable.advancedParameters", "高级参数")}
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAdvanced((previous) => !previous)}
                      className="h-8"
                    >
                      {showAdvanced
                        ? t("admin.nodeTable.hideAdvanced", { defaultValue: "收起高级参数" })
                        : t("admin.nodeTable.showAdvanced", { defaultValue: "展开高级参数" })}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={restoreDefaults}
                      className="h-8"
                    >
                      <RotateCcw size={14} />
                      {t("admin.nodeTable.restoreDefaults", {
                        defaultValue: "恢复默认",
                      })}
                    </Button>
                  </div>
                </div>

                {showAdvanced ? (
                  <div className="mt-2">
                    <AdvancedRow
                      id="node-ghproxy"
                      label={t("admin.nodeTable.ghproxy", "GitHub 代理")}
                      enabled={enableGhproxy}
                      placeholder="https://ghfast.top/"
                      value={installOptions.ghproxy}
                      onEnabledChange={(checked) => {
                        setEnableGhproxy(checked);
                        if (!checked) {
                          setInstallOptions((previous) => ({
                            ...previous,
                            ghproxy: "",
                          }));
                        }
                      }}
                      onValueChange={(value) =>
                        setInstallOptions((previous) => ({
                          ...previous,
                          ghproxy: value,
                        }))
                      }
                    />
                    <AdvancedRow
                      id="node-install-dir"
                      label={t("admin.nodeTable.install_dir", "安装目录")}
                      enabled={enableCustomDir}
                      placeholder={t(
                        "admin.nodeTable.install_dir_placeholder",
                        "Installation directory, leave empty to use the default directory (/opt/komari-agent)",
                      )}
                      value={installOptions.dir}
                      onEnabledChange={(checked) => {
                        setEnableCustomDir(checked);
                        if (!checked) {
                          setInstallOptions((previous) => ({
                            ...previous,
                            dir: "",
                          }));
                        }
                      }}
                      onValueChange={(value) =>
                        setInstallOptions((previous) => ({
                          ...previous,
                          dir: value,
                        }))
                      }
                    />
                    <AdvancedRow
                      id="node-service-name"
                      label={t("admin.nodeTable.serviceName", "服务名称")}
                      enabled={enableCustomServiceName}
                      placeholder={t(
                        "admin.nodeTable.serviceName_placeholder",
                        "Service name, leave empty to use the default name (komari-agent)",
                      )}
                      value={installOptions.serviceName}
                      onEnabledChange={(checked) => {
                        setEnableCustomServiceName(checked);
                        if (!checked) {
                          setInstallOptions((previous) => ({
                            ...previous,
                            serviceName: "",
                          }));
                        }
                      }}
                      onValueChange={(value) =>
                        setInstallOptions((previous) => ({
                          ...previous,
                          serviceName: value,
                        }))
                      }
                    />
                    <AdvancedRow
                      id="node-include-nics"
                      label={t("admin.nodeTable.includeNics", "只监测特定网卡")}
                      enabled={enableIncludeNics}
                      placeholder="eth0,eth1"
                      value={installOptions.includeNics}
                      onEnabledChange={(checked) => {
                        setEnableIncludeNics(checked);
                        if (!checked) {
                          setInstallOptions((previous) => ({
                            ...previous,
                            includeNics: "",
                          }));
                        }
                      }}
                      onValueChange={(value) =>
                        setInstallOptions((previous) => ({
                          ...previous,
                          includeNics: value,
                        }))
                      }
                    />
                    <AdvancedRow
                      id="node-exclude-nics"
                      label={t("admin.nodeTable.excludeNics", "排除特定网卡")}
                      enabled={enableExcludeNics}
                      placeholder="lo"
                      value={installOptions.excludeNics}
                      onEnabledChange={(checked) => {
                        setEnableExcludeNics(checked);
                        if (!checked) {
                          setInstallOptions((previous) => ({
                            ...previous,
                            excludeNics: "",
                          }));
                        }
                      }}
                      onValueChange={(value) =>
                        setInstallOptions((previous) => ({
                          ...previous,
                          excludeNics: value,
                        }))
                      }
                    />
                    <AdvancedRow
                      id="node-include-mountpoints"
                      label={t("admin.nodeTable.includeMountpoints", "只监测特定挂载点")}
                      enabled={enableIncludeMountpoints}
                      placeholder="/;/home;/var"
                      value={installOptions.includeMountpoints}
                      onEnabledChange={(checked) => {
                        setEnableIncludeMountpoints(checked);
                        if (!checked) {
                          setInstallOptions((previous) => ({
                            ...previous,
                            includeMountpoints: "",
                          }));
                        }
                      }}
                      onValueChange={(value) =>
                        setInstallOptions((previous) => ({
                          ...previous,
                          includeMountpoints: value,
                        }))
                      }
                    />
                    <AdvancedRow
                      id="node-month-rotate"
                      label={t("admin.nodeTable.monthRotate", "网络统计月重置日")}
                      enabled={enableMonthRotate}
                      placeholder="1"
                      value={installOptions.monthRotate}
                      type="number"
                      min="1"
                      max="31"
                      onEnabledChange={(checked) => {
                        setEnableMonthRotate(checked);
                        setInstallOptions((previous) => ({
                          ...previous,
                          monthRotate: checked
                            ? previous.monthRotate?.trim()
                              ? previous.monthRotate
                              : "1"
                            : "",
                        }));
                      }}
                      onValueChange={(value) =>
                        setInstallOptions((previous) => ({
                          ...previous,
                          monthRotate: value,
                        }))
                      }
                    />
                  </div>
                ) : null}
              </section>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 border-t border-border/70 pt-3 sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t("close", "Close")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
