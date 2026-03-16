import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PlatformAdminNotice({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const { t } = useTranslation();

  return (
    <Alert className="border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
      <ShieldAlert className="text-amber-700 dark:text-amber-300" />
      <AlertTitle>
        {title || t("settings.platform_admin_required_title")}
      </AlertTitle>
      <AlertDescription className="text-amber-800/90 dark:text-amber-200/90">
        {description || t("settings.platform_admin_required_description")}
      </AlertDescription>
    </Alert>
  );
}
