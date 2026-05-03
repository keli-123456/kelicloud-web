import React from "react";
import { toast } from "sonner";

import {
  getLinodeTokenSecret,
  type LinodeTokenRecord,
} from "@/lib/cloudLinode";
import type { TokenSecretState } from "./linodePanelUtils";
import { toErrorMessage } from "./linodePanelUtils";

export function useLinodeTokenSecret() {
  const [tokenSecret, setTokenSecret] = React.useState<TokenSecretState | null>(null);
  const [tokenSecretLoading, setTokenSecretLoading] = React.useState(false);

  const handleViewTokenSecret = async (token: LinodeTokenRecord) => {
    setTokenSecretLoading(true);
    try {
      const secret = await getLinodeTokenSecret(token.id);
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
