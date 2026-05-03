import React from "react";
import { toast } from "sonner";

import {
  getAWSInstancePassword,
  getAWSLightsailInstancePassword,
  type AWSInstance,
  type AWSLightsailInstance,
} from "@/lib/cloudAws";
import type { SavedPasswordState } from "./awsPanelState";
import { toErrorMessage } from "./awsPanelUtils";

export function useAWSResourcePasswords() {
  const [savedPassword, setSavedPassword] = React.useState<SavedPasswordState | null>(null);
  const [passwordLoading, setPasswordLoading] = React.useState(false);

  const handleViewInstancePassword = async (instance: AWSInstance) => {
    setPasswordLoading(true);
    try {
      const credential = await getAWSInstancePassword(instance.instance_id);
      setSavedPassword({
        resourceKind: "ec2",
        resourceName: instance.name || instance.instance_id,
        credential,
      });
    } catch (viewError) {
      toast.error(toErrorMessage(viewError));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleViewLightsailPassword = async (instance: AWSLightsailInstance) => {
    setPasswordLoading(true);
    try {
      const credential = await getAWSLightsailInstancePassword(instance.name);
      setSavedPassword({
        resourceKind: "lightsail",
        resourceName: instance.name,
        credential,
      });
    } catch (viewError) {
      toast.error(toErrorMessage(viewError));
    } finally {
      setPasswordLoading(false);
    }
  };

  return {
    savedPassword,
    setSavedPassword,
    passwordLoading,
    handleViewInstancePassword,
    handleViewLightsailPassword,
  };
}
