import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";
import { Server } from "lucide-react";

import {
  EC2CreateBootstrapSection,
  EC2CreateCoreSection,
} from "@/components/admin/cloud/AWSEC2CreateSections";
import {
  LightsailCreateBootstrapSection,
  LightsailCreateCoreSection,
} from "@/components/admin/cloud/AWSLightsailCreateSections";
import { CompactSummaryMetric } from "@/components/admin/cloud/AWSPanelDetailComponents";
import {
  Badge,
  Button,
  CloudSensitiveDialogContent,
  Dialog,
} from "@/components/admin/cloud/cloud-ui";
import { WarningAlert } from "@/components/ui/warning-alert";
import {
  getAWSRegionOptionLabel,
  getStaticLightsailBundlePresetLabel,
  type AWSRegionOption,
  type StaticLightsailBlueprintPreset,
  type StaticLightsailBundlePreset,
} from "./awsPanelCatalog";
import type {
  CreateFormState,
  LightsailCreateFormState,
} from "./awsPanelState";

type MaybePromise<T> = T | Promise<T>;

type AWSEC2CreateDialogProps = {
  t: TFunction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CreateFormState;
  setForm: Dispatch<SetStateAction<CreateFormState>>;
  submitting: boolean;
  resolvedRegion: string;
  selectedRegionOption: AWSRegionOption | null;
  imageLabel: string;
  instanceTypeLabel: string;
  coreSummary: string;
  bootstrapSummary: string;
  architectureMismatch: boolean;
  selectedImageArchitecture: string;
  selectedInstanceArchitecture: string;
  regionOptions: AWSRegionOption[];
  regionSearchPlaceholder: string;
  regionSearchEmpty: string;
  onRegionChange: (region: string) => void;
  onCreate: () => MaybePromise<void>;
};

export function AWSEC2CreateDialog({
  t,
  open,
  onOpenChange,
  form,
  setForm,
  submitting,
  resolvedRegion,
  selectedRegionOption,
  imageLabel,
  instanceTypeLabel,
  coreSummary,
  bootstrapSummary,
  architectureMismatch,
  selectedImageArchitecture,
  selectedInstanceArchitecture,
  regionOptions,
  regionSearchPlaceholder,
  regionSearchEmpty,
  onRegionChange,
  onCreate,
}: AWSEC2CreateDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <CloudSensitiveDialogContent
        title={t("cloud.providers.aws.create", "Launch EC2")}
        description={t(
            "cloud.providers.aws.create_description",
            "Launch a single EC2 instance in the region selected for this dialog. Leave subnet empty to let kelicloud use the default VPC and default subnet automatically. If the account is missing them, kelicloud will try to create or repair the default network during launch.",
          )}
        icon={<Server className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.aws.ec2_label", "AWS EC2")}</Badge>}
        className="sm:max-w-5xl"
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("common.cancel", "取消")}
            </Button>
            <Button
              onClick={() => {
                void onCreate();
              }}
              disabled={
                submitting ||
                !form.image_id ||
                !form.instance_type ||
                (form.root_password_mode === "custom" && !(form.root_password || "").trim()) ||
                architectureMismatch
              }
            >
              {submitting
                ? t("cloud.creating", "创建中...")
                : t("cloud.providers.aws.create", "Launch EC2")}
            </Button>
          </>
        }
      >

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
            {t(
              "cloud.providers.aws.create_static_presets_help",
              "This EC2 dialog uses built-in static presets instead of loading AWS catalogs. Regions, sizes, and image presets are built in. Key pair, subnet, and security groups are optional advanced overrides, and leaving subnet empty lets kelicloud prepare the default AWS network automatically.",
            )}
          </div>

          <section className="pt-0">
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <CompactSummaryMetric
                label={t("cloud.providers.aws.region", "Region")}
                value={selectedRegionOption ? getAWSRegionOptionLabel(selectedRegionOption) : resolvedRegion || "-"}
              />
              <CompactSummaryMetric
                label={t("cloud.table.image", "Image")}
                value={imageLabel || "-"}
              />
              <CompactSummaryMetric
                label={t("cloud.table.size", "Size")}
                value={instanceTypeLabel || "-"}
              />
            </div>
          </section>

          {architectureMismatch ? (
            <WarningAlert
              tone="warning"
              description={t("cloud.providers.aws.ec2_architecture_mismatch", {
                imageArch: selectedImageArchitecture,
                instanceType: form.instance_type,
                typeArch: selectedInstanceArchitecture,
                defaultValue: `The selected image expects ${selectedImageArchitecture}, but ${form.instance_type} is ${selectedInstanceArchitecture}. Use an ARM64 image with Graviton families like t4g/m7g/c7g/r7g, and use x86_64 images with t3/m7i/c7i/r7i families.`,
              })}
            />
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              {t(
                "cloud.providers.aws.ec2_static_rules_help",
                "Built-in type presets only cover common families. T3 / M7i / C7i / R7i are x86_64. T4g / M7g / C7g / R7g are Graviton ARM64. The built-in image presets use AWS public parameters, so they can stay current without loading a catalog.",
              )}
            </div>
          )}

          <EC2CreateCoreSection
            t={t}
            form={form}
            setForm={setForm}
            summary={coreSummary}
            resolvedRegion={resolvedRegion}
            regionOptions={regionOptions}
            regionSearchPlaceholder={regionSearchPlaceholder}
            regionSearchEmpty={regionSearchEmpty}
            onRegionChange={onRegionChange}
          />

          <EC2CreateBootstrapSection
            t={t}
            form={form}
            setForm={setForm}
            summary={bootstrapSummary}
          />

        </div>
      </CloudSensitiveDialogContent>
    </Dialog.Root>
  );
}

