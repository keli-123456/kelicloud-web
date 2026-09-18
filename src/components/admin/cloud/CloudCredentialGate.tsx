import type { ReactNode } from "react";
import { KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function CloudCredentialGate({
  empty,
  onImport,
  children,
}: {
  empty: boolean;
  onImport: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  if (!empty) return children;

  return (
    <section className="flex min-w-0 flex-col items-start gap-3 border-y border-border py-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{t("cloud.credentials.empty")}</p>
      <Button onClick={onImport}>
        <KeyRound className="size-4" />
        {t("cloud.credentials.import")}
      </Button>
    </section>
  );
}
