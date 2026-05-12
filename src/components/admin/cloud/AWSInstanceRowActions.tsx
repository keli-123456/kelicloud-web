import type { TFunction } from "i18next";
import {
  KeyRound,
  Power,
  PowerOff,
  RefreshCw,
  RotateCcw,
  Share2,
  Terminal,
  Trash2,
} from "lucide-react";

import { AdminRowActions } from "@/components/admin/AdminRowActions";

type MaybePromise<T> = T | Promise<T>;

type AWSInstanceRowActionsProps = {
  t: TFunction;
  state: string;
  savedRootPassword: boolean;
  passwordStorageEnabled: boolean;
  passwordLoading: boolean;
  disableStart?: boolean;
  disableReboot?: boolean;
  disableReplaceIP?: boolean;
  disableDelete?: boolean;
  onViewPassword: () => MaybePromise<void>;
  onPowerAction: (action: "start" | "stop") => MaybePromise<void>;
  onReboot: () => MaybePromise<void>;
  onReplaceIP: () => MaybePromise<void>;
  onRunScript: () => void;
  onShare: () => MaybePromise<void>;
  onDelete: () => MaybePromise<void>;
};

export function AWSInstanceRowActions({
  t,
  state,
  savedRootPassword,
  passwordStorageEnabled,
  passwordLoading,
  disableStart = false,
  disableReboot = false,
  disableReplaceIP = false,
  disableDelete = false,
  onViewPassword,
  onPowerAction,
  onReboot,
  onReplaceIP,
  onRunScript,
  onShare,
  onDelete,
}: AWSInstanceRowActionsProps) {
  const isRunning = state === "running";

  return (
    <AdminRowActions
      contentClassName="min-w-44"
      actions={[
        {
    label: t("cloud.password.view", "查看密码"),
          icon: <KeyRound className="h-4 w-4" />,
          disabled: !savedRootPassword || !passwordStorageEnabled || passwordLoading,
          onSelect: () => {
            void onViewPassword();
          },
        },
        isRunning
          ? {
    label: t("cloud.power_off", "关闭电源"),
              icon: <PowerOff className="h-4 w-4" />,
              onSelect: () => {
                void onPowerAction("stop");
              },
            }
          : {
    label: t("cloud.power_on", "启动"),
              icon: <Power className="h-4 w-4" />,
              disabled: disableStart,
              onSelect: () => {
                void onPowerAction("start");
              },
            },
        {
    label: t("cloud.reboot", "重启"),
          icon: <RotateCcw className="h-4 w-4" />,
          disabled: disableReboot,
          onSelect: () => {
            void onReboot();
          },
        },
        {
    label: t("cloud.providers.aws.replace_ip", "切换 IP"),
          icon: <RefreshCw className="h-4 w-4" />,
          disabled: disableReplaceIP,
          onSelect: () => {
            void onReplaceIP();
          },
        },
        {
    label: t("cloud.script.action", "执行脚本"),
          icon: <Terminal className="h-4 w-4" />,
          onSelect: onRunScript,
        },
        {
    label: t("cloud.share.action", "分享"),
          icon: <Share2 className="h-4 w-4" />,
          onSelect: () => {
            void onShare();
          },
        },
        {
    label: t("cloud.delete", "删除"),
          icon: <Trash2 className="h-4 w-4" />,
          destructive: true,
          disabled: disableDelete,
          onSelect: () => {
            void onDelete();
          },
        },
      ]}
    />
  );
}
