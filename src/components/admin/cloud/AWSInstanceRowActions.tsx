import type { TFunction } from "i18next";
import {
  KeyRound,
  MoreHorizontal,
  Power,
  PowerOff,
  RefreshCw,
  RotateCcw,
  Share2,
  Trash2,
} from "lucide-react";

import {
  Button,
  Flex,
} from "@/components/admin/cloud/cloud-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    <Flex justify="end" gap="2" wrap="nowrap">
      <Button
        variant="soft"
        size="1"
        disabled={!savedRootPassword || !passwordStorageEnabled || passwordLoading}
        onClick={() => {
          void onViewPassword();
        }}
      >
        <KeyRound className="mr-1 h-3.5 w-3.5" />
        {t("cloud.password.view", "View Password")}
      </Button>
      {isRunning ? (
        <Button
          variant="soft"
          size="1"
          color="amber"
          onClick={() => {
            void onPowerAction("stop");
          }}
        >
          <PowerOff className="mr-1 h-3.5 w-3.5" />
          {t("cloud.power_off", "Power Off")}
        </Button>
      ) : (
        <Button
          variant="soft"
          size="1"
          color="green"
          disabled={disableStart}
          onClick={() => {
            void onPowerAction("start");
          }}
        >
          <Power className="mr-1 h-3.5 w-3.5" />
          {t("cloud.power_on", "Power On")}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={t("common.action", "Action")}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem
            disabled={disableReboot}
            onSelect={() => {
              void onReboot();
            }}
          >
            <RotateCcw className="h-4 w-4" />
            {t("cloud.reboot", "Reboot")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={disableReplaceIP}
            onSelect={() => {
              void onReplaceIP();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            {t("cloud.providers.aws.replace_ip", "Replace IP")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onRunScript}>
            {t("cloud.script.action", "Run Script")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              void onShare();
            }}
          >
            <Share2 className="h-4 w-4" />
            {t("cloud.share.action", "Share")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={disableDelete}
            onSelect={() => {
              void onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
            {t("cloud.delete", "Delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Flex>
  );
}
