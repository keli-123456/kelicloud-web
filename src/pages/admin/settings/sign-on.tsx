import {
  SettingCardLabel,
  SettingCardSelect,
  SettingCardShortTextInput,
  SettingCardSwitch,
} from "@/components/admin/SettingCard";
import { updateSettingsWithToast, useSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { AdminSettingsSkeleton } from "@/components/admin/AdminPageShell";
import React from "react";
import { renderProviderInputs } from "@/utils/renderProviders";
import { toast } from "sonner";
import { useAccount } from "@/contexts/AccountContext";
import { PlatformAdminNotice } from "@/components/admin/PlatformAdminNotice";

export default function SignOnSettings() {
  const { t } = useTranslation();
  const { platformAdmin, loading: accountLoading } = useAccount();
  const { settings, loading, error } = useSettings("system", {
    enabled: platformAdmin,
  });
  const [providerDefs, setProviderDefs] = React.useState<any>({});
  const [providerList, setProviderList] = React.useState<string[]>([]);
  const [currentProvider, setCurrentProvider] = React.useState<string>("");
  const [providerValues, setProviderValues] = React.useState<any>({});
  const [providerLoading, setProviderLoading] = React.useState(false);
  const [providerError, setProviderError] = React.useState("");


  // Load all provider definitions.
  React.useEffect(() => {
    if (!platformAdmin || loading) return;
    setProviderLoading(true);
    fetch("/api/admin/settings/oidc")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success" && data.data) {
          setProviderDefs(data.data);
          const providers = Object.keys(data.data);
          setProviderList(providers);
          const initialProvider =
            settings.o_auth_provider && providers.includes(settings.o_auth_provider)
              ? settings.o_auth_provider
              : "";
          setCurrentProvider(initialProvider);
        } else {
          setProviderError(
            data.message ||
              t(
                "settings.sso.fetch_providers_error",
                "Failed to load sign-on provider definitions",
              ),
          );
        }
      })
      .catch(() =>
        setProviderError(
          t(
            "settings.sso.fetch_providers_error",
            "Failed to load sign-on provider definitions",
          ),
        ),
      )
      .finally(() => setProviderLoading(false));
  }, [loading, platformAdmin, settings.o_auth_provider, t]);

  // Load settings for the current provider.
  React.useEffect(() => {
    if (!platformAdmin || !currentProvider) return;
    setProviderLoading(true);
    fetch(`/api/admin/settings/oidc?provider=${currentProvider}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success" && data.data) {
          try {
            setProviderValues(JSON.parse(data.data.addition || "{}"));
          } catch {
            setProviderValues({});
          }
        } else {
          setProviderError(
            data.message ||
              t(
                "settings.sso.fetch_settings_error",
                "Failed to load sign-on settings",
              ),
          );
        }
      })
      .catch(() =>
        setProviderError(
          t(
            "settings.sso.fetch_settings_error",
            "Failed to load sign-on settings",
          ),
        ),
      )
      .finally(() => setProviderLoading(false));
  }, [currentProvider, platformAdmin, t]);

  // Save provider settings.
  const handleOidcSave = async (values: any) => {
    setProviderLoading(true);
    setProviderError("");
    const body = {
      name: currentProvider,
      addition: JSON.stringify(values),
    };
    try {
      const res = await fetch("/api/admin/settings/oidc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status !== "success") {
        setProviderError(
          data.message ||
            t("settings.sso.save_error", "Failed to save sign-on settings"),
        );
      } else {
        setProviderValues(values);
      }
    } catch {
      setProviderError(
        t("settings.sso.save_error", "Failed to save sign-on settings"),
      );
    }
    setProviderLoading(false);
  };

  // Provider field rendering is delegated to utils/renderProviders.tsx.

  if (accountLoading) {
    return <AdminSettingsSkeleton sections={4} />;
  }

  if (!platformAdmin) {
    return <PlatformAdminNotice />;
  }

  if (loading || (!providerLoading && providerList.length === 0 && !providerError)) {
    return <AdminSettingsSkeleton sections={5} />;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (providerError) {
    return <p className="text-sm text-destructive">{providerError}</p>;
  }

  return (
    <>
      <SettingCardLabel>{t("settings.sign_on.title")}</SettingCardLabel>
      <SettingCardSwitch
        title={t("settings.sign_on.disable_password", "Disable password login")}
        defaultChecked={settings.disable_password_login}
        onChange={async (checked) => {
          await updateSettingsWithToast({ disable_password_login: checked }, t, "system");
        }}
      />
      <SettingCardLabel>{t("settings.sso.title")}</SettingCardLabel>
      <SettingCardSwitch
        title={t("settings.sso.enable", "Enable Single Sign-On")}
        defaultChecked={settings.o_auth_enabled}
        description={t(
          "settings.sso.enable_description",
          "Allow users to login with third-party accounts (like GitHub)",
        )}
        onChange={async (checked) => {
          await updateSettingsWithToast({ o_auth_enabled: checked }, t, "system");
        }}
      />
      <SettingCardSelect
        title={String(t("settings.sso.provider"))}
        description={String(t("settings.sso.provider_description"))}
        options={providerList.map((p) => ({ value: p, label: p }))}
        value={currentProvider}
        OnSave={async (val: string) => {
          if (val === currentProvider) return;
          await updateSettingsWithToast({ o_auth_provider: val }, t, "system");
          setCurrentProvider(val);
        }}
      />
      {providerLoading ? <AdminSettingsSkeleton sections={2} /> : renderProviderInputs({
        currentProvider,
        providerDefs,
        providerValues,
        translationPrefix: "settings.sso." + currentProvider,
        title: t("settings.sso.provider_fields"),
        description: t("settings.sso.provider_fields_description"),
        footer: t("settings.sso.callback_url_tips", { url: `${window.location.origin}/api/oauth_callback` }),
        setProviderValues,
        handleSave: handleOidcSave,
        t,
      })}
      <SettingCardLabel>API</SettingCardLabel>
      <ApiCard settings={settings} />
    </>
  );
}

const ApiCard = ({ settings }: { settings: Record<string, any> }) => {
  const { t } = useTranslation();
  const [apiValues, setApiValues] = React.useState<string>(settings?.api_key || "" );

  // Generate a 32-character random token.
  const generateRandomString = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'komari-';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Fill the field with a new generated API key.
  const handleGenerateApiKey = () => {
    const newApiKey = generateRandomString();
    setApiValues(newApiKey);
  };

  // Keep the local input in sync with settings.
  React.useEffect(() => {
    if (settings?.api_key) {
      setApiValues(settings.api_key);
    }
  }, [settings?.api_key]);

  return (
    <SettingCardShortTextInput
        title={t("settings.api.title")}
        description={t("settings.api.description")}
        value={apiValues}
        onChange={(e) => setApiValues(e.target.value)}
        OnSave={async (values) => {
          if (!values) {
            await updateSettingsWithToast({ api_key: "" }, t, "system");
            return;
          }
          if (values.length < 12) {
            toast.error(t("settings.api.key_length_error"));
            return;
          }
          await updateSettingsWithToast({ api_key: values }, t, "system");
        }}
      >
        <div className="flex flex-row gap-2 justify-start items-center">
          <Button
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
            onClick={handleGenerateApiKey}
          >
            {t('common.generate')}
          </Button>
        </div>
      </SettingCardShortTextInput>
  )
}
