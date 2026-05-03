import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminSettingsSkeleton } from "@/components/admin/AdminPageShell";
import { PlatformAdminNotice } from "@/components/admin/PlatformAdminNotice";
import {
  SettingCard,
  SettingCardLabel,
  SettingCardSelect,
  SettingCardShortTextInput,
} from "@/components/admin/SettingCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAccount } from "@/contexts/AccountContext";
import { updateSettingsWithToast, useSettings } from "@/lib/api";

type ProxyFormState = {
  outbound_proxy_enabled: boolean;
  outbound_proxy_protocol: string;
  outbound_proxy_host: string;
  outbound_proxy_port: string;
  outbound_proxy_username: string;
  outbound_proxy_password: string;
};

const DEFAULT_FORM: ProxyFormState = {
  outbound_proxy_enabled: false,
  outbound_proxy_protocol: "socks5",
  outbound_proxy_host: "",
  outbound_proxy_port: "1080",
  outbound_proxy_username: "",
  outbound_proxy_password: "",
};

function parseProxyCredentialLine(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("://")) {
    return null;
  }
  const parts = trimmed.split(":");
  if (parts.length < 4) {
    return null;
  }
  const port = Number.parseInt(parts[1], 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return null;
  }
  const host = parts[0]?.trim() || "";
  const username = parts[2]?.trim() || "";
  const password = parts.slice(3).join(":");
  if (!host || !username || !password) {
    return null;
  }
  return {
    host,
    port: String(port),
    username,
    password,
  };
}

function normalizeProxyForm(form: ProxyFormState): ProxyFormState {
  const parsed = parseProxyCredentialLine(form.outbound_proxy_host);
  return {
    ...form,
    outbound_proxy_host: parsed?.host || form.outbound_proxy_host.trim(),
    outbound_proxy_port: parsed?.port || form.outbound_proxy_port.trim() || "1080",
    outbound_proxy_username:
      form.outbound_proxy_username.trim() || parsed?.username || "",
    outbound_proxy_password: form.outbound_proxy_password || parsed?.password || "",
  };
}

function buildProxyPayload(form: ProxyFormState) {
  return {
    outbound_proxy_enabled: form.outbound_proxy_enabled,
    outbound_proxy_protocol: form.outbound_proxy_protocol,
    outbound_proxy_host: form.outbound_proxy_host,
    outbound_proxy_port:
      Number.parseInt(form.outbound_proxy_port || "1080", 10) || 1080,
    outbound_proxy_username: form.outbound_proxy_username,
    outbound_proxy_password: form.outbound_proxy_password,
  };
}

type ProxyProbeResult = {
  mode: "proxy" | "direct" | "direct_fallback";
  ipv4?: string;
  ipv6?: string;
  ipv4_url?: string;
  ipv6_url?: string;
  proxy_error?: string;
};

