import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import {
  CheckCircle2,
  Eye,
  KeyRound,
  Plus,
  RefreshCw,
  Server,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/admin/cloud/cloud-ui";
import { cn } from "@/lib/utils";

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

type CloudOnboardingStep = {
  key: string;
  done: boolean;
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
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
  const steps: CloudOnboardingStep[] = [
    {
      key: "credential",
      done: credentialDone,
      icon: KeyRound,
      title:
        credentialTitle ||
        t("cloud.onboarding.credential_title", "导入访问凭据"),
      description:
        credentialDescription ||
        t("cloud.onboarding.credential_description", {
          provider: providerName,
          defaultValue: "先添加 {{provider}} 凭据，再选择当前用于操作的账户。",
        }),
      action: !credentialDone ? (
        <Button size="1" onClick={onImportCredential}>
          <KeyRound className="mr-2 h-4 w-4" />
          {importLabel || t("cloud.credentials.import", "导入凭据")}
        </Button>
      ) : null,
    },
  ];

  if (resourceStepEnabled) {
    steps.push({
      key: "resource",
      done: resourcesLoaded,
      icon: Eye,
      title:
        resourceTitle ||
        t("cloud.onboarding.resource_title", "加载云资源"),
      description:
        resourceDescription ||
        t("cloud.onboarding.resource_description", {
          provider: providerName,
          defaultValue: "按需拉取 {{provider}} 资源，避免页面一打开就触发大量云 API 请求。",
        }),
      action: canLoadResources && !resourcesLoaded && onLoadResources ? (
        <Button
          variant="outline"
          size="1"
          onClick={() => {
            void onLoadResources();
          }}
          disabled={resourceLoading}
        >
          <Eye className="mr-2 h-4 w-4" />
          {loadLabel || t("cloud.view", "View")}
        </Button>
      ) : null,
    });
  }

  steps.push({
    key: "create",
    done: false,
    icon: Server,
    title:
      createTitle ||
      t("cloud.onboarding.create_title", "创建或管理实例"),
    description:
      createDescription ||
      t("cloud.onboarding.create_description", {
        provider: providerName,
        defaultValue: "资源加载后，可以创建实例，也可以直接在表格里执行生命周期操作。",
      }),
    action: canCreate && onCreate ? (
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
    ) : null,
  });

  return (
    <div className="rounded-lg border border-blue-200/70 bg-blue-50/50 p-4 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/20">
      <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-semibold text-blue-950 dark:text-blue-100">
            {title ||
              t("cloud.onboarding.provider_title", {
                provider: providerName,
                defaultValue: "{{provider}} 接入流程",
              })}
          </div>
          <div className="mt-1 text-sm leading-6 text-blue-800/80 dark:text-blue-200/75">
            {description ||
              t("cloud.onboarding.provider_description", {
                provider: providerName,
                defaultValue:
                  "按步骤完成凭据导入、资源加载和实例管理。凭据激活后，页面会从空状态进入真实资源管理。",
              })}
          </div>
        </div>
      </div>
      <div
        className={cn(
          "mt-4 grid gap-3",
          steps.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3",
        )}
      >
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.key}
              className="min-w-0 rounded-lg border border-white/80 bg-white/85 p-3 shadow-xs dark:border-blue-900/50 dark:bg-slate-950/60"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200">
                  {step.done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t("cloud.onboarding.step", {
                      count: index + 1,
                      defaultValue: "步骤 {{count}}",
                    })}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-950 dark:text-slate-50">
                    {step.title}
                  </div>
                  <div className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                    {step.description}
                  </div>
                  {step.action ? <div className="mt-3">{step.action}</div> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
