import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  createAWSLightsailInstance,
  type AWSCredentialRecord,
} from "@/lib/cloudAws";
import {
  DEFAULT_STATIC_LIGHTSAIL_BLUEPRINT_ID,
  DEFAULT_STATIC_LIGHTSAIL_BUNDLE_ID,
  getDefaultLightsailAvailabilityZone,
  isLightsailAvailabilityZoneForRegion,
  type AWSRegionOption,
} from "./awsPanelCatalog";
import { getAWSLightsailCreateDerived } from "./awsPanelDerived";
import { buildCreateAWSLightsailInstancePayload } from "./awsPanelPayloads";
import {
  buildCreatedPasswordState,
  initialLightsailCreateForm,
  type CreatedPasswordState,
} from "./awsPanelState";
import { getCreateFollowUpWarningMessage } from "./awsPanelSummaries";
import {
  DEFAULT_AWS_REGION,
  getDefaultAutoConnectGroup,
  toErrorMessage,
} from "./awsPanelUtils";

type UseAWSLightsailCreateInstanceOptions = {
  t: TFunction;
  activeCredential: AWSCredentialRecord | null;
  activeCredentialName: string;
  activeRegion: string;
  activeContextReady: boolean;
  resourcesLoaded: boolean;
  regionOptions: AWSRegionOption[];
  setCreatedPassword: React.Dispatch<React.SetStateAction<CreatedPasswordState | null>>;
  loadLightsailData: () => Promise<void>;
  loadBackgroundTasks: (showError?: boolean, showLoading?: boolean) => Promise<unknown>;
};

export function useAWSLightsailCreateInstance({
  t,
  activeCredential,
  activeCredentialName,
  activeRegion,
  activeContextReady,
  resourcesLoaded,
  regionOptions,
  setCreatedPassword,
  loadLightsailData,
  loadBackgroundTasks,
}: UseAWSLightsailCreateInstanceOptions) {
  const [lightsailCreateOpen, setLightsailCreateOpen] = React.useState(false);
  const [lightsailCreateRegion, setLightsailCreateRegion] = React.useState("");
  const [lightsailCreateSubmitting, setLightsailCreateSubmitting] = React.useState(false);
  const [lightsailCreateForm, setLightsailCreateForm] = React.useState(initialLightsailCreateForm);

  const defaultCreateGroup = getDefaultAutoConnectGroup("aws", activeCredentialName);
  const resolvedLightsailCreateRegion =
    lightsailCreateRegion || activeRegion || activeCredential?.default_region || DEFAULT_AWS_REGION;
  const selectedLightsailCreateRegionOption =
    regionOptions.find((region) => region.name === resolvedLightsailCreateRegion) || null;

  const {
    selectedBlueprintPreset: selectedLightsailBlueprintPreset,
    selectedBundlePreset: selectedLightsailBundlePreset,
    platformMismatch: lightsailPlatformMismatch,
    coreSummary: lightsailCoreSummary,
    accessSummary: lightsailAccessSummary,
    bootstrapSummary: lightsailBootstrapSummary,
  } = React.useMemo(
    () => getAWSLightsailCreateDerived(lightsailCreateForm, resolvedLightsailCreateRegion, t),
    [lightsailCreateForm, resolvedLightsailCreateRegion, t],
  );

  React.useEffect(() => {
    setLightsailCreateOpen(false);
    setLightsailCreateRegion("");
    setLightsailCreateForm({
      ...initialLightsailCreateForm,
      availability_zone: getDefaultLightsailAvailabilityZone(activeCredential?.default_region || DEFAULT_AWS_REGION),
      blueprint_id: DEFAULT_STATIC_LIGHTSAIL_BLUEPRINT_ID,
      bundle_id: DEFAULT_STATIC_LIGHTSAIL_BUNDLE_ID,
      auto_connect: true,
      auto_connect_group: getDefaultAutoConnectGroup("aws", activeCredentialName),
    });
  }, [activeCredential?.default_region, activeCredential?.id, activeCredentialName]);

  const handleLightsailDialogRegionChange = (region: string) => {
    setLightsailCreateRegion(region);
    setLightsailCreateForm((previous) => ({
      ...previous,
      availability_zone: getDefaultLightsailAvailabilityZone(region),
      key_pair_name: "",
    }));
  };

  const handleCreateLightsailInstance = async () => {
    setLightsailCreateSubmitting(true);
    try {
      const submittedPasswordMode = lightsailCreateForm.root_password_mode || "none";
      const payload = buildCreateAWSLightsailInstancePayload(
        lightsailCreateForm,
        resolvedLightsailCreateRegion,
        defaultCreateGroup,
      );
      const result = await createAWSLightsailInstance(payload);
      toast.success(t("cloud.providers.aws.lightsail_create_success", "Lightsail instance launch submitted"));
      if (result.warning) {
        toast.warning(getCreateFollowUpWarningMessage(t, result.warning));
        await loadBackgroundTasks(false);
      }
      setLightsailCreateOpen(false);
      const createdPasswordState = buildCreatedPasswordState({
        resourceName: result.name || "",
        submittedPasswordMode,
        customPassword: lightsailCreateForm.root_password || "",
        generatedPassword: result.generated_password,
        resourceKind: "lightsail",
        passwordSaved: result.password_saved,
        passwordSaveError: result.password_save_error,
      });
      if (createdPasswordState) {
        setCreatedPassword(createdPasswordState);
      }
      setLightsailCreateForm((previous) => ({
        ...initialLightsailCreateForm,
        availability_zone: previous.availability_zone,
        blueprint_id: previous.blueprint_id,
        bundle_id: previous.bundle_id,
        auto_connect: true,
        auto_connect_group: defaultCreateGroup,
      }));
      if (activeContextReady && resolvedLightsailCreateRegion === activeRegion && resourcesLoaded) {
        await loadLightsailData();
      }
    } catch (createError) {
      toast.error(toErrorMessage(createError));
    } finally {
      setLightsailCreateSubmitting(false);
    }
  };

  const handleOpenLightsailCreateDialog = () => {
    if (!activeCredential) {
      return;
    }
    const nextRegion = activeRegion || activeCredential?.default_region || DEFAULT_AWS_REGION;
    setLightsailCreateRegion(nextRegion);
    setLightsailCreateForm((previous) => ({
      ...previous,
      availability_zone: isLightsailAvailabilityZoneForRegion(previous.availability_zone, nextRegion)
        ? previous.availability_zone
        : getDefaultLightsailAvailabilityZone(nextRegion),
      blueprint_id: previous.blueprint_id || DEFAULT_STATIC_LIGHTSAIL_BLUEPRINT_ID,
      bundle_id: previous.bundle_id || DEFAULT_STATIC_LIGHTSAIL_BUNDLE_ID,
      auto_connect: true,
      auto_connect_group: defaultCreateGroup,
    }));
    setLightsailCreateOpen(true);
  };

  return {
    lightsailCreateOpen,
    setLightsailCreateOpen,
    lightsailCreateForm,
    setLightsailCreateForm,
    lightsailCreateSubmitting,
    resolvedLightsailCreateRegion,
    selectedLightsailCreateRegionOption,
    selectedLightsailBlueprintPreset,
    selectedLightsailBundlePreset,
    lightsailPlatformMismatch,
    lightsailCoreSummary,
    lightsailAccessSummary,
    lightsailBootstrapSummary,
    handleLightsailDialogRegionChange,
    handleCreateLightsailInstance,
    handleOpenLightsailCreateDialog,
  };
}
