import { Outlet } from "react-router-dom";

import AdminPanelBar from "../../components/admin/AdminPanelBar";
import { AccountProvider, useAccount } from "@/contexts/AccountContext";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import { Button, Dialog } from "@/components/admin/admin-ui";
import { useEffect, useState } from "react";
import { Eula } from "@/utils/field";
import { useTranslation } from "react-i18next";

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
    }
    else if (settings && !settings.eula_accepted && lang.startsWith("zh")) {
      setOpen(true);
    }
  }, [loading, platformAdmin, settings, lang]);

  return (
    <>
      <Dialog.Root open={open}>
        <Dialog.Content>
          <Dialog.Title>{t("about.eula_title")}</Dialog.Title>
          <div className="flex flex-col gap-2">
            <div className="max-h-[70vh] overflow-y-auto space-y-4">
              <pre className="text-wrap">{Eula}</pre>
            </div>
            <div className="flex flex-row items-center justify-end gap-2">
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
                    "system"
                  );
                }}
              >
                {t("about.eula_accept", "I have read and accept")}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Root>
      <AdminPanelBar content={<Outlet />} />
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
