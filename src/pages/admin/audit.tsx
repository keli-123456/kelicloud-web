import * as React from "react";
import { History, ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import {
  AdminPageShell,
  AdminSideNav,
  AdminSideNavButton,
  AdminSplitLayout,
} from "@/components/admin/AdminPageShell";
import {
  Tabs,
  TabsContent,
} from "@/components/ui/tabs";
import { useAccount } from "@/contexts/AccountContext";
import LogPage from "./log";
import Sessions from "./sessions";

type AuditTab = "sessions" | "logs";

export default function AuditPage() {
  const { t } = useTranslation();
  const { hasFeature } = useAccount();
  const [searchParams, setSearchParams] = useSearchParams();
  const canViewLogs = hasFeature("logs");
  const requestedTab = searchParams.get("tab");
  const activeTab: AuditTab =
    requestedTab === "logs" && canViewLogs ? "logs" : "sessions";

  React.useEffect(() => {
    if (requestedTab === activeTab) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set("tab", activeTab);
    setSearchParams(next, { replace: true });
  }, [activeTab, requestedTab, searchParams, setSearchParams]);

  return (
    <AdminPageShell
      title={t("admin.audit.title", { defaultValue: "审计" })}
      description={t("admin.audit.description", {
        defaultValue: "集中查看当前会话和后台操作日志。",
      })}
    >
      <Tabs value={activeTab} className="min-w-0">
        <AdminSplitLayout
          sidebar={(
            <AdminSideNav aria-label={t("admin.audit.title", { defaultValue: "审计" })}>
              <AdminSideNavButton
                active={activeTab === "sessions"}
                icon={<History className="h-4 w-4" />}
                label={t("sessions.title", { defaultValue: "会话" })}
                description={t("admin.audit.sessions_description", { defaultValue: "登录会话" })}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("tab", "sessions");
                  setSearchParams(next);
                }}
              />
              {canViewLogs ? (
                <AdminSideNavButton
                  active={activeTab === "logs"}
                  icon={<ScrollText className="h-4 w-4" />}
                  label={t("logs.title", { defaultValue: "日志" })}
                  description={t("admin.audit.logs_description", { defaultValue: "操作记录" })}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set("tab", "logs");
                    setSearchParams(next);
                  }}
                />
              ) : null}
            </AdminSideNav>
          )}
        >
          <TabsContent value="sessions" className="mt-0">
            <Sessions embedded />
          </TabsContent>
          {canViewLogs ? (
            <TabsContent value="logs" className="mt-0">
              <LogPage embedded />
            </TabsContent>
          ) : null}
        </AdminSplitLayout>
      </Tabs>
    </AdminPageShell>
  );
}
