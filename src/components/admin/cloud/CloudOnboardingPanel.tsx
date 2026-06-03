import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import {
  CheckCircle2,
  Eye,
  KeyRound,
  Plus,
  RefreshCw,
  Server,
} from "lucide-react";

import { Button } from "@/components/admin/cloud/cloud-ui";

type MaybePromise<T> = T | Promise<T>;

type CloudOnboardingPanelProps = {
  t: TFunction;
  providerName: string;
  credentialDone: boolean;
  contextReady?: boolean;
  resourcesLoaded?: boolean;
  resourceStepEnabled?: boolean;
  resourceLoading?: boolean;
  createLoading?: boolean;
  canLoadResources?: boolean;
  canCreate?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  credentialTitle?: ReactNode;
  credentialDescription?: ReactNode;
  resourceTitle?: ReactNode;
  resourceDescription?: ReactNode;
  createTitle?: ReactNode;
  createDescription?: ReactNode;
  importLabel?: ReactNode;
  loadLabel?: ReactNode;
  createLabel?: ReactNode;
  onImportCredential: () => void;
  onLoadResources?: () => MaybePromise<void>;
  onCreate?: () => MaybePromise<void>;
};

export function CloudOnboardingPanel({
  t,
  providerName,
  credentialDone,
  contextReady = credentialDone,
  resourcesLoaded = false,
  resourceStepEnabled = true,
  resourceLoading = false,
  createLoading = false,
  canLoadResources = contextReady,
  canCreate = contextReady,
  title,
  description,
  credentialTitle,
  credentialDescription,
  resourceTitle,
  resourceDescription,
  createTitle,
  createDescription,
  importLabel,
  loadLabel,
  createLabel,
  onImportCredential,
  onLoadResources,
  onCreate,
}: CloudOnboardingPanelProps) {
  const credentialStatus = credentialDone
    ? t("cloud.onboarding.credential_status_ready", { defaultValue: "凭据：已选择" })
    : t("cloud.onboarding.credential_status_waiting", {
        provider: providerName,
        defaultValue: "凭据：待导入 {{provider}}",
      });
  const resourceStatus = resourcesLoaded
    ? t("cloud.onboarding.resource_status_loaded", { defaultValue: "资源：已加载" })
    : t("cloud.onboarding.resource_status_lazy", { defaultValue: "资源：按需加载" });
  const instanceStatus = contextReady
    ? createTitle || t("cloud.onboarding.create_title", "创建或管理实例")
    : t("cloud.onboarding.create_status_waiting", { defaultValue: "实例：等待凭据" });

  return (
    <div className="admin-panel px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">
            {title ||
              t("cloud.onboarding.provider_title", {
                provider: providerName,
                defaultValue: "{{provider}} 资源管理",
              })}
          </div>
          <div className="mt-1 max-w-4xl text-xs leading-5 text-muted-foreground">
            {description ||
              t("cloud.onboarding.provider_description", {
                provider: providerName,
                defaultValue:
                  "凭据激活后即可创建实例；云资源只在需要时加载，避免打开页面就请求云厂商 API。",
              })}
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span
              className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border border-border bg-[var(--surface-subtle)] px-2.5"
              title={typeof credentialDescription === "string" ? credentialDescription : undefined}
            >
              <KeyRound className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{credentialStatus}</span>
            </span>
            {resourceStepEnabled ? (
              <span
                className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border border-border bg-[var(--surface-subtle)] px-2.5"
                title={typeof resourceTitle === "string"
                  ? resourceTitle
                  : typeof resourceDescription === "string"
                    ? resourceDescription
                    : undefined}
              >
                <Eye className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{resourceStatus}</span>
              </span>
            ) : null}
            <span
              className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border border-border bg-[var(--surface-subtle)] px-2.5"
              title={typeof createDescription === "string" ? createDescription : undefined}
            >
              <Server className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{instanceStatus}</span>
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {!credentialDone ? (
            <Button size="1" onClick={onImportCredential}>
              <KeyRound className="mr-2 h-4 w-4" />
              {importLabel || t("cloud.credentials.import", "导入凭据")}
            </Button>
          ) : (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {credentialTitle || t("cloud.onboarding.credential_ready", "凭据已就绪")}
            </span>
          )}
          {resourceStepEnabled && canLoadResources && onLoadResources ? (
            <Button
              variant="outline"
              size="1"
              onClick={() => {
                void onLoadResources();
              }}
              disabled={resourceLoading}
            >
              <Eye className="mr-2 h-4 w-4" />
              {resourcesLoaded
                ? t("common.refresh", { defaultValue: "刷新" })
                : loadLabel || t("cloud.view", "View")}
            </Button>
          ) : null}
          {canCreate && onCreate ? (
            <Button
              size="1"
              onClick={() => {
                void onCreate();
              }}
              disabled={createLoading}
              aria-busy={createLoading}
            >
              {createLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {createLabel || t("common.create", "Create")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
