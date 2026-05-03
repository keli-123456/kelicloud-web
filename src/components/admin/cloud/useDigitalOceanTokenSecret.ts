import React from "react";
import { toast } from "sonner";

import {
  getDigitalOceanTokenSecret,
  type DigitalOceanTokenRecord,
} from "@/lib/cloud";
import {
  toErrorMessage,
  type TokenSecretState,
} from "./digitalOceanPanelUtils";

export function useDigitalOceanTokenSecret() {
  const [tokenSecret, setTokenSecret] = React.useState<TokenSecretState | null>(null);
  const [tokenSecretLoading, setTokenSecretLoading] = React.useState(false);

  const handleViewTokenSecret = async (token: DigitalOceanTokenRecord) => {
    setTokenSecretLoading(true);
    try {
      const secret = await getDigitalOceanTokenSecret(token.id);
      setTokenSecret({ secret });
    } catch (viewError) {
      toast.error(toErrorMessage(viewError));
    } finally {
      setTokenSecretLoading(false);
    }
  };

  return {
    tokenSecret,
    setTokenSecret,
    tokenSecretLoading,
    handleViewTokenSecret,
  };
}
