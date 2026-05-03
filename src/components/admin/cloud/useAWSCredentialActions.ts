import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";

import type { ConfirmDialogOptions } from "@/components/ui/warning-dialog";
import {
  type AWSAccount,
  type AWSCredentialPool,
} from "@/lib/cloudAws";
import { useAWSCredentialActivation } from "./useAWSCredentialActivation";
import { useAWSCredentialDeletion } from "./useAWSCredentialDeletion";
import { useAWSCredentialGroupSave } from "./useAWSCredentialGroupSave";
import { useAWSCredentialHealth } from "./useAWSCredentialHealth";
import { useAWSCredentialImport } from "./useAWSCredentialImport";
import { useAWSCredentialSelection } from "./useAWSCredentialSelection";
import { useAWSCredentialSecret } from "./useAWSCredentialSecret";

type ConfirmDialog = (options: ConfirmDialogOptions) => Promise<boolean>;

type UseAWSCredentialActionsOptions = {
  t: TFunction;
  confirm: ConfirmDialog;
  credentialPool: AWSCredentialPool | null;
  setCredentialPool: Dispatch<SetStateAction<AWSCredentialPool | null>>;
  activeRegion: string;
  regionSelectionRequired: boolean;
  setRegionSelectionRequired: Dispatch<SetStateAction<boolean>>;
  resourcesLoaded: boolean;
  setAccount: Dispatch<SetStateAction<AWSAccount | null>>;
  clearPanelState: () => void;
  loadBackgroundTasks: (showError?: boolean, showLoading?: boolean) => Promise<unknown>;
};

export function useAWSCredentialActions({
  t,
  confirm,
  credentialPool,
  setCredentialPool,
  activeRegion,
  regionSelectionRequired,
  setRegionSelectionRequired,
  resourcesLoaded,
  setAccount,
  clearPanelState,
  loadBackgroundTasks,
}: UseAWSCredentialActionsOptions) {
  const {
    credentialImportOpen,
    setCredentialImportOpen,
    credentialImportText,
    setCredentialImportText,
    credentialImportGroup,
    setCredentialImportGroup,
    credentialImportSaving,
    handleImportCredentials,
  } = useAWSCredentialImport({
    t,
    credentialPool,
    setCredentialPool,
    clearPanelState,
  });
  const {
    credentialChecking,
    credentialCheckDialogOpen,
    setCredentialCheckDialogOpen,
    credentialCheckRegion,
    setCredentialCheckRegion,
    openCredentialCheckDialog,
    handleCheckCredentials,
    handleSubmitCredentialCheck,
    handleRegionChange,
  } = useAWSCredentialHealth({
    t,
    credentialPool,
    setCredentialPool,
    activeRegion,
    regionSelectionRequired,
    setRegionSelectionRequired,
    resourcesLoaded,
    setAccount,
    clearPanelState,
  });
  const {
    selectedCredentialIds,
    setSelectedCredentialIds,
    selectedCredentials,
    credentialRows,
    allCredentialsSelected,
    someCredentialsSelected,
    credentialGroupEditorOpen,
    setCredentialGroupEditorOpen,
    credentialGroupEditorValue,
    setCredentialGroupEditorValue,
    credentialGroupEditorIds,
    setCredentialGroupEditorIds,
    removeCredentialSelection,
    handleSelectAllCredentials,
    toggleCredentialSelection,
    openCredentialGroupEditor,
    openSelectedCredentialGroupEditor,
  } = useAWSCredentialSelection(credentialPool);
  const {
    credentialGroupSaving,
    handleSaveCredentialGroup,
  } = useAWSCredentialGroupSave({
    t,
    credentialPool,
    setCredentialPool,
    credentialRows,
    credentialGroupEditorIds,
    setCredentialGroupEditorOpen,
    credentialGroupEditorValue,
    setCredentialGroupEditorValue,
    setCredentialGroupEditorIds,
  });
  const {
    credentialSecret,
    setCredentialSecret,
    credentialSecretLoading,
    handleViewCredentialSecret,
  } = useAWSCredentialSecret();
  const {
    handleSelectCredential,
  } = useAWSCredentialActivation({
    t,
    setCredentialPool,
    setRegionSelectionRequired,
    clearPanelState,
  });
  const {
    handleDeleteCredential,
    handleDeleteSelectedCredentials,
  } = useAWSCredentialDeletion({
    t,
    confirm,
    selectedCredentials,
    setSelectedCredentialIds,
    setCredentialPool,
    setRegionSelectionRequired,
    removeCredentialSelection,
    clearPanelState,
    loadBackgroundTasks,
  });

  const credentialSaving = credentialImportSaving || credentialGroupSaving;

  return {
    credentialSaving,
    credentialChecking,
    credentialImportOpen,
    setCredentialImportOpen,
    credentialImportText,
    setCredentialImportText,
    credentialImportGroup,
    setCredentialImportGroup,
    credentialCheckDialogOpen,
    setCredentialCheckDialogOpen,
    credentialCheckRegion,
    setCredentialCheckRegion,
    credentialSecret,
    setCredentialSecret,
    credentialSecretLoading,
    selectedCredentialIds,
    selectedCredentials,
    credentialRows,
    allCredentialsSelected,
    someCredentialsSelected,
    credentialGroupEditorOpen,
    setCredentialGroupEditorOpen,
    credentialGroupEditorValue,
    setCredentialGroupEditorValue,
    credentialGroupEditorIds,
    handleSelectAllCredentials,
    toggleCredentialSelection,
    openCredentialGroupEditor,
    openSelectedCredentialGroupEditor,
    openCredentialCheckDialog,
    handleImportCredentials,
    handleSaveCredentialGroup,
    handleCheckCredentials,
    handleSubmitCredentialCheck,
    handleSelectCredential,
    handleDeleteCredential,
    handleDeleteSelectedCredentials,
    handleViewCredentialSecret,
    handleRegionChange,
  };
}
