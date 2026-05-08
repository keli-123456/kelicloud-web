import * as React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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
      subnav={
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const next = new URLSearchParams(searchParams);
            next.set("tab", value);
            setSearchParams(next);
          }}
        >
          <TabsList className="h-9">
            <TabsTrigger value="sessions">
              {t("sessions.title", { defaultValue: "会话" })}
            </TabsTrigger>
            {canViewLogs ? (
              <TabsTrigger value="logs">
                {t("logs.title", { defaultValue: "日志" })}
              </TabsTrigger>
            ) : null}
          </TabsList>
        </Tabs>
      }
    >
      <Tabs value={activeTab} className="min-w-0">
        <TabsContent value="sessions" className="mt-0">
          <Sessions embedded />
        </TabsContent>
        {canViewLogs ? (
          <TabsContent value="logs" className="mt-0">
            <LogPage embedded />
          </TabsContent>
        ) : null}
      </Tabs>
    </AdminPageShell>
  );
}
