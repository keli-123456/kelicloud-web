import React from "react";
import { toast } from "sonner";

import {
  getDigitalOceanDropletPassword,
  type DigitalOceanDroplet,
} from "@/lib/cloud";
import {
  toErrorMessage,
  type SavedDropletPasswordState,
} from "./digitalOceanPanelUtils";

export function useDigitalOceanDropletPasswords() {
  const [savedDropletPassword, setSavedDropletPassword] =
    React.useState<SavedDropletPasswordState | null>(null);
  const [dropletPasswordLoading, setDropletPasswordLoading] = React.useState(false);

  const handleViewDropletPassword = async (droplet: DigitalOceanDroplet) => {
    setDropletPasswordLoading(true);
    try {
      const credential = await getDigitalOceanDropletPassword(droplet.id);
      setSavedDropletPassword({ droplet, credential });
    } catch (viewError) {
      toast.error(toErrorMessage(viewError));
    } finally {
      setDropletPasswordLoading(false);
    }
  };

  return {
    savedDropletPassword,
    setSavedDropletPassword,
    dropletPasswordLoading,
    handleViewDropletPassword,
  };
}
