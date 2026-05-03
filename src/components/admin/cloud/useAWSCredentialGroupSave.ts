import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  saveAWSCredentials,
  type AWSCredentialPool,
  type AWSCredentialRecord,
} from "@/lib/cloudAws";
import { toErrorMessage } from "./awsPanelUtils";

type UseAWSCredentialGroupSaveOptions = {
  t: TFunction;
  credentialPool: AWSCredentialPool | null;
  setCredentialPool: React.Dispatch<React.SetStateAction<AWSCredentialPool | null>>;
  credentialRows: AWSCredentialRecord[];
  credentialGroupEditorIds: string[];
  setCredentialGroupEditorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  credentialGroupEditorValue: string;
  setCredentialGroupEditorValue: React.Dispatch<React.SetStateAction<string>>;
  setCredentialGroupEditorIds: React.Dispatch<React.SetStateAction<string[]>>;
};

export function useAWSCredentialGroupSave({
  t,
  credentialPool,
  setCredentialPool,
  credentialRows,
  credentialGroupEditorIds,
  setCredentialGroupEditorOpen,
  credentialGroupEditorValue,
  setCredentialGroupEditorValue,
  setCredentialGroupEditorIds,
}: UseAWSCredentialGroupSaveOptions) {
  const [credentialGroupSaving, setCredentialGroupSaving] = React.useState(false);

  const handleSaveCredentialGroup = async () => {
    if (!credentialGroupEditorIds.length || !credentialPool) {
      return;
    }

    const updates = credentialRows
      .filter((credential) => credentialGroupEditorIds.includes(credential.id))
      .map((credential) => ({
        id: credential.id,
        name: credential.name,
        group: credentialGroupEditorValue.trim(),
        access_key_id: "",
        secret_access_key: "",
        session_token: "",
        default_region: credential.default_region,
      }));

    if (!updates.length) {
      setCredentialGroupEditorOpen(false);
      return;
    }

    setCredentialGroupSaving(true);
    try {
      const nextPool = await saveAWSCredentials({
        credentials: updates,
        active_credential_id: credentialPool.active_credential_id || undefined,
        active_region: credentialPool.active_region || undefined,
      });
      setCredentialPool(nextPool);
      setCredentialGroupEditorOpen(false);
      setCredentialGroupEditorIds([]);
      setCredentialGroupEditorValue("");
      toast.success(t("cloud.tokens.group_save_success", "Token group updated"));
    } catch (saveError) {
      toast.error(toErrorMessage(saveError));
    } finally {
      setCredentialGroupSaving(false);
    }
  };

  return {
    credentialGroupSaving,
    handleSaveCredentialGroup,
  };
}
