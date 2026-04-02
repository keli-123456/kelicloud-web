import * as React from "react";
import { useTranslation } from "react-i18next";

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
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AccountProvider,
  getDefaultAdminPath,
  useAccount,
} from "@/contexts/AccountContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { Navigate } from "react-router-dom";

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
    const siteName = String(publicInfo?.sitename || "Komari").trim() || "Komari";

    const passwordLoginEnabled = !publicInfo?.disable_password_login;
    const oauthEnabled = !!publicInfo?.oauth_enable;
    const onlyOAuthLogin = oauthEnabled && !passwordLoginEnabled;
    const isFormValid =
      passwordLoginEnabled &&
      username.trim() !== "" &&
      password.trim() !== "";

    React.useEffect(() => {
      if (autoOpen) {
        setOpen(true);
      }
    }, [autoOpen]);

    const handleLogin = async () => {
      if (!isFormValid) {
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
      >
        <div className="flex flex-col gap-3">
          {passwordLoginEnabled && (
            <>
              <label>
                <div className="mb-1 text-sm font-bold">{t("login.username")}</div>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="admin"
                  disabled={isLoading}
                  autoFocus
                />
              </label>
              <label>
                <div className="mb-1 text-sm font-bold">{t("login.password")}</div>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  type="password"
                  placeholder={t("login.password_placeholder")}
                  disabled={isLoading}
                />
              </label>
              <label hidden={!require2FA}>
                <div className="mb-1 text-sm font-bold">{t("login.two_factor")}</div>
                <Input
                  value={twoFac}
                  onChange={(e) => setTwoFac(e.target.value)}
                  onKeyDown={handleKeyDown}
                  type="text"
                  placeholder="000000"
                  disabled={isLoading}
                />
              </label>
              {errorMsg ? (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {errorMsg}
                </div>
              ) : null}
              <Button
                type="submit"
                disabled={isLoading || !isFormValid}
                style={{ opacity: isLoading || !isFormValid ? 0.6 : 1 }}
              >
                {isLoading
                  ? t("login.logging_in", "Logging in...")
                  : t("login.title")}
              </Button>
            </>
          )}
          {publicInfo?.oauth_enable && (
            <Button
              onClick={() => {
                window.location.href = "/api/oauth";
              }}
              variant={passwordLoginEnabled ? "outline" : "default"}
              disabled={isLoading}
              type="button"
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
        </div>
      </form>
    );

    if (inline) {
      return (
        <Card className={className}>
          <CardHeader className="space-y-2">
            <CardTitle>{t("login.title")}</CardTitle>
            <CardDescription className="space-y-2">
              <div>{t("login.desc", { siteName })}</div>
              {info ? <div>{info}</div> : null}
            </CardDescription>
          </CardHeader>
          <CardContent>{loginFields}</CardContent>
        </Card>
      );
    }

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {React.isValidElement(triggerNode) ? triggerNode : <span>{triggerNode}</span>}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[450px]">
          <DialogTitle>{t("login.title")}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col justify-center gap-2">
              <label>{t("login.desc", { siteName })}</label>
              {info && <label>{info}</label>}
            </div>
          </DialogDescription>
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
