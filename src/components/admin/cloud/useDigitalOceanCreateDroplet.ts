import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  createDigitalOceanDroplet,
  getDigitalOceanCatalog,
  type CreateDigitalOceanDropletInput,
  type DigitalOceanCatalog,
  type DigitalOceanTokenRecord,
} from "@/lib/cloud";
import {
  getCreateRootPasswordMode,
  getImageValue,
  initialCreateForm,
  parseTags,
  toErrorMessage,
  type CreateDropletFormState,
  type DropletAccessSecrets,
} from "./digitalOceanPanelUtils";

type UseDigitalOceanCreateDropletOptions = {
  t: TFunction;
  catalog: DigitalOceanCatalog | null;
  setCatalog: React.Dispatch<React.SetStateAction<DigitalOceanCatalog | null>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  activeToken: DigitalOceanTokenRecord | null;
  defaultCreateGroup: string;
  setAccessSecrets: React.Dispatch<React.SetStateAction<DropletAccessSecrets | null>>;
  loadPanelData: () => Promise<void>;
};

export function useDigitalOceanCreateDroplet({
  t,
  catalog,
  setCatalog,
  setError,
  activeToken,
  defaultCreateGroup,
  setAccessSecrets,
  loadPanelData,
}: UseDigitalOceanCreateDropletOptions) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [createCatalogLoading, setCreateCatalogLoading] = React.useState(false);
  const [createForm, setCreateForm] =
    React.useState<CreateDropletFormState>(initialCreateForm);

  React.useEffect(() => {
    if (!catalog) return;

    setCreateForm((previous) => ({
      ...previous,
      region:
        previous.region ||
        catalog.regions.find((region) => region.available)?.slug ||
        catalog.regions[0]?.slug ||
        "",
      size:
        previous.size ||
        catalog.sizes.find((size) => size.available)?.slug ||
        catalog.sizes[0]?.slug ||
        "",
      image:
        previous.image ||
        (catalog.images[0] ? getImageValue(catalog.images[0]) : "") ||
        "",
    }));
  }, [catalog]);

  const ensureCreateCatalogLoaded = React.useCallback(async () => {
    if (catalog) {
      return catalog;
    }

    setCreateCatalogLoading(true);
    try {
      const nextCatalog = await getDigitalOceanCatalog();
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

  const handleCreateDroplet = async () => {
    setCreateSubmitting(true);
    try {
      const passwordMode = getCreateRootPasswordMode(createForm.root_password);
      const payload: CreateDigitalOceanDropletInput = {
        name: createForm.name,
        region: createForm.region,
        size: createForm.size,
        image: createForm.image,
        backups: createForm.backups,
        ipv6: createForm.ipv6,
        monitoring: createForm.monitoring,
        tags: parseTags(createForm.tagsText),
        user_data: createForm.user_data,
        vpc_uuid: createForm.vpc_uuid,
        root_password_mode: passwordMode,
        root_password: createForm.root_password,
        auto_connect: true,
        auto_connect_group: createForm.auto_connect_group || defaultCreateGroup,
      };

      const result = await createDigitalOceanDroplet(payload);
      toast.success(t("cloud.create_success", "Droplet creation request submitted"));
      setCreateOpen(false);
      const rootPassword =
        passwordMode === "random" ? result.generated_password : createForm.root_password;
      setAccessSecrets({
        droplet: result.droplet,
        rootPassword,
        passwordMode,
        managedSSHKey: result.managed_ssh_key,
        passwordSaved: result.password_saved,
        passwordSaveError: result.password_save_error,
      });
      if (result.password_save_error) {
        toast.error(result.password_save_error);
      }
      setCreateForm((previous) => ({
        ...initialCreateForm,
        region: previous.region,
        size: previous.size,
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
    handleCreateDroplet,
    handleOpenCreateDialog,
  };
}
