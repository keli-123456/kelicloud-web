import * as React from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, KeyRound, LogIn, ShieldCheck, UserPlus } from "lucide-react";

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
  variant?: "default" | "simple";
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
  variant = "default",
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
    const [authMode, setAuthMode] = React.useState<"login" | "register">("login");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const { publicInfo } = usePublicInfo();
    const siteName = getSiteName(publicInfo?.sitename);
    const isSimpleInline = inline && variant === "simple";
    const isRegisterMode = isSimpleInline && authMode === "register";
    const simpleCardClassName =
      "overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_26px_80px_rgba(15,23,42,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95";
    const simpleInputClassName =
      "h-[60px] rounded-[14px] border-slate-200 bg-[#eaf2ff]/80 px-5 text-[17px] text-slate-950 shadow-inner shadow-white/40 placeholder:text-slate-400 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50";
    const defaultInputClassName = "h-10 rounded-md bg-muted/45";

    const hasBaseCredentials = username.trim() !== "" && password.trim() !== "";
    const isFormValid = isRegisterMode
      ? hasBaseCredentials && confirmPassword.trim() !== ""
      : hasBaseCredentials;

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

    const handleRegister = async () => {
      if (!isFormValid) {
        setErrorMsg(
          t(
            "login.required_register_credentials",
            "请输入邮箱/用户名、密码和确认密码",
          ),
        );
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg(t("login.password_mismatch", "两次输入的密码不一致"));
        return;
      }

      setErrorMsg("");
      setIsLoading(true);
      try {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 200) {
          const nextAccount = await refresh();
          if (typeof onLoginSuccess === "function") {
            onLoginSuccess();
            return;
          }
          window.open(getDefaultAdminPath(nextAccount), "_self");
        } else {
          setErrorMsg(
            data.message
              ? formatApiErrorMessage(data.message, { status: res.status })
              : t("login.register_failed", "注册失败"),
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
        void (isRegisterMode ? handleRegister() : handleLogin());
      }
    };

    const switchAuthMode = (mode: "login" | "register") => {
      setAuthMode(mode);
      setErrorMsg("");
      setRequire2FA(false);
      setTwoFac("");
      setConfirmPassword("");
    };

    if (loading) {
      if (isSimpleInline) {
        return (
          <Card className={cn(simpleCardClassName, className)}>
            <CardContent className="px-8 py-9 sm:px-10 sm:py-10">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-900" />
              <div className="mx-auto mt-5 h-5 w-40 rounded bg-slate-100 dark:bg-slate-900" />
              <div className="mt-10 h-[60px] rounded-[14px] bg-slate-100 dark:bg-slate-900" />
              <div className="mt-5 h-[60px] rounded-[14px] bg-slate-100 dark:bg-slate-900" />
              <div className="mt-6 h-[60px] rounded-[14px] bg-slate-200 dark:bg-slate-800" />
            </CardContent>
          </Card>
        );
      }
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
      if (isSimpleInline) {
        return (
          <Card className={cn(simpleCardClassName, className)}>
            <CardContent className="px-8 py-9 sm:px-10 sm:py-10">
              <div className="flex flex-col items-center text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                  <AlertCircle className="h-7 w-7" />
                </span>
                <h1 className="mt-5 text-[21px] font-medium text-slate-700 dark:text-slate-200">
                  {t("login.title")}
                </h1>
              </div>
              <Alert variant="destructive" className="mt-8">
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
            void (isRegisterMode ? handleRegister() : handleLogin());
          }
        }}
        className={isSimpleInline ? "flex flex-col gap-5" : "flex flex-col gap-4"}
      >
        <div className={isSimpleInline ? "grid gap-6" : "grid gap-4"}>
          <label className="grid gap-2">
            <div className={isSimpleInline ? "text-[17px] font-semibold leading-6 text-slate-950 dark:text-slate-50" : "text-[12px] font-semibold leading-4 text-muted-foreground"}>
              {isSimpleInline ? t("login.email", { defaultValue: "邮箱" }) : t("login.username")}
            </div>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isSimpleInline ? "name@example.com" : "admin"}
              disabled={isLoading}
              autoFocus
              className={isSimpleInline ? simpleInputClassName : defaultInputClassName}
            />
          </label>
          <label className="grid gap-2">
            <div className={isSimpleInline ? "text-[17px] font-semibold leading-6 text-slate-950 dark:text-slate-50" : "text-[12px] font-semibold leading-4 text-muted-foreground"}>
              {t("login.password")}
            </div>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              type="password"
              placeholder={t("login.password_placeholder")}
              disabled={isLoading}
              className={isSimpleInline ? simpleInputClassName : defaultInputClassName}
            />
          </label>
          <label hidden={!isRegisterMode} className="grid gap-2">
            <div className={isSimpleInline ? "text-[17px] font-semibold leading-6 text-slate-950 dark:text-slate-50" : "text-[12px] font-semibold leading-4 text-muted-foreground"}>
              {t("login.confirm_password", { defaultValue: "确认密码" })}
            </div>
            <Input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              type="password"
              placeholder={t("login.confirm_password_placeholder", { defaultValue: "请再次输入密码" })}
              disabled={isLoading}
              className={isSimpleInline ? simpleInputClassName : defaultInputClassName}
            />
          </label>
          <label hidden={!require2FA || isRegisterMode} className="grid gap-2">
            <div className={isSimpleInline ? "text-[17px] font-semibold leading-6 text-slate-950 dark:text-slate-50" : "text-[12px] font-semibold leading-4 text-muted-foreground"}>
              {t("login.two_factor")}
            </div>
            <Input
              value={twoFac}
              onChange={(e) => setTwoFac(e.target.value)}
              onKeyDown={handleKeyDown}
              type="text"
              placeholder="000000"
              disabled={isLoading}
              className={isSimpleInline ? simpleInputClassName : defaultInputClassName}
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
        <Button
          type="submit"
          disabled={isLoading || !isFormValid}
          className={isSimpleInline
            ? "h-[60px] w-full rounded-[14px] bg-slate-950 text-[18px] font-semibold text-white shadow-none hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            : "h-10 w-full"}
        >
          {isSimpleInline
            ? isRegisterMode
              ? <UserPlus className="h-5 w-5" />
              : <LogIn className="h-5 w-5" />
            : <KeyRound className="h-4 w-4" />}
          {isLoading
            ? isRegisterMode
              ? t("login.registering", "注册中...")
              : t("login.logging_in", "登录中...")
            : isRegisterMode
              ? t("login.register", { defaultValue: "注册" })
              : t("login.title")}
        </Button>
      </form>
    );

    if (isSimpleInline) {
      return (
        <Card className={cn(simpleCardClassName, className)}>
          <CardContent className="px-8 py-9 sm:px-10 sm:py-10">
            <div className="flex flex-col items-center text-center">
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900">
                <img
                  src="/favicon.ico"
                  alt=""
                  className="h-10 w-10 object-contain"
                  aria-hidden="true"
                />
              </span>
              <h1 className="mt-5 text-[21px] font-medium leading-8 text-slate-600 dark:text-slate-300">
                {siteName}
              </h1>
            </div>

            <div className="mt-9">
              {loginFields}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-[16px] leading-6">
              <div>
                <span className="text-slate-500 dark:text-slate-400">
                  {isRegisterMode
                    ? t("login.has_account", { defaultValue: "已有账号？" })
                    : t("login.no_account", { defaultValue: "还没有账号？" })}
                </span>
                <button
                  type="button"
                  className="ml-2 font-medium text-slate-900 underline-offset-4 hover:underline dark:text-slate-100"
                  onClick={() => switchAuthMode(isRegisterMode ? "login" : "register")}
                >
                  {isRegisterMode
                    ? t("login.title")
                    : t("login.register", { defaultValue: "注册" })}
                </button>
              </div>
              {!isRegisterMode ? (
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {t("login.forgot_password", { defaultValue: "忘记密码？" })}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      );
    }

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
              <Badge variant="secondary">
                {t("login.secure", { defaultValue: "安全登录" })}
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