export default function ProxySettings() {
  const { t } = useTranslation();
  const { platformAdmin, loading: accountLoading } = useAccount();
  const { settings, loading, error, refetch } = useSettings("system", {
    enabled: platformAdmin,
  });
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [form, setForm] = React.useState<ProxyFormState>(DEFAULT_FORM);
  const [probeResult, setProbeResult] = React.useState<ProxyProbeResult | null>(
    null,
  );

  React.useEffect(() => {
    if (!platformAdmin) {
      return;
    }
    const parsed = parseProxyCredentialLine(settings.outbound_proxy_host || "");
    setForm({
      outbound_proxy_enabled: Boolean(settings.outbound_proxy_enabled),
      outbound_proxy_protocol: settings.outbound_proxy_protocol || "socks5",
      outbound_proxy_host: parsed?.host || settings.outbound_proxy_host || "",
      outbound_proxy_port: parsed?.port || `${settings.outbound_proxy_port || 1080}`,
      outbound_proxy_username:
        settings.outbound_proxy_username || parsed?.username || "",
      outbound_proxy_password:
        settings.outbound_proxy_password || parsed?.password || "",
    });
  }, [
    platformAdmin,
    settings.outbound_proxy_enabled,
    settings.outbound_proxy_protocol,
    settings.outbound_proxy_host,
    settings.outbound_proxy_port,
    settings.outbound_proxy_username,
    settings.outbound_proxy_password,
  ]);

  if (accountLoading || loading) {
    return <AdminSettingsSkeleton sections={3} />;
  }

  if (!platformAdmin) {
    return <PlatformAdminNotice />;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  const handleSave = async () => {
    const normalizedForm = normalizeProxyForm(form);
    const normalizedPort = normalizedForm.outbound_proxy_port;

    if (normalizedForm.outbound_proxy_enabled) {
      if (!normalizedForm.outbound_proxy_host) {
        toast.error(t("settings.proxy.validation_host"));
        return;
      }
      const port = Number.parseInt(normalizedPort, 10);
      if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        toast.error(t("settings.proxy.validation_port"));
        return;
      }
    }

    setForm(normalizedForm);
    setProbeResult(null);
    setSaving(true);
    try {
      await updateSettingsWithToast(
        buildProxyPayload(normalizedForm),
        t,
        "system",
      );
      await refetch().catch(() => undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const normalizedForm = normalizeProxyForm(form);
    const normalizedPort = normalizedForm.outbound_proxy_port;

    if (normalizedForm.outbound_proxy_enabled) {
      if (!normalizedForm.outbound_proxy_host) {
        toast.error(t("settings.proxy.validation_host"));
        return;
      }
      const port = Number.parseInt(normalizedPort, 10);
      if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        toast.error(t("settings.proxy.validation_port"));
        return;
      }
    }

    setForm(normalizedForm);
    setProbeResult(null);
    setTesting(true);
    try {
      const response = await fetch("/api/admin/settings/proxy/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildProxyPayload(normalizedForm)),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.status !== "success" || !payload?.data) {
        throw new Error(payload?.message || t("settings.proxy.test_failed"));
      }
      setProbeResult(payload.data as ProxyProbeResult);
      toast.success(t("settings.proxy.test_success"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("settings.proxy.test_failed"));
    } finally {
      setTesting(false);
    }
  };

  const probeModeLabel =
    probeResult?.mode === "proxy"
      ? t("settings.proxy.mode_proxy")
      : probeResult?.mode === "direct_fallback"
        ? t("settings.proxy.mode_direct_fallback")
        : t("settings.proxy.mode_direct");

  return (
    <section className="space-y-3">
      <SettingCardLabel>{t("settings.proxy.title")}</SettingCardLabel>
      <p className="-mt-2 text-sm text-muted-foreground">
        {t("settings.proxy.description")}
      </p>

      <SettingCard
        title={t("settings.proxy.enable")}
        description={t("settings.proxy.enable_description")}
      >
        <SettingCard.Action>
          <Switch
            checked={form.outbound_proxy_enabled}
            onCheckedChange={(checked) =>
              setForm((current) => ({
                ...current,
                outbound_proxy_enabled: checked,
              }))
            }
          />
        </SettingCard.Action>
      </SettingCard>

      <SettingCardSelect
        title={t("settings.proxy.protocol")}
        description={t("settings.proxy.protocol_description")}
        value={form.outbound_proxy_protocol}
        options={[
          {
            value: "socks5",
            label: t("settings.proxy.protocol_socks5"),
          },
          {
            value: "http",
            label: t("settings.proxy.protocol_http"),
          },
          {
            value: "https",
            label: t("settings.proxy.protocol_https"),
          },
        ]}
        OnSave={async (value) => {
          setForm((current) => ({
            ...current,
            outbound_proxy_protocol: value,
          }));
        }}
      />

      <SettingCardShortTextInput
        title={t("settings.proxy.host")}
        description={t("settings.proxy.host_description")}
        value={form.outbound_proxy_host}
        showSaveButton={false}
        placeholder="127.0.0.1"
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            outbound_proxy_host: event.target.value,
          }))
        }
      />

      <SettingCardShortTextInput
        title={t("settings.proxy.port")}
        description={t("settings.proxy.port_description")}
        value={form.outbound_proxy_port}
        showSaveButton={false}
        inputMode="numeric"
        placeholder="1080"
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            outbound_proxy_port: event.target.value,
          }))
        }
      />

      <SettingCardShortTextInput
        title={t("settings.proxy.username")}
        description={t("settings.proxy.username_description")}
        value={form.outbound_proxy_username}
        showSaveButton={false}
        placeholder={t("common.optional", "Optional")}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            outbound_proxy_username: event.target.value,
          }))
        }
      />

      <SettingCardShortTextInput
        title={t("settings.proxy.password")}
        description={t("settings.proxy.password_description")}
        value={form.outbound_proxy_password}
        showSaveButton={false}
        type="password"
        placeholder={t("common.optional", "Optional")}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            outbound_proxy_password: event.target.value,
          }))
        }
      />

      {probeResult ? (
        <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm">
          <div className="font-medium text-foreground">
            {t("settings.proxy.last_test_title")}
          </div>
          <div className="mt-2 space-y-1 text-muted-foreground">
            <div>
              {t("settings.proxy.last_test_mode")}: {probeModeLabel}
            </div>
            <div>
              {t("settings.proxy.last_test_exit_ipv4")}:{" "}
              <span className="font-medium text-foreground">
                {probeResult.ipv4 || "-"}
              </span>
            </div>
            <div>
              {t("settings.proxy.last_test_target_ipv4")}: {probeResult.ipv4_url || "-"}
            </div>
            <div>
              {t("settings.proxy.last_test_exit_ipv6")}:{" "}
              <span className="font-medium text-foreground">
                {probeResult.ipv6 || "-"}
              </span>
            </div>
            <div>
              {t("settings.proxy.last_test_target_ipv6")}: {probeResult.ipv6_url || "-"}
            </div>
            {probeResult.proxy_error ? (
              <div>
                {t("settings.proxy.last_test_proxy_error")}: {probeResult.proxy_error}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-end pt-2">
        <Button variant="outline" onClick={handleTest} disabled={testing}>
          {testing ? t("settings.proxy.testing") : t("settings.proxy.test")}
        </Button>
        <Button onClick={handleSave} disabled={saving || testing}>
          {saving ? t("common.saving", "Saving...") : t("save")}
        </Button>
      </div>
    </section>
  );
}
