import * as React from "react";
import { useTranslation } from "react-i18next";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FormActions,
  FormErrorText,
  FormField,
  FormSection,
  FormShell,
} from "@/components/ui/form-shell";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AccountProvider,
  getDefaultAdminPath,
  useAccount,
} from "@/contexts/AccountContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { Navigate } from "react-router-dom";
import { getSiteName } from "@/constants/siteBrand";
import { cn } from "@/lib/utils";

import { TablerSettings } from "./Icones/Tabler";

type LoginDialogProps = {
  trigger?: React.ReactNode | string;
  autoOpen?: boolean;
  showSettings?: boolean;
  info?: string | React.ReactNode;
  onLoginSuccess?: () => void;
  inline?: boolean;
  redirectAuthenticatedTo?: string;
  className?: string;
};

const LoginDialog = ({
  trigger,
  autoOpen = false,
  showSettings = true,
  info,
  onLoginSuccess,
  inline = false,
  redirectAuthenticatedTo,
  className,
}: LoginDialogProps) => {
  const InnerLayout = ({ autoOpen }: { autoOpen: boolean }) => {
    const { account, loading, error, refresh } = useAccount();
    const [t] = useTranslation();
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [twoFac, setTwoFac] = React.useState("");
    const [errorMsg, setErrorMsg] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [require2FA, setRequire2FA] = React.useState(false);
    const [open, setOpen] = React.useState(autoOpen || false);
    const { publicInfo } = usePublicInfo();
    const siteName = getSiteName(publicInfo?.sitename);

    const passwordLoginEnabled = !publicInfo?.disable_password_login;
    const oauthEnabled = !!publicInfo?.oauth_enable;
    const onlyOAuthLogin = oauthEnabled && !passwordLoginEnabled;
    const isFormValid =
      passwordLoginEnabled &&
      username.trim() !== "" &&
      password.trim() !== "" &&
      (!require2FA || twoFac.trim() !== "");

    React.useEffect(() => {
      if (autoOpen) {
        setOpen(true);
      }
    }, [autoOpen]);

    const handleLogin = async () => {
      if (!isFormValid) {
        if (require2FA && !twoFac.trim()) {
          setErrorMsg(
            t(
              "login.two_factor_required",
              "Two-factor verification code is required",
            ),
          );
          return;
        }
        setErrorMsg(
          t(
            "login.required_credentials",
            "Username and password are required",
          ),
        );
        return;
      }

      setErrorMsg("");
      setIsLoading(true);
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password,
            ...(twoFac && !account?.["2fa_enabled"]
              ? { "2fa_code": twoFac }
              : {}),
          }),
        });
        const data = await res.json();
        if (res.status === 200) {
          const nextAccount = await refresh();
          if (typeof onLoginSuccess === "function") {
            onLoginSuccess();
            return;
          }
          window.open(getDefaultAdminPath(nextAccount), "_self");
        } else {
          if (data.message === "2FA code is required") {
            setRequire2FA(true);
            return;
          }
          setErrorMsg(
            data.message ||
              t("login.failed", "Login failed"),
          );
        }
      } catch (err) {
        setErrorMsg(t("login.network_error", "Network error"));
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !isLoading && isFormValid) {
        e.preventDefault();
        void handleLogin();
      }
    };

    if (loading) {
      return <Button disabled>{t("loading")}</Button>;
    }
    if (error || !account) {
      return (
        <Button disabled variant="destructive">
          {t("common.error", "Error")}
        </Button>
      );
    }
    if (account.logged_in) {
      const defaultAdminPath = getDefaultAdminPath(account);
      if (redirectAuthenticatedTo) {
        return <Navigate to={redirectAuthenticatedTo} replace />;
      }
      if (!showSettings) {
        return null;
      }
      return (
        <a href={defaultAdminPath} target="_blank" rel="noreferrer">
          <Button type="button" variant="outline" size="icon">
            <TablerSettings />
          </Button>
        </a>
      );
    }

    if (onlyOAuthLogin && !autoOpen && !inline) {
      const redirect = () => {
        window.location.href = "/api/oauth";
      };
      if (trigger) {
        if (typeof trigger === "string") {
          return <Button onClick={redirect}>{trigger}</Button>;
        }
        return (
          <span
            onClick={redirect}
            style={{ cursor: "pointer", display: "inline-flex" }}
          >
            {trigger}
          </span>
        );
      }
      return <Button onClick={redirect}>{t("login.title")}</Button>;
    }

    const triggerNode =
      trigger && typeof trigger !== "string" ? (
        trigger
      ) : (
        <Button>{typeof trigger === "string" ? trigger : t("login.title")}</Button>
      );

    const loginFields = (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isFormValid && !isLoading) {
            void handleLogin();
          }
        }}
        className="flex flex-col gap-4"
      >
        {passwordLoginEnabled && (
          <>
            <FormShell>
              <FormSection>
                <FormField label={t("login.username")} htmlFor="login-username" required>
                  <Input
                    id="login-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="admin"
                    disabled={isLoading}
                    autoFocus
                    className="h-11"
                  />
                </FormField>
                <FormField label={t("login.password")} htmlFor="login-password" required>
                  <Input
                    id="login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    type="password"
                    placeholder={t("login.password_placeholder")}
                    disabled={isLoading}
                    className="h-11"
                  />
                </FormField>
                {require2FA ? (
                  <FormField label={t("login.two_factor")} htmlFor="login-two-factor" required>
                    <Input
                      id="login-two-factor"
                      value={twoFac}
                      onChange={(e) => setTwoFac(e.target.value)}
                      onKeyDown={handleKeyDown}
                      type="text"
                      placeholder="000000"
                      disabled={isLoading}
                      className="h-11"
                    />
                  </FormField>
                ) : null}
              </FormSection>
            </FormShell>
            {errorMsg ? <FormErrorText>{errorMsg}</FormErrorText> : null}
            <FormActions>
              <Button type="submit" disabled={isLoading || !isFormValid} className="h-11 w-full">
                {isLoading
                  ? t("login.logging_in", "Logging in...")
                  : t("login.title")}
              </Button>
            </FormActions>
          </>
        )}
        {publicInfo?.oauth_enable && passwordLoginEnabled ? (
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Separator className="flex-1" />
            <span>OAuth</span>
            <Separator className="flex-1" />
          </div>
        ) : null}
        {publicInfo?.oauth_enable && (
          <Button
            onClick={() => {
              window.location.href = "/api/oauth";
            }}
            variant={passwordLoginEnabled ? "outline" : "default"}
            disabled={isLoading}
            type="button"
            className="h-11 w-full"
          >
            {t("login.login_with", {
              provider:
                publicInfo?.oauth_provider === "generic"
                  ? "OAuth"
                  : publicInfo?.oauth_provider
                    ? publicInfo.oauth_provider.charAt(0).toUpperCase() +
                      publicInfo.oauth_provider.slice(1)
                    : "",
            })}
          </Button>
        )}
      </form>
    );

    if (inline) {
      return (
        <Card className={cn("rounded-xl border-border/70 shadow-none", className)}>
          <CardHeader className="gap-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("common.admin_console", { defaultValue: "Admin Console" })}
              {onlyOAuthLogin ? " / OAuth" : ""}
            </div>
            <CardTitle className="text-xl tracking-tight">{t("login.title")}</CardTitle>
            <CardDescription className="text-sm leading-6">
              {t("login.desc", { siteName })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {info ? (
              <Alert>
                <AlertTitle>Notice</AlertTitle>
                <AlertDescription>{info}</AlertDescription>
              </Alert>
            ) : null}
            {loginFields}
          </CardContent>
        </Card>
      );
    }

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {React.isValidElement(triggerNode) ? triggerNode : <span>{triggerNode}</span>}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader className="gap-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("common.admin_console", { defaultValue: "Admin Console" })}
            </div>
            <DialogTitle className="text-xl tracking-tight">{t("login.title")}</DialogTitle>
            <DialogDescription className="leading-6">
              {t("login.desc", { siteName })}
            </DialogDescription>
          </DialogHeader>
          {info ? (
            <Alert>
              <AlertTitle>Notice</AlertTitle>
              <AlertDescription>{info}</AlertDescription>
            </Alert>
          ) : null}
          {loginFields}
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <AccountProvider>
      <InnerLayout autoOpen={autoOpen} />
    </AccountProvider>
  );
};

export default LoginDialog;
