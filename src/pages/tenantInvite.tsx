import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Shield, TicketPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import LoginDialog from "@/components/Login";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AccountProvider, useAccount } from "@/contexts/AccountContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";

type TenantInvite = {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  tenant_slug?: string;
  token: string;
  role: string;
  inviter_uuid?: string;
  expires_at?: string;
};

const readResponse = async (response: Response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.status === "error") {
    throw new Error(data?.message || `HTTP ${response.status}`);
  }
  return data?.data ?? data;
};

const formatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const TenantInvitePageInner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useParams();
  const { publicInfo } = usePublicInfo();
  const { account, loading: accountLoading, refresh } = useAccount();
  const [invite, setInvite] = React.useState<TenantInvite | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [accepting, setAccepting] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const siteName = String(publicInfo?.sitename || "Komari").trim() || "Komari";

  React.useEffect(() => {
    if (!token) {
      setLoading(false);
      setError(t("tenants.invite_invalid"));
      return;
    }

    let cancelled = false;
    const loadInvite = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/tenant-invites/${token}`);
        const data = await readResponse(response);
        if (!cancelled) {
          setInvite(data);
        }
      } catch (err) {
        if (!cancelled) {
          setInvite(null);
          setError(err instanceof Error ? err.message : t("common.error"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadInvite();
    return () => {
      cancelled = true;
    };
  }, [t, token]);

  const handleAcceptInvite = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const response = await fetch(`/api/tenant-invites/${token}/accept`, {
        method: "POST",
      });
      await readResponse(response);
      await refresh();
      setAccepted(true);
      toast.success(t("tenants.invite_accept_success"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="mx-4 pb-8 pt-6">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl items-center justify-center">
        <Card className="w-full max-w-2xl border-border/60 bg-background/95 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.45)]">
          <CardHeader className="space-y-3">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <TicketPlus className="size-6" />
            </div>
            <div className="space-y-2 text-center">
              <CardTitle>{t("tenants.invite_page_title")}</CardTitle>
              <CardDescription>
                {t("tenants.invite_page_description", { siteName })}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading || accountLoading ? (
              <div className="text-center text-sm text-muted-foreground">
                {t("loading")}
              </div>
            ) : error ? (
              <Alert className="border-destructive/30 bg-destructive/5">
                <Shield className="text-destructive" />
                <AlertTitle>{t("tenants.invite_unavailable_title")}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : invite ? (
              <>
                <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">{invite.tenant_name || "-"}</Badge>
                    <Badge variant="outline">
                      {t(`tenants.roles.${invite.role}`)}
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/70 bg-background/80 px-3 py-3">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {t("tenants.fields.slug")}
                      </div>
                      <div className="mt-2 font-medium text-foreground">
                        {invite.tenant_slug || "-"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/80 px-3 py-3">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {t("tenants.fields.role")}
                      </div>
                      <div className="mt-2 font-medium text-foreground">
                        {t(`tenants.roles.${invite.role}`)}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {invite.expires_at
                      ? t("tenants.invite_expires_at", {
                          date: formatTime(invite.expires_at),
                        })
                      : t("tenants.invite_no_expiry")}
                  </div>
                </div>

                {accepted ? (
                  <Alert className="border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                    <CheckCircle2 className="text-emerald-700 dark:text-emerald-300" />
                    <AlertTitle>{t("tenants.invite_accept_success")}</AlertTitle>
                    <AlertDescription>
                      {t("tenants.invite_accept_success_description")}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {account?.logged_in ? (
                  <div className="space-y-3">
                    <Alert className="border-sky-200 bg-sky-50/80 dark:border-sky-900/50 dark:bg-sky-950/30">
                      <Shield className="text-sky-700 dark:text-sky-300" />
                      <AlertTitle>{t("tenants.invite_ready_title")}</AlertTitle>
                      <AlertDescription>
                        {t("tenants.invite_ready_description", {
                          username: account.username,
                        })}
                      </AlertDescription>
                    </Alert>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        disabled={accepting || accepted}
                        onClick={() => void handleAcceptInvite()}
                      >
                        {accepting
                          ? t("loading")
                          : accepted
                            ? t("tenants.invite_accepted")
                            : t("tenants.invite_accept_action")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate("/admin/tenants")}
                      >
                        {t("tenants.open_workspace")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <LoginDialog
                    inline
                    showSettings={false}
                    info={t("tenants.invite_login_required")}
                    onLoginSuccess={() => {
                      void refresh();
                    }}
                    className="w-full border-border/60 bg-background/95"
                  />
                )}
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default function TenantInvitePage() {
  return (
    <AccountProvider>
      <TenantInvitePageInner />
    </AccountProvider>
  );
}
