import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  createAWSInstance,
  type AWSCredentialRecord,
  type AWSInstance,
} from "@/lib/cloudAws";
import {
  DEFAULT_STATIC_EC2_IMAGE_ID,
  DEFAULT_STATIC_EC2_INSTANCE_TYPE,
  type AWSRegionOption,
} from "./awsPanelCatalog";
import { getAWSEC2CreateDerived } from "./awsPanelDerived";
import { buildCreateAWSInstancePayload } from "./awsPanelPayloads";
import {
  buildCreatedPasswordState,
  initialCreateForm,
  type CreatedPasswordState,
} from "./awsPanelState";
import { getCreateFollowUpWarningMessage } from "./awsPanelSummaries";
import {
  DEFAULT_AWS_REGION,
  getDefaultAutoConnectGroup,
  toErrorMessage,
} from "./awsPanelUtils";

type UseAWSEC2CreateInstanceOptions = {
  t: TFunction;
  activeCredential: AWSCredentialRecord | null;
  activeCredentialName: string;
  activeRegion: string;
  activeContextReady: boolean;
  resourcesLoaded: boolean;
  regionOptions: AWSRegionOption[];
  setInstances: React.Dispatch<React.SetStateAction<AWSInstance[]>>;
  setCreatedPassword: React.Dispatch<React.SetStateAction<CreatedPasswordState | null>>;
  loadBackgroundTasks: (showError?: boolean, showLoading?: boolean) => Promise<unknown>;
};

export function useAWSEC2CreateInstance({
  t,
  activeCredential,
  activeCredentialName,
  activeRegion,
  activeContextReady,
  resourcesLoaded,
  regionOptions,
  setInstances,
  setCreatedPassword,
  loadBackgroundTasks,
}: UseAWSEC2CreateInstanceOptions) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createRegion, setCreateRegion] = React.useState("");
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [createForm, setCreateForm] = React.useState(initialCreateForm);

  const defaultCreateGroup = getDefaultAutoConnectGroup("aws", activeCredentialName);
  const resolvedCreateRegion = createRegion || activeRegion || activeCredential?.default_region || DEFAULT_AWS_REGION;
  const selectedCreateRegionOption = regionOptions.find((region) => region.name === resolvedCreateRegion) || null;

  const {
    selectedImagePreset,
    selectedInstanceTypePreset,
    selectedImageArchitecture,
    selectedInstanceArchitecture,
    architectureMismatch: ec2ArchitectureMismatch,
    coreSummary: ec2CoreSummary,
    networkSummary: ec2NetworkSummary,
    bootstrapSummary: ec2BootstrapSummary,
  } = React.useMemo(() => getAWSEC2CreateDerived(createForm, t), [createForm, t]);

  React.useEffect(() => {
    setCreateOpen(false);
    setCreateRegion("");
    setCreateForm({
      ...initialCreateForm,
      image_id: DEFAULT_STATIC_EC2_IMAGE_ID,
      instance_type: DEFAULT_STATIC_EC2_INSTANCE_TYPE,
      auto_connect: true,
      auto_connect_group: getDefaultAutoConnectGroup("aws", activeCredentialName),
    });
  }, [activeCredential?.default_region, activeCredential?.id, activeCredentialName]);

  const handleCreateDialogRegionChange = (region: string) => {
    setCreateRegion(region);
    setCreateForm((previous) => ({
      ...previous,
      key_name: "",
      subnet_id: "",
      security_group_ids: [],
    }));
  };

  const handleCreateInstance = async () => {
    setCreateSubmitting(true);
    try {
      const submittedPasswordMode = createForm.root_password_mode || "none";
      const payload = buildCreateAWSInstancePayload(createForm, resolvedCreateRegion, defaultCreateGroup);
      const result = await createAWSInstance(payload);
      const createdInstance = {
        ...result.instance,
        saved_root_password: result.instance.saved_root_password || result.password_saved,
        saved_root_password_updated_at:
          result.instance.saved_root_password_updated_at || (result.password_saved ? new Date().toISOString() : ""),
      };
      toast.success(t("cloud.providers.aws.create_success", "EC2 instance launch submitted"));
      if (result.warning) {
        toast.warning(getCreateFollowUpWarningMessage(t, result.warning));
        await loadBackgroundTasks(false);
      }
      setCreateOpen(false);
      const createdPasswordState = buildCreatedPasswordState({
        resourceName: createdInstance.name || createdInstance.instance_id || "",
        submittedPasswordMode,
        customPassword: createForm.root_password || "",
        generatedPassword: result.generated_password,
        resourceKind: "ec2",
        passwordSaved: result.password_saved,
        passwordSaveError: result.password_save_error,
      });
      if (createdPasswordState) {
        setCreatedPassword(createdPasswordState);
      }
      setCreateForm((previous) => ({
        ...initialCreateForm,
        image_id: previous.image_id,
        instance_type: previous.instance_type,
        key_name: "",
        subnet_id: "",
        security_group_ids: [],
        auto_connect: true,
        auto_connect_group: defaultCreateGroup,
      }));
      if (activeContextReady && resolvedCreateRegion === activeRegion && resourcesLoaded) {
        setInstances((previous) => {
          const withoutCurrent = previous.filter((instance) => instance.instance_id !== createdInstance.instance_id);
          return [createdInstance, ...withoutCurrent];
        });
      }
    } catch (createError) {
      toast.error(toErrorMessage(createError));
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenCreateDialog = async () => {
    if (!activeCredential) {
      return;
    }
    const nextRegion = activeRegion || activeCredential?.default_region || DEFAULT_AWS_REGION;
    setCreateRegion(nextRegion);
    setCreateForm((previous) => ({
      ...previous,
      image_id: previous.image_id || DEFAULT_STATIC_EC2_IMAGE_ID,
      instance_type: previous.instance_type || DEFAULT_STATIC_EC2_INSTANCE_TYPE,
      auto_connect: true,
      auto_connect_group: defaultCreateGroup,
    }));
    setCreateOpen(true);
  };

  return {
    createOpen,
    setCreateOpen,
    createForm,
    setCreateForm,
    createSubmitting,
    resolvedCreateRegion,
    selectedCreateRegionOption,
    selectedImagePreset,
    selectedInstanceTypePreset,
    selectedImageArchitecture,
    selectedInstanceArchitecture,
    ec2ArchitectureMismatch,
    ec2CoreSummary,
    ec2NetworkSummary,
    ec2BootstrapSummary,
    handleCreateDialogRegionChange,
    handleCreateInstance,
    handleOpenCreateDialog,
  };
}
