import React from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import {
  getLinodeAccount,
  redeemLinodePromoCode,
  type LinodeAccount,
} from "@/lib/cloudLinode";
import { toErrorMessage } from "./linodePanelUtils";

type UseLinodePromoCodeOptions = {
  t: TFunction;
  setAccount: React.Dispatch<React.SetStateAction<LinodeAccount | null>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
};

export function useLinodePromoCode({
  t,
  setAccount,
  setError,
}: UseLinodePromoCodeOptions) {
  const [promoOpen, setPromoOpen] = React.useState(false);
  const [promoCode, setPromoCode] = React.useState("");
  const [promoSubmitting, setPromoSubmitting] = React.useState(false);

  const handlePromoOpenChange = React.useCallback((open: boolean) => {
    setPromoOpen(open);
    if (!open && !promoSubmitting) {
      setPromoCode("");
    }
  }, [promoSubmitting]);

  const handleRedeemPromoCode = React.useCallback(async () => {
    const trimmedPromoCode = promoCode.trim();
    if (!trimmedPromoCode) {
      toast.error(t("cloud.providers.linode.promo_code_required", "Enter a promo code"));
      return;
    }

    setPromoSubmitting(true);
    try {
      await redeemLinodePromoCode(trimmedPromoCode);
      setPromoOpen(false);
      setPromoCode("");
      toast.success(t("cloud.providers.linode.promo_redeem_success", "Promo credit redeemed"));
      try {
        const nextAccount = await getLinodeAccount();
        setAccount(nextAccount);
        setError("");
      } catch {
        // The promo code may still be applied even if the follow-up refresh fails.
      }
    } catch (promoError) {
      toast.error(toErrorMessage(promoError));
    } finally {
      setPromoSubmitting(false);
    }
  }, [promoCode, setAccount, setError, t]);

  return {
    promoOpen,
    setPromoOpen,
    promoCode,
    setPromoCode,
    promoSubmitting,
    handlePromoOpenChange,
    handleRedeemPromoCode,
  };
}
