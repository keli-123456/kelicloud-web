import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  createAzureInstance,
  type AzureCatalog,
} from "@/lib/cloudAzure";
import {
  buildCreateFormFromPreset,
  getCreateRootPasswordMode,
  getDefaultAzureSize,
  initialAzureImagePreset,
  initialCreateForm,
  toErrorMessage,
  type AzureCreateFormState,
} from "./azurePanelUtils";

type UseAzureCreateInstanceOptions = {
  t: TFunction;
  catalog: AzureCatalog | null;
  loadResources: () => Promise<void>;
};

export function useAzureCreateInstance({
  t,
  catalog,
  loadResources,
}: UseAzureCreateInstanceOptions) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<AzureCreateFormState>(() => ({ ...initialCreateForm }));

  React.useEffect(() => {
    if (!catalog?.sizes.length) return;
    setCreateForm((previous) => {
      if (previous.size && catalog.sizes.some((item) => item.name === previous.size)) {
        return previous;
      }
      return {
        ...previous,
        size: getDefaultAzureSize(catalog),
      };
    });
  }, [catalog]);

  const handleCreateInstance = async () => {
    setCreateSubmitting(true);
    try {
      const result = await createAzureInstance({
        name: createForm.name || "",
        resource_group: createForm.resource_group || "",
        size: createForm.size,
        admin_password: createForm.admin_password || "",
        user_data: createForm.user_data || "",
        public_ip: createForm.public_ip,
        assign_ipv6: createForm.assign_ipv6,
        auto_connect: createForm.auto_connect,
        auto_connect_group: createForm.auto_connect_group || "",
        image: {
          publisher: createForm.image_publisher,
          offer: createForm.image_offer,
          sku: createForm.image_sku,
          version: createForm.image_version || "latest",
        },
      });
      toast.success(t("cloud.providers.azure.create_success", "Azure VM created"));
      const passwordMode = getCreateRootPasswordMode(createForm.admin_password || "");
      if (passwordMode === "random" && !createForm.admin_password) {
        toast.info(t("cloud.form.root_password_random", "Leave blank for random"));
      }
      if (result.password_save_error) {
        toast.error(result.password_save_error);
      }
      setCreateOpen(false);
      setCreateForm({
        ...buildCreateFormFromPreset(initialAzureImagePreset.id),
        size: getDefaultAzureSize(catalog),
      });
      await loadResources();
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setCreateSubmitting(false);
    }
  };

  return {
    createOpen,
    setCreateOpen,
    createSubmitting,
    createForm,
    setCreateForm,
    handleCreateInstance,
  };
}
