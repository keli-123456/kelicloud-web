import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  saveAzureCredentials,
  type AzureCredentialPool,
} from "@/lib/cloudAzure";
import {
  hasActiveCredential,
  parseCredentialImports,
  toErrorMessage,
} from "./azurePanelUtils";

type UseAzureCredentialImportOptions = {
  t: TFunction;
  setCredentialPool: React.Dispatch<React.SetStateAction<AzureCredentialPool | null>>;
  loadAll: () => Promise<void>;
  clearResourceData: () => void;
};

export function useAzureCredentialImport({
  t,
  setCredentialPool,
  loadAll,
  clearResourceData,
}: UseAzureCredentialImportOptions) {
  const [credentialImportOpen, setCredentialImportOpen] = React.useState(false);
  const [credentialImportText, setCredentialImportText] = React.useState("");
  const [credentialImportGroup, setCredentialImportGroup] = React.useState("");
  const [savingCredentials, setSavingCredentials] = React.useState(false);

  const handleImportCredentials = async () => {
    const importGroup = credentialImportGroup.trim();
    const credentials = parseCredentialImports(credentialImportText).map((credential) => ({
      ...credential,
      group: importGroup || credential.group || "",
    }));
    if (!credentials.length) {
      toast.error(t("cloud.providers.azure.import_empty", "No valid Azure credentials found"));
      return;
    }

    setSavingCredentials(true);
    try {
      const nextPool = await saveAzureCredentials({ credentials });
      setCredentialPool(nextPool);
      setCredentialImportText("");
      setCredentialImportGroup("");
      setCredentialImportOpen(false);
      toast.success(
        t("cloud.providers.azure.import_success", {
          count: credentials.length,
          defaultValue: `Imported ${credentials.length} Azure credentials`,
        }),
      );
      if (hasActiveCredential(nextPool)) {
        await loadAll();
      } else {
        clearResourceData();
      }
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setSavingCredentials(false);
    }
  };

  return {
    credentialImportOpen,
    setCredentialImportOpen,
    credentialImportText,
    setCredentialImportText,
    credentialImportGroup,
    setCredentialImportGroup,
    savingCredentials,
    handleImportCredentials,
  };
}
