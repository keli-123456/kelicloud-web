import React from "react";

import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { AccountProvider, useAccount } from "@/contexts/AccountContext";
import {
  Badge,
  Button,
  Dialog,
  Flex,
  TextField,
} from "@/components/admin/admin-ui";
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
  if (loading) {
    return <Loading />;
  }
  if (error) {
    return <div>{error.message}</div>;
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
      description="集中管理管理员身份、密码、双重验证与第三方登录绑定。"
      stats={[
        {
          label: "当前用户",
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
            ? "双重验证已启用。"
            : "建议开启双重验证提升后台安全性。",
          tone: account?.["2fa_enabled"] ? "emerald" : "amber",
        },
        {
          label: "SSO",
          value: boundProvider,
          hint: ssoInfo?.isBound ? `已绑定 ${boundProvider}` : "尚未绑定第三方登录账号。",
          tone: ssoInfo?.isBound ? "blue" : "slate",
        },
      ]}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
        <AdminSurface className="flex flex-col gap-6">
          <div className="space-y-2">
            <label className="text-xl font-semibold tracking-tight text-slate-900">
              账户资料
            </label>
            <p className="text-sm leading-6 text-slate-500">
              更新用户名和登录密码。密码更新成功后会重新跳转回首页。
            </p>
          </div>
          <form
            className="flex gap-3 flex-col"
            onSubmit={handleSubmitUsernameChange}
          >
            <label className="text-sm font-medium text-slate-700" htmlFor="username">
              {t("account.change_username_title")}
            </label>

            <TextField.Root
              className="max-w-xl rounded-xl border border-slate-200/80 bg-white shadow-sm"
              id="username"
              name="username"
              defaultValue={account?.username}
            />
            <div>
              <Button disabled={usernameSaving} type="submit" className="rounded-xl">
                {t("account.change_username_button")}
              </Button>
            </div>
          </form>

          <div className="h-px bg-[linear-gradient(90deg,rgba(148,163,184,0.10),rgba(148,163,184,0.65),rgba(148,163,184,0.10))]" />

          <form onSubmit={changePassword} className="flex flex-col gap-3">
            <label className="text-sm font-medium text-slate-700" htmlFor="old_password">
              {t("account.change_password_title")}
            </label>
            <label className="text-sm text-slate-600" htmlFor="password">
              {t("account.new_password")}
            </label>
            <TextField.Root
              className="max-w-xl rounded-xl border border-slate-200/80 bg-white shadow-sm"
              id="password"
              name="password"
              type="password"
            />
            <label htmlFor="password_repeat">
              {t("account.new_password_repeat")}
            </label>
            <TextField.Root
              className="max-w-xl rounded-xl border border-slate-200/80 bg-white shadow-sm"
              id="password_repeat"
              name="password_repeat"
              type="password"
            />
            <div>
              <Button disabled={passwordSaving} type="submit" className="rounded-xl">
                {t("account.change_password_button")}
              </Button>
            </div>
          </form>
        </AdminSurface>

        <AdminSurface className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <label className="text-xl font-semibold tracking-tight text-slate-900">
                安全与登录
              </label>
              <p className="text-sm leading-6 text-slate-500">
                统一管理双重验证与单点登录绑定状态。
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
            <label className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              {t("settings.sso.title")}
            </label>
            <div className="border-l-2 border-slate-200 pl-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center text-slate-700">
                  {providerIcon}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    {ssoInfo?.isBound
                      ? `${boundProvider} 账户`
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
                    <span className="text-sm text-slate-600">
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
                    <Button className="rounded-xl">
                      {t("account_settings.unbind_sso", { provider: boundProvider })}
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Content>
                    <Dialog.Title>
                      {t("account_settings.confirm_unbind")}
                    </Dialog.Title>
                    <Dialog.Description>
                      {t("account_settings.unbind_sso_warning", {
                        provider: boundProvider,
                      })}
                    </Dialog.Description>
                    <Flex gap="2" justify="end" className="mt-4">
                      <Dialog.Close>
                        <Button variant="soft" className="rounded-xl">
                          {t("account_settings.cancel")}
                        </Button>
                      </Dialog.Close>
                      <Button color="red" onClick={handleSSOAuth} className="rounded-xl">
                        {t("account_settings.confirm_unbind")}
                      </Button>
                    </Flex>
                  </Dialog.Content>
                </Dialog.Root>
              ) : (
                <Button onClick={handleSSOAuth} className="rounded-xl">
                  <User className="size-4" />
                  {t("account_settings.bind_sso")}
                </Button>
              )}
            </div>
          </div>

          <div className="border-l-2 border-sky-300 pl-4 text-sm text-sky-800">
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
  }, [isOpen]);

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
    <Flex direction="column" gap="2">
      <label className="text-lg font-bold">{t("account.2fa_disabled")}</label>
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Trigger>
          <div>
            <Button className="w-full rounded-xl">{t("account.enable_2fa")}</Button>
          </div>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>{t("account.enable_2fa")}</Dialog.Title>
          <Flex direction="column" gap="2">
            <label>{t("account.2fa_qr_code_hint")}</label>
            <div className="flex justify-center">
              {isLoading ? (
                <Skeleton className="h-[200px] w-[200px]" />
              ) : (
                <img src={qrcode!} alt="2FA QR Code" width={200} height={200} />
              )}
            </div>
            <label>{t("account.2fa_otp_input_prompt")}</label>
            <form className="flex flex-col gap-2" onSubmit={handleEnable2fa}>
              <TextField.Root
                type="number"
                name="code"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode((e.target as HTMLInputElement).value)}
              />
              <Button disabled={saving} type="submit" className="rounded-xl">
                {t("account.enable_2fa")}
              </Button>
            </form>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
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
          throw new Error(data.message || "Failed to disable 2FA");
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
    <Flex direction="column" gap="2">
      <label>{t("account.2fa_enabled")}</label>
      <div>
        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
          <Dialog.Trigger>
            <Button className="ml-2 rounded-xl" color="red">
              {t("account.disable_2fa")}
            </Button>
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Title>{t("account.disable_2fa")}</Dialog.Title>
            <Dialog.Description>
              {t("account.disable_2fa_confirmation")}
            </Dialog.Description>
            <Flex gap="2" justify="end" className="mt-4">
              <Button variant="soft" onClick={() => setIsOpen(false)} className="rounded-xl">
                {t("common.cancel")}
              </Button>
              <Button
                disabled={saving}
                color="red"
                onClick={disable2fa}
                className="rounded-xl"
              >
                {t("common.confirm")}
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      </div>
    </Flex>
  );
};

export default Account;
