import React from "react";

import type {
  AWSCredentialPool,
  AWSCredentialRecord,
} from "@/lib/cloudAws";

export function useAWSCredentialSelection(credentialPool: AWSCredentialPool | null) {
  const [selectedCredentialIds, setSelectedCredentialIds] = React.useState<string[]>([]);
  const [credentialGroupEditorOpen, setCredentialGroupEditorOpen] = React.useState(false);
  const [credentialGroupEditorValue, setCredentialGroupEditorValue] = React.useState("");
  const [credentialGroupEditorIds, setCredentialGroupEditorIds] = React.useState<string[]>([]);

  const credentialRows = credentialPool?.credentials ?? [];
  const selectedCredentials = credentialRows.filter((credential) => selectedCredentialIds.includes(credential.id));
  const allCredentialsSelected =
    credentialRows.length > 0 && selectedCredentialIds.length === credentialRows.length;
  const someCredentialsSelected =
    selectedCredentialIds.length > 0 && selectedCredentialIds.length < credentialRows.length;

  React.useEffect(() => {
    setSelectedCredentialIds((current) => {
      if (current.length === 0) {
        return current;
      }

      const validIds = new Set((credentialPool?.credentials ?? []).map((credential) => credential.id));
      const next = current.filter((id) => validIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [credentialPool]);

  const removeCredentialSelection = React.useCallback((removedCredentialIds: string[]) => {
    setSelectedCredentialIds((current) => current.filter((id) => !removedCredentialIds.includes(id)));
  }, []);

  const handleSelectAllCredentials = (checked: boolean) => {
    setSelectedCredentialIds(checked ? credentialRows.map((credential) => credential.id) : []);
  };

  const toggleCredentialSelection = (credentialId: string, checked: boolean) => {
    setSelectedCredentialIds((current) => {
      if (checked) {
        return current.includes(credentialId) ? current : [...current, credentialId];
      }
      return current.filter((id) => id !== credentialId);
    });
  };

  const openCredentialGroupEditor = (credentials: AWSCredentialRecord[]) => {
    if (!credentials.length) {
      return;
    }
    const groups = Array.from(new Set(credentials.map((credential) => credential.group.trim())));
    setCredentialGroupEditorIds(credentials.map((credential) => credential.id));
    setCredentialGroupEditorValue(groups.length === 1 ? groups[0] : "");
    setCredentialGroupEditorOpen(true);
  };

  const openSelectedCredentialGroupEditor = () => {
    openCredentialGroupEditor(selectedCredentials);
  };

  return {
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
  };
}
