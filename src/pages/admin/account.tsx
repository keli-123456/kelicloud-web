import React from "react";

import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { AccountProvider, useAccount } from "@/contexts/AccountContext";
import {
  Badge,
  Button,
  Dialog,
  TextField,
} from "@/components/admin/admin-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Github, Globe, User } from "lucide-react";
import {
  AdminCardGridSkeleton,
  AdminPageShell,
  AdminSurface,
} from "@/components/admin/AdminPageShell";
import {
  ADMIN_FORM_DIALOG_CLASS,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_SCROLL_CLASS,
} from "@/components/admin/AdminFormStyles";

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
  if (loading) {
    return (
      <AdminPageShell
        eyebrow={t("account.title")}
        title={t("account.title")}
        description={t(
          "account.page_description",
          "Manage your admin identity, password, two-factor authentication, and external sign-in bindings in one place.",
        )}
        statsVariant="cards"
        stats={[
          {
            label: t("account.stats.current_user_label", "Current user"),
            value: <Skeleton className="h-6 w-24" />,
            tone: "blue",
          },
          {
            label: "2FA",
            value: <Skeleton className="h-6 w-20" />,
            tone: "amber",
          },
          {
            label: "SSO",
            value: <Skeleton className="h-6 w-24" />,
            tone: "slate",
          },
        ]}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
          <AdminCardGridSkeleton cards={2} className="xl:col-span-2" />
        </div>
      </AdminPageShell>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  function handleSubmitUsernameChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsernameSaving(true);
    fetch("/api/admin/update/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uuid: account?.uuid,
        username: (event.currentTarget as HTMLFormElement).username.value,
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
        toast.error(error.message);
      })
      .finally(() => {
        setUsernameSaving(false);
      });
  }
  function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const password = form.password.value;
    const password_repeat = form.password_repeat.value;
    if (!password || !password_repeat) {
      toast.error(t("account.password_empty_error"));
      return;
    }
    if (password !== password_repeat) {
      toast.error(t("account.password_mismatch_error"));
      return;
    }
    if (password.length < 8) {
      toast.error(t("account.password_too_short_error"));
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      toast.error(t("account.password_strength_error"));
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
          <label className="text-xl font-semibold tracking-normal text-slate-900 dark:text-slate-50">
              {t("account.profile_title", "Profile")}
            </label>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t(
                "account.profile_description",
                "Update your username and login password. After a successful password change, you will be redirected to the homepage.",
              )}
            </p>
          </div>
          <form className="max-w-xl space-y-4" onSubmit={handleSubmitUsernameChange}>
            <div className={ADMIN_FORM_FIELD_CLASS}>
              <label
                data-slot="label"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
                htmlFor="username"
              >
                {t("account.change_username_title")}
              </label>
              <TextField.Root
                className="w-full"
                id="username"
                name="username"
                defaultValue={account?.username}
              />
            </div>
            <div>
              <Button disabled={usernameSaving} type="submit">
                {t("account.change_username_button")}
              </Button>
            </div>
          </form>

          <div className="h-px bg-[linear-gradient(90deg,rgba(148,163,184,0.10),rgba(148,163,184,0.65),rgba(148,163,184,0.10))]" />

          <form onSubmit={changePassword} className="max-w-xl space-y-4">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("account.change_password_title")}
            </label>
            <div className={ADMIN_FORM_FIELD_CLASS}>
              <label
                data-slot="label"
                className="text-sm text-slate-600 dark:text-slate-400"
                htmlFor="password"
              >
                {t("account.new_password")}
              </label>
              <TextField.Root
                className="w-full"
                id="password"
                name="password"
                type="password"
              />
            </div>
            <div className={ADMIN_FORM_FIELD_CLASS}>
              <label
                data-slot="label"
                className="text-sm text-slate-600 dark:text-slate-400"
                htmlFor="password_repeat"
              >
                {t("account.new_password_repeat")}
              </label>
              <TextField.Root
                className="w-full"
                id="password_repeat"
                name="password_repeat"
                type="password"
              />
            </div>
            <div>
              <Button disabled={passwordSaving} type="submit">
                {t("account.change_password_button")}
              </Button>
            </div>
          </form>
        </AdminSurface>

        <AdminSurface className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
          <label className="text-xl font-semibold tracking-normal text-slate-900 dark:text-slate-50">
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
              color={account?.["2fa_enabled"] ? "green" : "amber"}
              className="rounded-full px-3 py-1"
            >
              {account?.["2fa_enabled"] ? "Protected" : "Pending"}
            </Badge>
          </div>

          <div className="space-y-3">
              <label className="text-sm font-medium uppercase tracking-normal text-slate-500">
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
              <label className="text-sm font-medium uppercase tracking-normal text-slate-500 dark:text-slate-400">
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
                      color={ssoInfo?.isBound ? "green" : "gray"}
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
                <Dialog.Root>
                  <Dialog.Trigger>
                    <Button>
                      {t("account_settings.unbind_sso", { provider: boundProvider })}
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={520}>
                    <Dialog.Title>
                      {t("account_settings.confirm_unbind")}
                    </Dialog.Title>
                    <Dialog.Description className={`${ADMIN_FORM_SCROLL_CLASS} mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400`}>
                      {t("account_settings.unbind_sso_warning", {
                        provider: boundProvider,
                      })}
                    </Dialog.Description>
                    <div className="flex justify-end gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
                      <Dialog.Close>
                        <Button variant="soft">
                          {t("account_settings.cancel")}
                        </Button>
                      </Dialog.Close>
                      <Button color="red" onClick={handleSSOAuth}>
                        {t("account_settings.confirm_unbind")}
                      </Button>
                    </div>
                  </Dialog.Content>
                </Dialog.Root>
              ) : (
                <Button onClick={handleSSOAuth}>
                  <User className="size-4" />
                  {t("account_settings.bind_sso")}
                </Button>
              )}
            </div>
          </div>

          <div className="border-l-2 border-sky-300 pl-4 text-sm text-sky-800 dark:border-sky-700 dark:text-sky-300">
            {t("account_settings.looking_for_backup")}
          </div>
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
    if (!code) {
      toast.error(t("account.otp_empty_error"));
      return;
    }
    setSaving(true);
    fetch(`/api/admin/2fa/enable?code=${encodeURIComponent(code)}`, {
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
        setIsOpen(false);
        refresh();
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-3">
      <label className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {t("account.2fa_disabled")}
      </label>
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Trigger>
          <div>
            <Button className="w-full">{t("account.enable_2fa")}</Button>
          </div>
        </Dialog.Trigger>
        <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={560}>
          <Dialog.Title>{t("account.enable_2fa")}</Dialog.Title>
          <div className={`${ADMIN_FORM_SCROLL_CLASS} mt-1 space-y-4`}>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
              {t("account.2fa_qr_code_hint")}
            </p>
            <div className="flex justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              {isLoading ? (
                <Skeleton className="h-[200px] w-[200px]" />
              ) : (
                <img src={qrcode!} alt="2FA QR Code" width={200} height={200} />
              )}
            </div>
            <form className="space-y-4" onSubmit={handleEnable2fa}>
              <div className={ADMIN_FORM_FIELD_CLASS}>
                <label
                  data-slot="label"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  {t("account.2fa_otp_input_prompt")}
                </label>
                <TextField.Root
                  className="w-full"
                  type="number"
                  name="code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode((e.target as HTMLInputElement).value)}
                />
              </div>
              <div className="flex justify-end border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
                <Button disabled={saving} type="submit">
                  {t("account.enable_2fa")}
                </Button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Root>
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
    <div className="space-y-3">
      <label className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {t("account.2fa_enabled")}
      </label>
      <div>
        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
          <Dialog.Trigger>
            <Button color="red">
              {t("account.disable_2fa")}
            </Button>
          </Dialog.Trigger>
          <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={520}>
            <Dialog.Title>{t("account.disable_2fa")}</Dialog.Title>
            <Dialog.Description className={`${ADMIN_FORM_SCROLL_CLASS} mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400`}>
              {t("account.disable_2fa_confirmation")}
            </Dialog.Description>
            <div className="flex justify-end gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
              <Button variant="soft" onClick={() => setIsOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                disabled={saving}
                color="red"
                onClick={disable2fa}
              >
                {t("common.confirm")}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Root>
      </div>
    </div>
  );
};

export default Account;
