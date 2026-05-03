import React from "react";
import type { TFunction } from "i18next";

import type { CloudInstanceShareTarget } from "@/components/admin/cloud/CloudInstanceShareDialog";
import type { CloudInstanceScriptTarget } from "@/components/admin/cloud/CloudInstanceScriptDialog";
import type {
  AWSInstance,
  AWSLightsailInstance,
} from "@/lib/cloudAws";
import {
  buildAWSEC2ScriptTarget,
  buildAWSEC2ShareTarget,
  buildAWSLightsailScriptTarget,
  buildAWSLightsailShareTarget,
} from "./awsPanelTargets";

type UseAWSInstanceTargetActionsOptions = {
  t: TFunction;
  activeCredentialName: string;
  activeRegion: string;
  passwordStorageEnabled: boolean;
  openShareDialog: (target: CloudInstanceShareTarget) => Promise<void>;
};

export function useAWSInstanceTargetActions({
  t,
  activeCredentialName,
  activeRegion,
  passwordStorageEnabled,
  openShareDialog,
}: UseAWSInstanceTargetActionsOptions) {
  const [scriptTarget, setScriptTarget] = React.useState<CloudInstanceScriptTarget | null>(null);

  const openEC2ScriptDialog = React.useCallback(
    (instance: AWSInstance) => {
      setScriptTarget(
        buildAWSEC2ScriptTarget(
          instance,
          t("cloud.providers.aws.ec2_label", "AWS EC2"),
          activeCredentialName,
        ),
      );
    },
    [activeCredentialName, t],
  );

  const openLightsailScriptDialog = React.useCallback(
    (instance: AWSLightsailInstance) => {
      setScriptTarget(
        buildAWSLightsailScriptTarget(
          instance,
          t("cloud.providers.aws.lightsail_label", "AWS Lightsail"),
          activeCredentialName,
        ),
      );
    },
    [activeCredentialName, t],
  );

  const openEC2ShareDialog = React.useCallback(
    (instance: AWSInstance) =>
      openShareDialog(
        buildAWSEC2ShareTarget({
          instance,
          providerLabel: t("cloud.providers.aws.ec2_label", "AWS EC2"),
          credentialName: activeCredentialName,
          region: activeRegion,
          passwordStorageEnabled,
        }),
      ),
    [activeCredentialName, activeRegion, openShareDialog, passwordStorageEnabled, t],
  );

  const openLightsailShareDialog = React.useCallback(
    (instance: AWSLightsailInstance) =>
      openShareDialog(
        buildAWSLightsailShareTarget({
          instance,
          providerLabel: t("cloud.providers.aws.lightsail_label", "AWS Lightsail"),
          credentialName: activeCredentialName,
          region: activeRegion,
          passwordStorageEnabled,
        }),
      ),
    [activeCredentialName, activeRegion, openShareDialog, passwordStorageEnabled, t],
  );

  return {
    scriptTarget,
    setScriptTarget,
    openEC2ScriptDialog,
    openLightsailScriptDialog,
    openEC2ShareDialog,
    openLightsailShareDialog,
  };
}
