import * as React from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, KeyRound, ShieldCheck } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { formatApiErrorMessage } from "@/lib/apiErrorMessage";
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
            "请输入用户名和密码",
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
            data.message
              ? formatApiErrorMessage(data.message, { status: res.status })
              : t("login.failed", "登录失败"),
          );
        }
      } catch (err) {
        setErrorMsg(t("login.network_error", "网络错误"));
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
      if (inline) {
        return (
          <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="gap-3 border-b border-border px-5 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 text-white shadow-sm shadow-blue-950/15">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-xl font-semibold tracking-normal">
                    {t("login.title")}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {t("common.loading", { defaultValue: "加载中" })}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-10 rounded-md bg-muted" />
              <div className="mt-4 h-10 rounded-md bg-muted" />
            </CardContent>
          </Card>
        );
      }
      return <Button disabled>{t("loading")}</Button>;
    }
    if (error || !account) {
      if (inline) {
        return (
          <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="gap-3 border-b border-border px-5 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-200">
                  <AlertCircle className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-xl font-semibold tracking-normal">
                    {t("login.title")}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {t("login.unavailable", {
                      defaultValue: "登录服务暂时不可用",
                    })}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>{t("common.error", "错误")}</AlertTitle>
                <AlertDescription>
                  {error
                    ? t("login.account_fetch_failed", { defaultValue: "无法获取账户状态" })
                    : t("login.network_error", { defaultValue: "网络错误" })}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        );
      }
      return (
        <Button disabled variant="destructive">
          {t("common.error", "错误")}
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
            <div className="grid gap-4">
              <label className="grid gap-2">
                <div className="text-[12px] font-semibold leading-4 text-muted-foreground">
                  {t("login.username")}
                </div>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="admin"
                  disabled={isLoading}
                  autoFocus
                  className="h-10 rounded-md bg-muted/45"
                />
              </label>
              <label className="grid gap-2">
                <div className="text-[12px] font-semibold leading-4 text-muted-foreground">
                  {t("login.password")}
                </div>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  type="password"
                  placeholder={t("login.password_placeholder")}
                  disabled={isLoading}
                  className="h-10 rounded-md bg-muted/45"
                />
              </label>
              <label hidden={!require2FA} className="grid gap-2">
                <div className="text-[12px] font-semibold leading-4 text-muted-foreground">
                  {t("login.two_factor")}
                </div>
                <Input
                  value={twoFac}
                  onChange={(e) => setTwoFac(e.target.value)}
                  onKeyDown={handleKeyDown}
                  type="text"
                  placeholder="000000"
                  disabled={isLoading}
                  className="h-10 rounded-md bg-muted/45"
                />
              </label>
            </div>
            {errorMsg ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>{t("common.error", "错误")}</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={isLoading || !isFormValid} className="h-10 w-full">
              <KeyRound className="h-4 w-4" />
              {isLoading
                ? t("login.logging_in", "登录中...")
                : t("login.title")}
            </Button>
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
            className="h-10 w-full"
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
        <Card className={cn("overflow-hidden", className)}>
          <CardHeader className="gap-4 border-b border-border px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 text-white shadow-sm shadow-blue-950/15">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <CardTitle className="text-xl font-semibold tracking-normal">
                    {t("login.title")}
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm leading-6">
                    {t("login.desc", { siteName })}
                  </CardDescription>
                </div>
              </div>
              <Badge variant={onlyOAuthLogin ? "info" : "secondary"}>
                {onlyOAuthLogin ? "OAuth" : t("login.secure", { defaultValue: "安全登录" })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-5">
            {info ? (
              <Alert className="bg-blue-50/60 text-blue-950 dark:bg-blue-950/25 dark:text-blue-100">
                <AlertTitle>{t("common.notice", { defaultValue: "提示" })}</AlertTitle>
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 text-white shadow-sm shadow-blue-950/15">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl tracking-normal">{t("login.title")}</DialogTitle>
            <DialogDescription className="leading-6">
              {t("login.desc", { siteName })}
            </DialogDescription>
          </DialogHeader>
          {info ? (
            <Alert className="bg-blue-50/60 text-blue-950 dark:bg-blue-950/25 dark:text-blue-100">
              <AlertTitle>{t("common.notice", { defaultValue: "提示" })}</AlertTitle>
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
