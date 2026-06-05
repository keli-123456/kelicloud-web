import * as React from "react";
import { t as translate } from "i18next";
import { Copy, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Button,
  Checkbox,
  Dialog,
  Flex,
  SegmentedControl,
  Switch,
  Text,
  TextArea,
  TextField,
} from "@/components/admin/admin-ui";
import Tips from "@/components/ui/tips";
import type { NodeDetail } from "@/contexts/NodeDetailsContext";
import type { SettingsResponse } from "@/lib/api";
import { buildAgentInstallScriptURL } from "@/lib/installScriptSource";

const NODE_DIALOG_CONTENT_CLASS =
  "admin-dialog flex max-h-[min(88vh,calc(100dvh-1rem))] w-[min(calc(100vw-1rem),980px)] flex-col overflow-hidden p-0";
const NODE_DIALOG_SECTION_CLASS =
  "border-t border-border/70 bg-transparent pt-3.5 first:border-t-0 first:pt-0";
const NODE_DIALOG_HINT_CLASS =
  "text-sm leading-6 text-muted-foreground";
const NODE_DIALOG_FOOTER_CLASS =
  "admin-panel-footer flex shrink-0 flex-col-reverse gap-2 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5";
const NODE_INPUT_CLASS =
  "h-10 rounded-md border border-input bg-[var(--surface)] px-3 text-[14px] shadow-none hover:bg-[var(--surface-hover)]";

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

const encodeScopedAutoDiscoveryKey = (key: string, group: string) =>
  group ? `${key}::group-b64=${encodeBase64Url(group)}` : key;

const getDefaultGroupLabel = () =>
  translate("admin.nodeTable.defaultGroup", {
    defaultValue: "Default group",
  });

