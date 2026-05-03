import { Outlet } from "react-router-dom";

import AdminPanelBar from "../../components/admin/AdminPanelBar";
import { AdminTableSkeleton } from "@/components/admin/AdminPageShell";
import {
  ADMIN_FORM_DIALOG_CLASS,
  ADMIN_FORM_SCROLL_CLASS,
} from "@/components/admin/AdminFormStyles";
import { AccountProvider, useAccount } from "@/contexts/AccountContext";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import { Button, Dialog } from "@/components/admin/admin-ui";
import { Suspense, useEffect, useState } from "react";
import { Eula } from "@/utils/field";
import { useTranslation } from "react-i18next";

const AdminRouteFallback = () => (
  <div className="flex min-w-0 flex-col gap-4 p-4 md:gap-6 md:p-6">
    <AdminTableSkeleton columns={6} rows={6} />
  </div>
);

const AdminLayoutContent = () => {
  const { t } = useTranslation();
  const { platformAdmin } = useAccount();
  const { settings, loading } = useSettings("system", {
    enabled: platformAdmin,
  });
  const lang = localStorage.getItem("i18nextLng") || "en";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!platformAdmin || loading) {
      setOpen(false);
    } else if (settings && !settings.eula_accepted && lang.startsWith("zh")) {
      setOpen(true);
    }
  }, [loading, platformAdmin, settings, lang]);

  return (
    <>
      <Dialog.Root open={open}>
        <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={760}>
          <Dialog.Title>{t("about.eula_title")}</Dialog.Title>
          <div className={`${ADMIN_FORM_SCROLL_CLASS} mt-1`}>
            <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
              {Eula}
            </pre>
          </div>
          <div className="flex flex-row items-center justify-end gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
            <Button
              variant="soft"
              color="red"
              onClick={() => window.close()}
            >
              {t("about.eula_decline", "Decline")}
            </Button>
            <Button
              variant="solid"
              onClick={() => {
                setOpen(false);
                updateSettingsWithToast(
                  { eula_accepted: true },
                  (key) => t(key),
                  "system",
                );
              }}
            >
              {t("about.eula_accept", "I have read and accept")}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
      <AdminPanelBar
        content={
          <Suspense fallback={<AdminRouteFallback />}>
            <Outlet />
          </Suspense>
        }
      />
    </>
  );
};

const AdminLayout = () => {
  return (
    <AccountProvider>
      <AdminLayoutContent />
    </AccountProvider>
  );
};

export default AdminLayout;
