import React from "react";
import { toast } from "sonner";

import {
  getDigitalOceanManagedSSHKey,
  type DigitalOceanManagedSSHKeyMaterial,
  type DigitalOceanTokenRecord,
} from "@/lib/cloud";
import { toErrorMessage } from "./digitalOceanPanelUtils";

export function useDigitalOceanManagedKey() {
  const [managedKeyMaterial, setManagedKeyMaterial] =
    React.useState<DigitalOceanManagedSSHKeyMaterial | null>(null);
  const [managedKeyLoading, setManagedKeyLoading] = React.useState(false);

  const handleViewManagedKey = async (token: DigitalOceanTokenRecord) => {
    setManagedKeyLoading(true);
    try {
      const material = await getDigitalOceanManagedSSHKey(token.id);
      setManagedKeyMaterial(material);
    } catch (viewError) {
      toast.error(toErrorMessage(viewError));
    } finally {
      setManagedKeyLoading(false);
    }
  };

  return {
    managedKeyMaterial,
    setManagedKeyMaterial,
    managedKeyLoading,
    handleViewManagedKey,
  };
}