type AWSLightsailCreateDialogProps = {
  t: TFunction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: LightsailCreateFormState;
  setForm: Dispatch<SetStateAction<LightsailCreateFormState>>;
  submitting: boolean;
  resolvedRegion: string;
  selectedRegionOption: AWSRegionOption | null;
  selectedBlueprintPreset: StaticLightsailBlueprintPreset | null;
  selectedBundlePreset: StaticLightsailBundlePreset | null;
  coreSummary: string;
  bootstrapSummary: string;
  platformMismatch: boolean;
  regionOptions: AWSRegionOption[];
  regionSearchPlaceholder: string;
  regionSearchEmpty: string;
  onRegionChange: (region: string) => void;
  onCreate: () => MaybePromise<void>;
};

export function AWSLightsailCreateDialog({
  t,
  open,
  onOpenChange,
  form,
  setForm,
  submitting,
  resolvedRegion,
  selectedRegionOption,
  selectedBlueprintPreset,
  selectedBundlePreset,
  coreSummary,
  bootstrapSummary,
  platformMismatch,
  regionOptions,
  regionSearchPlaceholder,
  regionSearchEmpty,
  onRegionChange,
  onCreate,
}: AWSLightsailCreateDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <CloudSensitiveDialogContent
        title={t("cloud.providers.aws.lightsail_create", "Create Lightsail")}
        description={t(
            "cloud.providers.aws.lightsail_create_description",
            "Create a Lightsail instance with built-in blueprint and bundle presets without loading the AWS catalog.",
          )}
        icon={<Server className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.aws.lightsail_label", "AWS Lightsail")}</Badge>}
        className="sm:max-w-5xl"
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("common.cancel", "取消")}
            </Button>
            <Button
              onClick={() => {
                void onCreate();
              }}
              disabled={
                submitting ||
                !form.availability_zone ||
                !form.blueprint_id ||
                !form.bundle_id ||
                platformMismatch ||
                (form.root_password_mode === "custom" && !(form.root_password || "").trim())
              }
            >
              {submitting
                ? t("cloud.creating", "创建中...")
                : t("cloud.providers.aws.lightsail_create", "Create Lightsail")}
            </Button>
          </>
        }
      >

        <div className="flex flex-col gap-4">
          <WarningAlert
            tone="info"
            description={t(
              "cloud.providers.aws.lightsail_static_presets_help",
              "This Lightsail dialog uses built-in static presets instead of loading the AWS catalog. The availability zone defaults to region + a, and blueprint and bundle are selected from common presets.",
            )}
          />
          <section className="pt-0">
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <CompactSummaryMetric
                label={t("cloud.providers.aws.region", "Region")}
                value={selectedRegionOption ? getAWSRegionOptionLabel(selectedRegionOption) : resolvedRegion || "-"}
              />
              <CompactSummaryMetric
                label={t("cloud.providers.aws.az", "AZ")}
                value={form.availability_zone || "-"}
              />
              <CompactSummaryMetric
                label={t("cloud.table.image", "Image")}
                value={selectedBlueprintPreset ? selectedBlueprintPreset.label : form.blueprint_id || "-"}
              />
              <CompactSummaryMetric
                label={t("cloud.table.size", "Size")}
                value={selectedBundlePreset ? getStaticLightsailBundlePresetLabel(selectedBundlePreset) : form.bundle_id || "-"}
              />
            </div>
          </section>

          <LightsailCreateCoreSection
            t={t}
            form={form}
            setForm={setForm}
            summary={coreSummary}
            resolvedRegion={resolvedRegion}
            regionOptions={regionOptions}
            regionSearchPlaceholder={regionSearchPlaceholder}
            regionSearchEmpty={regionSearchEmpty}
            onRegionChange={onRegionChange}
            selectedBlueprintPreset={selectedBlueprintPreset}
            selectedBundlePreset={selectedBundlePreset}
            platformMismatch={platformMismatch}
          />

          <LightsailCreateBootstrapSection
            t={t}
            form={form}
            setForm={setForm}
            summary={bootstrapSummary}
          />

        </div>
      </CloudSensitiveDialogContent>
    </Dialog.Root>
  );
}
