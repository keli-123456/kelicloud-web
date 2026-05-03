import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  createLinodeInstance,
  getLinodeCatalog,
  type CreateLinodeInstanceInput,
  type LinodeCatalog,
  type LinodeTokenRecord,
} from "@/lib/cloudLinode";
import {
  getCreateRootPasswordMode,
  initialCreateForm,
  parseTags,
  toErrorMessage,
  type CreatedPasswordState,
  type CreateFormState,
} from "./linodePanelUtils";

type UseLinodeCreateInstanceOptions = {
  t: TFunction;
  catalog: LinodeCatalog | null;
  setCatalog: React.Dispatch<React.SetStateAction<LinodeCatalog | null>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  activeToken: LinodeTokenRecord | null;
  defaultCreateGroup: string;
  setCreatedPassword: React.Dispatch<React.SetStateAction<CreatedPasswordState | null>>;
  loadPanelData: () => Promise<void>;
};

export function useLinodeCreateInstance({
  t,
  catalog,
  setCatalog,
  setError,
  activeToken,
  defaultCreateGroup,
  setCreatedPassword,
  loadPanelData,
}: UseLinodeCreateInstanceOptions) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [createCatalogLoading, setCreateCatalogLoading] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateFormState>(initialCreateForm);

  React.useEffect(() => {
    if (!catalog) return;
    setCreateForm((previous) => ({
      ...previous,
      region: previous.region || catalog.regions[0]?.id || "",
      type: previous.type || catalog.types[0]?.id || "",
      image: previous.image || catalog.images[0]?.id || "",
    }));
  }, [catalog]);

  const ensureCreateCatalogLoaded = React.useCallback(async () => {
    if (catalog) {
      return catalog;
    }

    setCreateCatalogLoading(true);
    try {
      const nextCatalog = await getLinodeCatalog();
      setCatalog(nextCatalog);
      setError("");
      return nextCatalog;
    } catch (catalogError) {
      toast.error(toErrorMessage(catalogError));
      return null;
    } finally {
      setCreateCatalogLoading(false);
    }
  }, [catalog, setCatalog, setError]);

  const handleCreateInstance = async () => {
    setCreateSubmitting(true);
    try {
      const passwordMode = getCreateRootPasswordMode(createForm.root_password);
      const payload: CreateLinodeInstanceInput = {
        label: createForm.label,
        region: createForm.region,
        type: createForm.type,
        image: createForm.image,
        authorized_keys: createForm.authorized_keys,
        backups_enabled: createForm.backups_enabled,
        booted: createForm.booted,
        tags: parseTags(createForm.tagsText),
        user_data: createForm.user_data,
        root_password_mode: passwordMode,
        root_password: createForm.root_password,
        auto_connect: true,
        auto_connect_group: createForm.auto_connect_group || defaultCreateGroup,
      };
      const result = await createLinodeInstance(payload);
      toast.success(t("cloud.providers.linode.create_success", "Linode instance created"));
      setCreateOpen(false);
      setCreatedPassword({
        instance: result.instance,
        rootPassword:
          passwordMode === "random"
            ? result.generated_password
            : createForm.root_password,
        passwordMode,
        passwordSaved: result.password_saved,
        passwordSaveError: result.password_save_error,
      });
      if (result.password_save_error) {
        toast.error(result.password_save_error);
      }
      setCreateForm((previous) => ({
        ...initialCreateForm,
        region: previous.region,
        type: previous.type,
        image: previous.image,
        auto_connect: true,
        auto_connect_group: defaultCreateGroup,
      }));
      await loadPanelData();
    } catch (createError) {
      toast.error(toErrorMessage(createError));
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenCreateDialog = async () => {
    if (!activeToken) {
      return;
    }
    setCreateForm((previous) => ({
      ...previous,
      auto_connect: true,
      auto_connect_group: defaultCreateGroup,
    }));
    const nextCatalog = await ensureCreateCatalogLoaded();
    if (!nextCatalog) {
      return;
    }
    setCreateOpen(true);
  };

  return {
    createOpen,
    setCreateOpen,
    createSubmitting,
    createCatalogLoading,
    createForm,
    setCreateForm,
    handleCreateInstance,
    handleOpenCreateDialog,
  };
}
