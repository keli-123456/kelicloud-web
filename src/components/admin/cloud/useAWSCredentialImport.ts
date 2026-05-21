import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  saveAWSCredentials,
  type AWSCredentialPool,
} from "@/lib/cloudAws";
import {
  parseCredentialImports,
  toErrorMessage,
} from "./awsPanelUtils";

type UseAWSCredentialImportOptions = {
  t: TFunction;
  credentialPool: AWSCredentialPool | null;
  setCredentialPool: React.Dispatch<React.SetStateAction<AWSCredentialPool | null>>;
  clearPanelState: () => void;
};

export function useAWSCredentialImport({
  t,
  credentialPool,
  setCredentialPool,
  clearPanelState,
}: UseAWSCredentialImportOptions) {
  const [credentialImportOpen, setCredentialImportOpen] = React.useState(false);
  const [credentialImportText, setCredentialImportText] = React.useState("");
  const [credentialImportGroup, setCredentialImportGroup] = React.useState("");
  const [credentialImportSaving, setCredentialImportSaving] = React.useState(false);

  const handleImportCredentials = async () => {
    const importGroup = credentialImportGroup.trim();
    const credentials = parseCredentialImports(credentialImportText).map((credential) => ({
      ...credential,
      group: importGroup,
    }));
    if (!credentials.length) {
      toast.error(t("cloud.providers.aws.import_empty", "没有找到有效凭证"));
      return;
    }

    setCredentialImportSaving(true);
    try {
      const nextPool = await saveAWSCredentials({
        credentials,
        active_credential_id: credentialPool?.active_credential_id || undefined,
        active_region: credentialPool?.active_region || undefined,
      });
      setCredentialPool(nextPool);
      setCredentialImportText("");
      setCredentialImportGroup("");
      setCredentialImportOpen(false);
      toast.success(
        t("cloud.providers.aws.import_success", {
          count: credentials.length,
          defaultValue: `已导入 ${credentials.length} 个凭证`,
        }),
      );
      clearPanelState();
    } catch (saveError) {
      toast.error(toErrorMessage(saveError));
    } finally {
      setCredentialImportSaving(false);
    }
  };

  return {
    credentialImportOpen,
    setCredentialImportOpen,
    credentialImportText,
    setCredentialImportText,
    credentialImportGroup,
    setCredentialImportGroup,
    credentialImportSaving,
    handleImportCredentials,
  };
}