const getDefaultInstallDir = (platform: Platform) => {
  switch (platform) {
    case "windows":
      return "$Env:ProgramFiles\\kelicloud-agent";
    case "macos":
      return "/usr/local/kelicloud-agent";
    default:
      return "/opt/kelicloud-agent";
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

type AdvancedToggleInputFieldProps = {
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
  hint?: string;
};

const AdvancedToggleInputField = ({
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
  hint,
}: AdvancedToggleInputFieldProps) => (
  <div className="border-b border-border/70 py-2.5 last:border-b-0">
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {label}
      </label>
      <Switch
        id={id}
        checked={enabled}
        onCheckedChange={(checked) => onEnabledChange(Boolean(checked))}
        aria-label={label}
      />
    </div>
    {hint ? (
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {hint}
      </p>
    ) : null}
    {enabled ? (
      <TextField.Root
        className={`${NODE_INPUT_CLASS} mt-2`}
        placeholder={placeholder}
        value={value}
        type={type}
        min={min}
        max={max}
        onChange={(event) => onValueChange(event.target.value)}
      />
    ) : null}
  </div>
);

export default function GenerateCommandDialog({
  open,
  onOpenChange,
  node,
  nodes,
  settings,
  toolbar = false,
  groupMode = false,
  presetGroupName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node?: NodeDetail;
  nodes?: NodeDetail[];
  settings: SettingsResponse;
  toolbar?: boolean;
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
    if (!useAutoDiscovery) return "";

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
    args.push(
      "--auto-discovery",
      groupMode ? scopedAutoDiscoveryKey : autoDiscoveryKey,
    );

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
              : "$Env:ProgramFiles\\kelicloud-agent";
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
              : `$(if [ "$(id -u)" -eq 0 ] || [ -w /usr/local ]; then printf %s /usr/local/kelicloud-agent; else printf %s "$HOME/.kelicloud-agent"; fi)`;
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
  const copyDisabled = groupMode
    ? !useAutoDiscovery || !normalizedGroupName
    : !useAutoDiscovery;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copy_success", "Copied!"));
    } catch (error) {
      console.error("Failed to copy text: ", error);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className={NODE_DIALOG_CONTENT_CLASS} maxWidth={980}>
        <div className="admin-panel-header shrink-0 px-5 py-4">
          <div className="flex min-w-0 flex-col gap-1 pr-12">
            <Dialog.Title>
              {groupMode
                ? scopedGroupName
                  ? `${t("admin.nodeTable.installCommand", "Install command")} · ${scopedGroupName}`
                  : t("admin.nodeTable.groupInstallCommand", "Create group install command")
                : useAutoDiscovery
                  ? `${t("admin.nodeTable.installCommand", "Install command")} · ${t("admin.nodeTable.autoEnroll", "Auto-enroll")}`
                  : t("admin.nodeTable.installCommand", "Install command")}
            </Dialog.Title>
            <Dialog.Description>
              {t(
                "admin.nodeTable.installDialogDescription",
                "Platform selection and install parameters are remembered and reused next time.",
              )}
            </Dialog.Description>
          </div>
        </div>
        <div className="admin-form-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-4">
          <div className="flex flex-col gap-4 pb-4">
          {useAutoDiscovery && !groupMode ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              {t(
                "admin.nodeTable.autoDiscoveryGeneralHint",
                "This currently uses the general auto-enroll command. Run it on any server and the node will register to your panel automatically.",
              )}
            </div>
          ) : null}
          {groupMode && useAutoDiscovery ? (
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
              {t(
                "admin.nodeTable.autoDiscoveryGroupHint",
                "After you enter a group name, run this command on any server. The node will register automatically into that group. If the machine was previously bound, the command will clear the old binding automatically before re-enrolling.",
              )}
            </div>
          ) : null}
          {groupMode ? (
            <div className={`${NODE_DIALOG_SECTION_CLASS} flex flex-col gap-3`}>
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                  {t("admin.nodeTable.groupName", "Group name")}
                </label>
                <TextField.Root
                  className={NODE_INPUT_CLASS}
                  placeholder={t(
                    "admin.nodeTable.groupNamePlaceholder",
                    "For example: Hong Kong / Japan / Production",
                  )}
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                />
              </div>
              {availableGroups.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableGroups.map((group) => (
                    <button
                      key={group}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                        normalizedGroupName === group
                          ? "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
                      }`}
                      onClick={() => setGroupName(group)}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              ) : null}
              <Text size="1" className="text-slate-500 dark:text-slate-400">
                {t(
                  "admin.nodeTable.groupNameHelp",
                  "The group will be created automatically after the first server runs this command. You do not need to create an empty group first.",
                )}
              </Text>
            </div>
          ) : null}
          {!useAutoDiscovery && toolbar && !groupMode ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              {t(
                "admin.nodeTable.autoDiscoveryDisabledSingle",
                "Auto Discovery Key is not enabled yet. Legacy single-node token onboarding has been removed; set the key in Settings > General before generating install commands.",
              )}
            </div>
          ) : null}
          {!useAutoDiscovery && groupMode ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              {t(
                "admin.nodeTable.autoDiscoveryDisabledGroup",
                "Set the Auto Discovery Key in Settings > General first, then group install commands can be used.",
              )}
            </div>
          ) : null}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.86fr)_minmax(420px,1.14fr)]">
            <div className="flex flex-col gap-4">
              <div className={NODE_DIALOG_SECTION_CLASS}>
                <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                  {t("admin.nodeTable.platform", "Platform")}
                </label>
                <div className="mt-3">
                  <SegmentedControl.Root
                    value={selectedPlatform}
                    onValueChange={(value) => setSelectedPlatform(value as Platform)}
                  >
                    <SegmentedControl.Item value="linux">Linux</SegmentedControl.Item>
                    <SegmentedControl.Item value="windows">Windows</SegmentedControl.Item>
                    <SegmentedControl.Item value="macos">macOS</SegmentedControl.Item>
                  </SegmentedControl.Root>
                </div>
              </div>

              <div className={NODE_DIALOG_SECTION_CLASS}>
                <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                  {t("admin.nodeTable.installOptions", "Install options")}
                </label>
                <div className="mt-3 grid gap-x-4 gap-y-2 text-slate-900 dark:text-slate-100 md:grid-cols-2">
                  <Flex gap="2" align="center">
                    <Checkbox
                      checked={installOptions.disableWebSsh}
                      onCheckedChange={(checked) => {
                        setInstallOptions((previous) => ({
                          ...previous,
                          disableWebSsh: Boolean(checked),
                        }));
                      }}
                    />
                    <label
                      className="text-sm font-normal"
                      onClick={() => {
                        setInstallOptions((previous) => ({
                          ...previous,
                          disableWebSsh: !previous.disableWebSsh,
                        }));
                      }}
                    >
                      {t("admin.nodeTable.disableWebSsh")}
                    </label>
                  </Flex>
                  <Flex gap="2" align="center">
                    <Checkbox
                      checked={installOptions.disableAutoUpdate}
                      onCheckedChange={(checked) => {
                        setInstallOptions((previous) => ({
                          ...previous,
                          disableAutoUpdate: Boolean(checked),
                        }));
                      }}
                    />
                    <label
                      className="text-sm font-normal"
                      onClick={() => {
                        setInstallOptions((previous) => ({
                          ...previous,
                          disableAutoUpdate: !previous.disableAutoUpdate,
                        }));
                      }}
                    >
                      {t("admin.nodeTable.disableAutoUpdate", "Disable auto update")}
                    </label>
                  </Flex>
                  <Flex gap="2" align="center">
                    <Checkbox
                      checked={installOptions.ignoreUnsafeCert}
                      onCheckedChange={(checked) => {
                        setInstallOptions((previous) => ({
                          ...previous,
                          ignoreUnsafeCert: Boolean(checked),
                        }));
                      }}
                    />
                    <label
                      className="text-sm font-normal"
                      onClick={() => {
                        setInstallOptions((previous) => ({
                          ...previous,
                          ignoreUnsafeCert: !previous.ignoreUnsafeCert,
                        }));
                      }}
                    >
                      {t("admin.nodeTable.ignoreUnsafeCert", "Ignore unsafe cert")}
                    </label>
                  </Flex>
                  <Flex gap="2" align="center">
                    <Checkbox
                      checked={installOptions.memoryIncludeCache}
                      onCheckedChange={(checked) => {
                        setInstallOptions((previous) => ({
                          ...previous,
                          memoryIncludeCache: Boolean(checked),
                        }));
                      }}
                    />
                    <label
                      className="text-sm font-normal"
                      onClick={() => {
                        setInstallOptions((previous) => ({
                          ...previous,
                          memoryIncludeCache: !previous.memoryIncludeCache,
                        }));
                      }}
                    >
                      {t("admin.nodeTable.memoryModeAvailable", "Include cache memory")}
                    </label>
                    <Tips size="14">
                      {t("admin.nodeTable.memoryModeAvailable_tip")}
                    </Tips>
                  </Flex>
                </div>
                {installOptions.ignoreUnsafeCert ? (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                    {t("admin.nodeTable.ignoreUnsafeCertWarning", {
                      defaultValue:
                        "已开启“忽略不安全证书”。仅在你确认网络可信且证书链无法暂时修复时使用。",
                    })}
                  </div>
                ) : null}
              </div>

              <div className={NODE_DIALOG_SECTION_CLASS}>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                    {t("admin.nodeTable.advancedParameters", "Advanced parameters")}
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={restoreDefaults}
                    className="h-8 rounded-md"
                  >
                    <RotateCcw size={14} />
                    {t("admin.nodeTable.restoreDefaults", {
                      defaultValue: "恢复默认",
                    })}
                  </Button>
                </div>
                <div className="mt-3 border-y border-border/70 px-1 text-slate-900 dark:text-slate-100">
                  <Flex gap="2" align="center" className="border-b border-border/70 py-2.5">
                    <Checkbox
                      checked={enableGhproxy}
                      onCheckedChange={(checked) => {
                        setEnableGhproxy(Boolean(checked));
                        if (!checked) {
                          setInstallOptions((previous) => ({
                            ...previous,
                            ghproxy: "",
                          }));
                        }
                      }}
                    />
                    <label
                      className="cursor-pointer text-sm font-bold"
                      onClick={() => {
                        setEnableGhproxy(!enableGhproxy);
                        if (enableGhproxy) {
                          setInstallOptions((previous) => ({
                            ...previous,
                            ghproxy: "",
                          }));
                        }
                      }}
                    >
                      {t("admin.nodeTable.ghproxy", "GitHub proxy")}
                    </label>
                  </Flex>
                  {enableGhproxy ? (
                    <TextField.Root
                      placeholder="https://ghfast.top/"
                      className={NODE_INPUT_CLASS}
                      value={installOptions.ghproxy}
                      onChange={(event) =>
                        setInstallOptions((previous) => ({
                          ...previous,
                          ghproxy: event.target.value,
                        }))
                      }
                    />
                  ) : null}

                  <AdvancedToggleInputField
                    id="node-install-dir"
                    label={t("admin.nodeTable.install_dir", "Installation directory")}
                    enabled={enableCustomDir}
                    placeholder={t(
                      "admin.nodeTable.install_dir_placeholder",
                      "Installation directory, leave empty to use the default directory (/opt/kelicloud-agent)",
                    )}
                    value={installOptions.dir}
                    onEnabledChange={(enabled) => {
                      setEnableCustomDir(enabled);
                      if (!enabled) {
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

                  <AdvancedToggleInputField
                    id="node-service-name"
                    label={t("admin.nodeTable.serviceName", "Service name")}
                    enabled={enableCustomServiceName}
                    placeholder={t(
                      "admin.nodeTable.serviceName_placeholder",
                      "Service name, leave empty to use the default name (kelicloud-agent)",
                    )}
                    value={installOptions.serviceName}
                    onEnabledChange={(enabled) => {
                      setEnableCustomServiceName(enabled);
                      if (!enabled) {
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

                  <AdvancedToggleInputField
                    id="node-include-nics"
                    label={t("admin.nodeTable.includeNics", "Specific network interfaces only.")}
                    enabled={enableIncludeNics}
                    placeholder="eth0,eth1"
                    value={installOptions.includeNics}
                    onEnabledChange={(enabled) => {
                      setEnableIncludeNics(enabled);
                      if (!enabled) {
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

                  <AdvancedToggleInputField
                    id="node-exclude-nics"
                    label={t("admin.nodeTable.excludeNics", "Exclude specific network interfaces.")}
                    enabled={enableExcludeNics}
                    placeholder="lo"
                    value={installOptions.excludeNics}
                    onEnabledChange={(enabled) => {
                      setEnableExcludeNics(enabled);
                      if (!enabled) {
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

                  <AdvancedToggleInputField
                    id="node-include-mountpoints"
                    label={t("admin.nodeTable.includeMountpoints", "Specific mountpoints only.")}
                    enabled={enableIncludeMountpoints}
                    placeholder="/;/home;/var"
                    value={installOptions.includeMountpoints}
                    onEnabledChange={(enabled) => {
                      setEnableIncludeMountpoints(enabled);
                      if (!enabled) {
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

                  <AdvancedToggleInputField
                    id="node-month-rotate"
                    label={t("admin.nodeTable.monthRotate", "Month reset for network statistics")}
                    enabled={enableMonthRotate}
                    placeholder="1"
                    value={installOptions.monthRotate}
                    type="number"
                    min="1"
                    max="31"
                    onEnabledChange={(enabled) => {
                      setEnableMonthRotate(enabled);
                      setInstallOptions((previous) => ({
                        ...previous,
                        monthRotate: enabled
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
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className={NODE_DIALOG_SECTION_CLASS}>
                <label className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                  {t("admin.nodeTable.generatedCommand", "Command")}
                </label>
                <p className={`mt-1 ${NODE_DIALOG_HINT_CLASS}`}>
                  {t(
                    "admin.nodeTable.generatedCommandHelp",
                    "Copy this command and run it directly on the target server.",
                  )}
                </p>
                <div className="relative mt-3 overflow-hidden rounded-md border border-border bg-[var(--surface-subtle)]">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="absolute right-2 top-2 z-10 h-8 rounded-md"
                    disabled={copyDisabled}
                    onClick={() => void copyToClipboard(command)}
                    aria-label={t("admin.nodeTable.copyCommand", {
                      defaultValue: "复制部署命令",
                    })}
                  >
                    <Copy size={14} />
                    {t("copy")}
                  </Button>
                  <TextArea
                    disabled
                    resize="none"
                    wrap="soft"
                    className="min-h-[280px] max-h-[420px] w-full overflow-y-auto border-0 bg-transparent pr-24 font-mono text-[13px] leading-6 whitespace-pre-wrap break-words text-slate-700 shadow-none dark:text-slate-200 [overflow-wrap:anywhere]"
                    style={{ overflowWrap: "anywhere" }}
                    value={command}
                  />
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
        <div className={NODE_DIALOG_FOOTER_CLASS}>
          <Dialog.Close>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
            >
              {t("close", "Close")}
            </Button>
          </Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
