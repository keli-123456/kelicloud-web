import type { TFunction } from "i18next";
import { Tags } from "lucide-react";

import {
  Badge,
  Button,
  CloudSensitiveDialogContent,
  CloudStatusNotice,
  cloudPanelFieldLabelClassName,
  Dialog,
  Flex,
  TextField,
} from "@/components/admin/cloud/cloud-ui";

type MaybePromise<T> = T | Promise<T>;

type LinodePromoDialogProps = {
  t: TFunction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promoCode: string;
  onPromoCodeChange: (value: string) => void;
  submitting: boolean;
  onRedeem: () => MaybePromise<void>;
};

export function LinodePromoDialog({
  t,
  open,
  onOpenChange,
  promoCode,
  onPromoCodeChange,
  submitting,
  onRedeem,
}: LinodePromoDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <CloudSensitiveDialogContent
        title={t("cloud.providers.linode.redeem_promo", "Redeem Promo")}
        description={t(
            "cloud.providers.linode.promo_dialog_description",
            "Submit a Linode promo code for the current active account. Linode may reject codes when the account does not meet their eligibility rules.",
          )}
        icon={<Tags className="size-4" />}
        badge={<Badge color="blue">{t("cloud.providers.linode.name", "Linode")}</Badge>}
        side={(
          <CloudStatusNotice tone="gray">
            {t(
              "cloud.providers.linode.promo_eligibility_hint",
              "Promo eligibility is decided by Linode after submission.",
            )}
          </CloudStatusNotice>
        )}
      >

        <div className="flex flex-col gap-4">
          <label className={cloudPanelFieldLabelClassName}>
            {t("cloud.providers.linode.promo_code", "Promo Code")}
          </label>
          <TextField.Root
            value={promoCode}
            placeholder={t("cloud.providers.linode.promo_code_placeholder", "Enter a Linode promo code")}
            onChange={(event) => onPromoCodeChange(event.target.value)}
            disabled={submitting}
          />
          <Flex justify="end" gap="2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("common.cancel", "取消")}
            </Button>
            <Button
              onClick={() => {
                void onRedeem();
              }}
              disabled={submitting || !promoCode.trim()}
            >
              {submitting
                ? t("cloud.providers.linode.promo_redeeming", "Redeeming...")
                : t("cloud.providers.linode.redeem_promo", "Redeem Promo")}
            </Button>
          </Flex>
        </div>
      </CloudSensitiveDialogContent>
    </Dialog.Root>
  );
}
