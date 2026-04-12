import { Outlet } from "react-router-dom";

import AdminPanelBar from "../../components/admin/AdminPanelBar";
import { AccountProvider, useAccount } from "@/contexts/AccountContext";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EditDialogShell } from "@/components/ui/modal-shell";
import { FormActions, FormShell } from "@/components/ui/form-shell";
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
      <EditDialogShell
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) setOpen(true);
        }}
        title={t("about.eula_title")}
        description={t(
          "about.eula_description",
          "Please review and accept the agreement before continuing.",
        )}
        size="xl"
      >
        <FormShell>
          <div className="flex flex-col gap-2">
            <div className="max-h-[70vh] space-y-4 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
              <pre className="text-wrap">{Eula}</pre>
            </div>
            <FormActions>
              <Button
                variant="destructive"
                onClick={() => window.close()}
              >
                {t("about.eula_decline", "Decline")}
              </Button>
              <Button
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
            </FormActions>
          </div>
        </FormShell>
      </EditDialogShell>
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
