import React from "react";

import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { AccountProvider, useAccount } from "@/contexts/AccountContext";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Badge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  FormActions,
  FormErrorText,
  FormField,
  FormHelpText,
  FormSection,
  FormShell,
} from "@/components/ui/form-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Github, Globe, User } from "lucide-react";
import Loading from "@/components/loading";
import {
  AdminPageShell,
  AdminSurface,
} from "@/components/admin/AdminPageShell";

const Account = () => {
  return (
    <AccountProvider>
      <InnerLayout />
    </AccountProvider>
  );
};

const InnerLayout = () => {
  const { t } = useTranslation();
  const { account, loading, error, refresh } = useAccount();
  const [usernameSaving, setUsernameSaving] = React.useState(false);
  const [passwordSaving, setPasswordSaving] = React.useState(false);
  const [usernameFormError, setUsernameFormError] = React.useState("");
  const [passwordFormError, setPasswordFormError] = React.useState("");
  if (loading) {
    return <Loading />;
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  function handleSubmitUsernameChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsernameFormError("");
    const nextUsername = (event.currentTarget as HTMLFormElement).username.value.trim();
    if (!nextUsername) {
      setUsernameFormError(
        t("account.username_required_error", {
          defaultValue: "Username is required.",
        }),
      );
      return;
    }
    if (nextUsername.length < 3) {
      setUsernameFormError(
        t("account.username_too_short_error", {
          defaultValue: "Username must be at least 3 characters.",
        }),
      );
      return;
    }

    setUsernameSaving(true);
    fetch("/api/admin/update/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uuid: account?.uuid,
        username: nextUsername,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to update username");
        }
        return response.json();
      })
      .then(() => {
        toast.success(t("common.updated_successfully"));
      })
      .catch((error) => {
        setUsernameFormError(error.message);
        toast.error(error.message);
      })
      .finally(() => {
        setUsernameSaving(false);
      });
  }
  function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordFormError("");
    const form = event.currentTarget as HTMLFormElement;
    const password = form.password.value.trim();
    const password_repeat = form.password_repeat.value.trim();
    if (!password || !password_repeat) {
      setPasswordFormError(t("account.password_empty_error"));
      return;
    }
    if (password !== password_repeat) {
      setPasswordFormError(t("account.password_mismatch_error"));
      return;
    }
    if (password.length < 8) {
      setPasswordFormError(t("account.password_too_short_error"));
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setPasswordFormError(t("account.password_strength_error"));
      return;
    }
    setPasswordSaving(true);
    fetch("/api/admin/update/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uuid: account?.uuid,
        password: password,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to update password");
        }
        return response.json();
      })
      .then(() => {
        toast.success(t("common.updated_successfully"));
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      })
      .catch((error) => {
        setPasswordFormError(error.message);
        toast.error(error.message);
      })
      .finally(() => {
        setPasswordSaving(false);
      });
  }
  
  // SSO 辅助函数
  function getSSOInfo() {
    if (!account?.sso_id) return null;
    
    const [platform, uniqueId] = account.sso_id.split('_', 2);
    return {
      platform: platform || '',
      uniqueId: uniqueId || '',
      isBound: !!account.sso_id
    };
  }
  
  function getSSOIcon(platform: string) {
    switch (platform.toLowerCase()) {
      case 'github':
        return <Github className="size-5" />;
      case 'google':
        return <Globe className="size-5" />;
      default:
        return <User className="size-5" />;
    }
  }
  
  function getSSODisplayName(platform: string) {
    switch (platform.toLowerCase()) {
      case 'github':
        return 'GitHub';
      case 'google':
        return 'Google';
      case 'gitlab':
        return 'GitLab';
      case 'discord':
        return 'Discord';
      default:
        return platform.charAt(0).toUpperCase() + platform.slice(1);
    }
  }
  
  const handleSSOAuth = async () => {
    try {
      const ssoInfo = getSSOInfo();
      if (ssoInfo?.isBound) {
        // 解绑SSO
        const response = await fetch("/api/admin/oauth2/unbind", {
          method: "POST",
        });

        if (response.ok) {
          toast.success(t("account_settings.unbind_sso_success", { provider: getSSODisplayName(ssoInfo.platform) }));
          refresh(); // 刷新用户信息
        } else {
          const error = await response.json();
          toast.error(t("account_settings.unbind_sso_failed", { 
            provider: getSSODisplayName(ssoInfo.platform),
            error: error.message || t("account_settings.unknown_error")
          }));
        }
      } else {
        window.location.href = "/api/admin/oauth2/bind";
      }
    } catch (error) {
      console.error("处理SSO认证失败:", error);
      toast.error(t("account_settings.sso_auth_failed"));
    }
  };

  const ssoInfo = getSSOInfo();
  const boundProvider = ssoInfo?.isBound
    ? getSSODisplayName(ssoInfo.platform)
    : t("account_settings.sso_unbound");
  const providerIcon = ssoInfo?.isBound ? (
    getSSOIcon(ssoInfo.platform)
  ) : (
    <User className="size-5" />
  );

  return (
    <AdminPageShell
      eyebrow={t("account.title")}
      title={t("account.greeting", { username: account?.username })}
      description={t(
        "account.page_description",
        "Manage your admin identity, password, two-factor authentication, and external sign-in bindings in one place.",
      )}
      stats={[
        {
          label: t("account.stats.current_user_label", "Current user"),
          value: account?.username || "-",
          hint: `UUID: ${account?.uuid || "-"}`,
          tone: "blue",
        },
        {
          label: "2FA",
          value: account?.["2fa_enabled"]
            ? t("account.2fa_enabled")
            : t("account.2fa_disabled"),
          hint: account?.["2fa_enabled"]
            ? t("account.stats.two_factor_enabled_hint", "Two-factor authentication is enabled.")
            : t("account.stats.two_factor_disabled_hint", "Enable two-factor authentication to improve admin security."),
          tone: account?.["2fa_enabled"] ? "emerald" : "amber",
        },
        {
          label: "SSO",
          value: boundProvider,
          hint: ssoInfo?.isBound
            ? t("account.stats.sso_bound_hint", {
                provider: boundProvider,
                defaultValue: "Bound to {{provider}}.",
              })
            : t(
                "account.stats.sso_unbound_hint",
                "No external sign-in account is bound yet.",
              ),
          tone: ssoInfo?.isBound ? "blue" : "slate",
        },
      ]}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
        <AdminSurface className="flex flex-col gap-6">
          <div className="space-y-2">
            <label className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {t("account.profile_title", "Profile")}
            </label>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t(
                "account.profile_description",
                "Update your username and login password. After a successful password change, you will be redirected to the homepage.",
              )}
            </p>
          </div>
          <form
            className="space-y-4"
            onSubmit={handleSubmitUsernameChange}
          >
            <FormShell className="max-w-xl">
              <FormSection title={t("account.change_username_title")}>
                <FormField
                  label={t("login.username")}
                  htmlFor="username"
                  required
                >
                  <Input
                    className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-950"
                    id="username"
                    name="username"
                    defaultValue={account?.username}
                  />
                </FormField>
              </FormSection>
            </FormShell>

            {usernameFormError ? <FormErrorText>{usernameFormError}</FormErrorText> : null}

            <FormActions className="max-w-xl">
              <Button disabled={usernameSaving} type="submit" className="rounded-xl">
                {t("account.change_username_button")}
              </Button>
            </FormActions>
          </form>

          <div className="h-px bg-[linear-gradient(90deg,rgba(148,163,184,0.10),rgba(148,163,184,0.65),rgba(148,163,184,0.10))]" />

          <form onSubmit={changePassword} className="space-y-4">
            <FormShell className="max-w-xl">
              <FormSection title={t("account.change_password_title")}>
                <FormField label={t("account.new_password")} htmlFor="password" required>
                  <Input
                    className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-950"
                    id="password"
                    name="password"
                    type="password"
                  />
                </FormField>
                <FormField
                  label={t("account.new_password_repeat")}
                  htmlFor="password_repeat"
                  required
                >
                  <Input
                    className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-950"
                    id="password_repeat"
                    name="password_repeat"
                    type="password"
                  />
                  <FormHelpText>
                    {t("account.password_strength_error")}
                  </FormHelpText>
                </FormField>
              </FormSection>
            </FormShell>

            {passwordFormError ? <FormErrorText>{passwordFormError}</FormErrorText> : null}

            <FormActions className="max-w-xl">
              <Button disabled={passwordSaving} type="submit" className="rounded-xl">
                {t("account.change_password_button")}
              </Button>
            </FormActions>
          </form>
        </AdminSurface>

        <AdminSurface className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <label className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {t("account.security_title", "Security & Sign-in")}
              </label>
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                {t(
                  "account.security_description",
                  "Manage two-factor authentication and single sign-on bindings from one place.",
                )}
              </p>
            </div>
            <Badge
              variant={account?.["2fa_enabled"] ? "success" : "warning"}
              className="rounded-full px-3 py-1"
            >
              {account?.["2fa_enabled"] ? "Protected" : "Pending"}
            </Badge>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              2FA
            </label>
            {account?.["2fa_enabled"] ? (
              <TwoFactorEnabled />
            ) : (
              <TwoFactorDisabled />
            )}
          </div>

          <div className="h-px bg-[linear-gradient(90deg,rgba(148,163,184,0.10),rgba(148,163,184,0.65),rgba(148,163,184,0.10))]" />

          <div className="space-y-4">
            <label className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t("settings.sso.title")}
            </label>
            <div className="border-l-2 border-slate-200 pl-4 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center text-slate-700 dark:text-slate-200">
                  {providerIcon}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {ssoInfo?.isBound
                      ? t("account.sso_provider_account", {
                          provider: boundProvider,
                          defaultValue: "{{provider}} account",
                        })
                      : t("account_settings.sso_account")}
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={ssoInfo?.isBound ? "success" : "secondary"}
                      className="rounded-full px-3 py-1"
                    >
                      {ssoInfo?.isBound
                        ? t("account_settings.sso_bound")
                        : t("account_settings.sso_unbound")}
                    </Badge>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {ssoInfo?.isBound
                        ? `${boundProvider} ID: ${ssoInfo.uniqueId}`
                        : t("account_settings.sso_not_bound")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              {ssoInfo?.isBound ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="rounded-xl">
                      {t("account_settings.unbind_sso", { provider: boundProvider })}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogTitle>
                      {t("account_settings.confirm_unbind")}
                    </DialogTitle>
                    <DialogDescription>
                      {t("account_settings.unbind_sso_warning", {
                        provider: boundProvider,
                      })}
                    </DialogDescription>
                    <div className="mt-4 flex justify-end gap-2">
                      <DialogClose asChild>
                        <Button variant="outline" className="rounded-xl">
                          {t("account_settings.cancel")}
                        </Button>
                      </DialogClose>
                      <Button variant="destructive" onClick={handleSSOAuth} className="rounded-xl">
                        {t("account_settings.confirm_unbind")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button onClick={handleSSOAuth} className="rounded-xl">
                  <User className="size-4" />
                  {t("account_settings.bind_sso")}
                </Button>
              )}
            </div>
          </div>

          <Alert className="border-border/70 bg-card">
            <AlertDescription>{t("account_settings.looking_for_backup")}</AlertDescription>
          </Alert>
        </AdminSurface>
      </div>
    </AdminPageShell>
  );
};
const TwoFactorDisabled = () => {
  const { t } = useTranslation();
  const { refresh } = useAccount();
  const [saving, setSaving] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [qrcode, setQRCode] = React.useState<string | null>(null);
  const [code, setCode] = React.useState<string>("");
  const [formError, setFormError] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch("/api/admin/2fa/generate")
        .then((response) => {
          if (!response.ok) {
            throw new Error(t("account.qr_fetch_error"));
          }
          return response.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setQRCode(url);
        })
        .catch((err) => toast.error(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, t]);

  const handleEnable2fa = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code.trim()) {
      const message = t("account.otp_empty_error");
      setFormError(message);
      toast.error(message);
      return;
    }
    setFormError("");
    setSaving(true);
    fetch(`/api/admin/2fa/enable?code=${encodeURIComponent(code.trim())}`, {
      method: "POST",
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(
            data.message || `Failed to enable 2FA (${res.status})`
          );
        }
        return res.json();
      })
      .then(() => {
        toast.success(t("common.updated_successfully"));
        setCode("");
        setIsOpen(false);
        refresh();
      })
      .catch((err) => {
        setFormError(err.message);
        toast.error(err.message);
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-lg font-bold">{t("account.2fa_disabled")}</label>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setCode("");
            setFormError("");
          }
        }}
      >
        <DialogTrigger asChild>
          <Button className="w-full rounded-xl">{t("account.enable_2fa")}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>{t("account.enable_2fa")}</DialogTitle>
          <form className="mt-4 space-y-4" onSubmit={handleEnable2fa}>
            <FormShell>
              <FormSection title={t("account.2fa_qr_code_hint")}>
                <div className="flex justify-center">
                  {isLoading ? (
                    <Skeleton className="h-[200px] w-[200px]" />
                  ) : (
                    <img src={qrcode!} alt="2FA QR Code" width={200} height={200} />
                  )}
                </div>
              </FormSection>
              <FormSection>
                <FormField
                  label={t("account.2fa_otp_input_prompt")}
                  htmlFor="two-factor-code"
                  required
                >
                  <Input
                    id="two-factor-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="code"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode((e.target as HTMLInputElement).value)}
                  />
                </FormField>
              </FormSection>
            </FormShell>

            {formError ? <FormErrorText>{formError}</FormErrorText> : null}

            <FormActions>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {t("common.cancel")}
                </Button>
              </DialogClose>
              <Button disabled={saving || isLoading} type="submit" className="rounded-xl">
                {saving ? t("loading") : t("account.enable_2fa")}
              </Button>
            </FormActions>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TwoFactorEnabled = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const { refresh } = useAccount();
  const disable2fa = () => {
    setSaving(true);
    fetch("/api/admin/2fa/disable", {
      method: "POST",
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || t("account.disable_2fa_failed", "Failed to disable 2FA"));
        }
        return response.json();
      })
      .then(() => {
        toast.success(t("common.updated_successfully"));
        setIsOpen(false);
        refresh();
      })
      .catch((error) => {
        toast.error(error.message);
      })
      .finally(() => {
        setSaving(false);
      });
  };
  return (
    <div className="flex flex-col gap-2">
      <label>{t("account.2fa_enabled")}</label>
      <div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="ml-2 rounded-xl" variant="destructive">
              {t("account.disable_2fa")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>{t("account.disable_2fa")}</DialogTitle>
            <DialogDescription>
              {t("account.disable_2fa_confirmation")}
            </DialogDescription>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">
                {t("common.cancel")}
              </Button>
              <Button
                disabled={saving}
                variant="destructive"
                onClick={disable2fa}
                className="rounded-xl"
              >
                {t("common.confirm")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Account;
