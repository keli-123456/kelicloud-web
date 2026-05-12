import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Copy, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getPublicCloudInstanceShare, type CloudPublicShareData } from "@/lib/cloudShare";
import { getReadableErrorMessage } from "@/lib/apiErrorMessage";
import type { DigitalOceanDroplet } from "@/lib/cloud";
import type { AWSInstanceDetail, AWSLightsailInstanceDetail } from "@/lib/cloudAws";
import type { LinodeInstanceDetail } from "@/lib/cloudLinode";

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 break-all text-sm text-slate-900">
        {value === undefined || value === null || value === "" ? "-" : value}
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div>
        <div className="text-base font-semibold text-slate-900">{title}</div>
        {description ? (
          <div className="mt-1 text-sm text-slate-500">{description}</div>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatList(values: Array<string | number>) {
  return values.length ? values.join(", ") : "-";
}

function getProviderLabel(share: CloudPublicShareData, t: ReturnType<typeof useTranslation>["t"]) {
  if (share.provider === "digitalocean") return "DigitalOcean";
  if (share.provider === "linode") return "Linode";
  if (share.resource_type === "lightsail") return "AWS Lightsail";
  return t("cloud.providers.aws.title", "AWS EC2 / Lightsail");
}

function getAccessPolicyLabel(share: CloudPublicShareData, t: ReturnType<typeof useTranslation>["t"]) {
  if (share.access_policy === "single_use") {
    return t("cloud.share.policy_single_use", "Single Use");
  }
  return t("cloud.share.policy_public", "Public");
}

export default function CloudSharePage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [share, setShare] = React.useState<CloudPublicShareData | null>(null);

  const copyText = React.useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t("copy_success", "Copied!"));
      } catch (copyError) {
        toast.error(getReadableErrorMessage(copyError, t("cloud.share.copy_failed", "复制失败，请手动复制。")));
      }
    },
    [t],
  );

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        setError(t("cloud.share.invalid", "Invalid share link"));
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextShare = await getPublicCloudInstanceShare(token);
        if (cancelled) return;
        setShare(nextShare);
        setError("");
      } catch (shareError) {
        if (cancelled) return;
        setError(getReadableErrorMessage(shareError, t("cloud.share.public_load_failed", {
          defaultValue: "加载分享信息失败，请稍后重试。",
        })));
        setShare(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [t, token]);

  const renderSummary = () => {
    if (!share) return null;

    if (share.provider === "digitalocean") {
      const droplet = share.detail as DigitalOceanDroplet | null;
      return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailCard label={t("cloud.table.status", "Status")} value={droplet?.status || "-"} />
          <DetailCard label={t("cloud.table.region", "Region")} value={droplet?.region?.slug || droplet?.region?.name || "-"} />
          <DetailCard
            label={t("cloud.table.ip", "Public IP")}
            value={droplet?.networks?.v4?.find((item) => item.type === "public")?.ip_address || droplet?.networks?.v6?.find((item) => item.type === "public")?.ip_address || "-"}
          />
          <DetailCard label={t("cloud.table.size", "Size")} value={droplet?.size_slug || droplet?.size?.slug || "-"} />
          <DetailCard label={t("cloud.table.image", "Image")} value={droplet?.image?.name || droplet?.image?.distribution || "-"} />
          <DetailCard label={t("cloud.table.created_at", "Created")} value={formatDateTime(droplet?.created_at || "")} />
          <DetailCard label={t("cloud.detail.memory", "Memory")} value={`${droplet?.memory || 0} MB`} />
          <DetailCard label={t("cloud.detail.vcpus", "vCPUs")} value={droplet?.vcpus || 0} />
        </div>
      );
    }

    if (share.provider === "linode") {
      const detail = share.detail as LinodeInstanceDetail | null;
      return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailCard label={t("cloud.table.status", "Status")} value={detail?.instance?.status || "-"} />
          <DetailCard label={t("cloud.table.region", "Region")} value={detail?.instance?.region || "-"} />
          <DetailCard label={t("cloud.table.ip", "Public IP")} value={detail?.instance?.ipv4?.[0] || detail?.instance?.ipv6 || "-"} />
          <DetailCard label={t("cloud.table.size", "Size")} value={detail?.instance?.type || "-"} />
          <DetailCard label={t("cloud.table.image", "Image")} value={detail?.instance?.image || "-"} />
          <DetailCard label={t("cloud.table.created_at", "Created")} value={formatDateTime(detail?.instance?.created || "")} />
          <DetailCard label={t("cloud.detail.memory", "Memory")} value={`${detail?.instance?.specs?.memory || 0} MB`} />
          <DetailCard label={t("cloud.detail.disk", "Disk")} value={`${detail?.instance?.specs?.disk || 0} GB`} />
        </div>
      );
    }

    if (share.resource_type === "lightsail") {
      const detail = share.detail as AWSLightsailInstanceDetail | null;
      return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailCard label={t("cloud.table.status", "Status")} value={detail?.instance?.state || "-"} />
          <DetailCard label={t("cloud.providers.aws.az", "AZ")} value={detail?.instance?.availability_zone || "-"} />
          <DetailCard label={t("cloud.table.ip", "Public IP")} value={detail?.instance?.public_ip || detail?.instance?.private_ip || "-"} />
          <DetailCard label={t("cloud.table.size", "Size")} value={detail?.instance?.bundle_id || "-"} />
          <DetailCard label={t("cloud.table.image", "Image")} value={detail?.instance?.blueprint_name || detail?.instance?.blueprint_id || "-"} />
          <DetailCard label={t("cloud.providers.aws.key_pair", "Key Pair")} value={detail?.instance?.ssh_key_name || "-"} />
          <DetailCard label={t("cloud.table.created_at", "Created")} value={formatDateTime(detail?.instance?.created_at || "")} />
          <DetailCard label={t("cloud.providers.aws.static_ip", "Static IP")} value={detail?.instance?.is_static_ip ? t("common.yes", "Yes") : "-"} />
        </div>
      );
    }

    const detail = share.detail as AWSInstanceDetail | null;
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCard label={t("cloud.table.status", "Status")} value={detail?.instance?.state || "-"} />
        <DetailCard label={t("cloud.providers.aws.az", "AZ")} value={detail?.instance?.availability_zone || "-"} />
        <DetailCard label={t("cloud.table.ip", "Public IP")} value={detail?.instance?.public_ip || detail?.instance?.private_ip || "-"} />
        <DetailCard label={t("cloud.table.size", "Size")} value={detail?.instance?.instance_type || "-"} />
        <DetailCard label={t("cloud.table.image", "Image")} value={detail?.instance?.image_id || "-"} />
        <DetailCard label={t("cloud.providers.aws.key_pair", "Key Pair")} value={detail?.instance?.key_name || "-"} />
        <DetailCard label={t("cloud.table.created_at", "Created")} value={formatDateTime(detail?.instance?.launch_time || "")} />
        <DetailCard label={t("cloud.providers.aws.monitoring", "Monitoring")} value={detail?.monitoring_state || "-"} />
      </div>
    );
  };

  const renderProviderSections = () => {
    if (!share) return null;

    if (share.provider === "digitalocean") {
      const droplet = share.detail as DigitalOceanDroplet | null;
      const ipv4 = Array.isArray(droplet?.networks?.v4) ? droplet.networks.v4 : [];
      const ipv6 = Array.isArray(droplet?.networks?.v6) ? droplet.networks.v6 : [];
      return (
        <Section title={t("cloud.share.extra_details", "Extra Details")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard
              label={t("cloud.detail.ipv4", "IPv4 Networks")}
              value={ipv4.length ? ipv4.map((item) => `${item.type}: ${item.ip_address}`).join(" | ") : "-"}
            />
            <DetailCard
              label={t("cloud.detail.ipv6", "IPv6 Networks")}
              value={ipv6.length ? ipv6.map((item) => `${item.type}: ${item.ip_address}`).join(" | ") : "-"}
            />
            <DetailCard label={t("cloud.detail.tags", "Tags")} value={formatList(droplet?.tags || [])} />
            <DetailCard label={t("cloud.detail.features", "Features")} value={formatList(droplet?.features || [])} />
          </div>
        </Section>
      );
    }

    if (share.provider === "linode") {
      const detail = share.detail as LinodeInstanceDetail | null;
      return (
        <>
          <Section title={t("cloud.providers.linode.disks", "Disks")}>
            <div className="grid gap-3 md:grid-cols-2">
              {(detail?.disks || []).length ? (detail?.disks || []).map((disk) => (
                <DetailCard
                  key={disk.id}
                  label={disk.label || `Disk ${disk.id}`}
                  value={`${disk.size} MB / ${disk.filesystem || "-"} / ${disk.status || "-"}`}
                />
              )) : <div className="text-sm text-slate-500">-</div>}
            </div>
          </Section>
          <Section title={t("cloud.providers.linode.configs", "Configs")}>
            <div className="grid gap-3 md:grid-cols-2">
              {(detail?.configs || []).length ? (detail?.configs || []).map((config) => (
                <DetailCard
                  key={config.id}
                  label={config.label || `Config ${config.id}`}
                  value={`${config.kernel || "-"} / ${config.root_device || "-"} / ${config.run_level || "-"}`}
                />
              )) : <div className="text-sm text-slate-500">-</div>}
            </div>
          </Section>
        </>
      );
    }

    if (share.resource_type === "lightsail") {
      const detail = share.detail as AWSLightsailInstanceDetail | null;
      return (
        <>
          <Section title={t("cloud.providers.aws.ports", "Firewall Ports")}>
            <div className="grid gap-3 md:grid-cols-2">
              {(detail?.ports || []).length ? (detail?.ports || []).map((port) => (
                <DetailCard
                  key={`${port.protocol}-${port.from_port}-${port.to_port}`}
                  label={port.common_name || `${port.protocol}:${port.from_port}-${port.to_port}`}
                  value={`${port.access_type || "-"} / ${port.access_from || "-"} / ${formatList(port.cidrs || [])}`}
                />
              )) : <div className="text-sm text-slate-500">-</div>}
            </div>
          </Section>
          <Section title={t("cloud.providers.aws.snapshots", "Snapshots")}>
            <div className="grid gap-3 md:grid-cols-2">
              {(detail?.snapshots || []).length ? (detail?.snapshots || []).map((snapshot) => (
                <DetailCard
                  key={snapshot.name}
                  label={snapshot.name}
                  value={`${snapshot.state || "-"} / ${snapshot.size_in_gb} GB / ${formatDateTime(snapshot.created_at)}`}
                />
              )) : <div className="text-sm text-slate-500">-</div>}
            </div>
          </Section>
        </>
      );
    }

    const detail = share.detail as AWSInstanceDetail | null;
    return (
      <>
        <Section title={t("cloud.providers.aws.security_groups", "Security Groups")}>
          <div className="grid gap-3 md:grid-cols-2">
            {(detail?.security_groups || []).length ? (detail?.security_groups || []).map((group) => (
              <DetailCard
                key={group.group_id}
                label={group.group_name || group.group_id}
                value={group.description || group.group_id}
              />
            )) : <div className="text-sm text-slate-500">-</div>}
          </div>
        </Section>
        <Section title={t("cloud.providers.aws.volumes", "Volumes")}>
          <div className="grid gap-3 md:grid-cols-2">
            {(detail?.volumes || []).length ? (detail?.volumes || []).map((volume) => (
              <DetailCard
                key={volume.volume_id}
                label={volume.volume_id}
                value={`${volume.size_gib} GiB / ${volume.volume_type} / ${volume.device_name}`}
              />
            )) : <div className="text-sm text-slate-500">-</div>}
          </div>
        </Section>
      </>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-3 py-4 md:px-4 md:py-6">
      {loading ? (
        <Section title={t("cloud.share.loading_title", "Loading Share")}>
          <div className="text-sm text-slate-500">{t("cloud.loading", "Loading cloud resources...")}</div>
        </Section>
      ) : error ? (
        <Section title={t("cloud.share.unavailable", "Share Unavailable")}>
          <div className="text-sm text-red-600">{error}</div>
        </Section>
      ) : share ? (
        <>
          <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50 px-5 py-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  {t("cloud.share.public_title", "Shared Cloud Instance")}
                </div>
                <h1 className="mt-2 text-2xl font-semibold text-slate-950">
                  {share.title || share.resource_name}
                </h1>
                <div className="mt-2 text-sm text-slate-600">
                  {getProviderLabel(share, t)} / {share.resource_name}
                </div>
              </div>
              <Button variant="outline" onClick={() => { void copyText(window.location.href); }}>
                <Copy className="mr-2 h-4 w-4" />
                {t("cloud.share.copy_link", "Copy Link")}
              </Button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DetailCard label={t("cloud.share.provider", "Provider")} value={getProviderLabel(share, t)} />
              <DetailCard label={t("cloud.tokens.table.account", "Account")} value={share.credential_name || "-"} />
              <DetailCard label={t("cloud.table.region", "Region")} value={share.region || "-"} />
              <DetailCard label={t("cloud.share.access_policy", "Access Policy")} value={getAccessPolicyLabel(share, t)} />
              <DetailCard
                label={t("cloud.share.expires_at", "Expires At")}
                value={share.expires_at ? formatDateTime(share.expires_at) : t("cloud.share.never_expires", "Never")}
              />
              <DetailCard label={t("cloud.share.updated", "Last Updated")} value={formatDateTime(share.updated_at)} />
            </div>
          </section>

          {share.note ? (
            <Section title={t("cloud.share.note", "Share Note")}>
              <div className="whitespace-pre-wrap text-sm text-slate-700">{share.note}</div>
            </Section>
          ) : null}

          <Section
            title={t("cloud.share.instance_details", "Instance Details")}
            description={t("cloud.share.instance_details_description", "This page is read-only and only exposes the data included in the share link.")}
          >
            {renderSummary()}
          </Section>

          {share.root_password || share.managed_ssh_key ? (
            <Section title={t("cloud.share.credentials", "Shared Credentials")}>
              <div className="flex flex-col gap-4">
                {share.root_password ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-medium text-slate-900">
                        <KeyRound className="mr-2 inline h-4 w-4" />
                        {t("cloud.password.view", "View Password")}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { void copyText(share.root_password?.root_password || ""); }}>
                        <Copy className="mr-2 h-4 w-4" />
                        {t("common.copy", "Copy")}
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <DetailCard label={t("cloud.password.username", "Username")} value={share.root_password.username} />
                      <DetailCard label={t("cloud.password.mode", "Password Mode")} value={share.root_password.password_mode || "-"} />
                      <DetailCard label={t("cloud.password.saved_at", "Saved At")} value={formatDateTime(share.root_password.updated_at)} />
                    </div>
                    <Textarea className="mt-3 min-h-24 font-mono text-xs" readOnly value={share.root_password.root_password} />
                  </div>
                ) : null}

                {share.managed_ssh_key ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-sm font-medium text-slate-900">
                      {t("cloud.tokens.view_managed_key", "View Managed Key")}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <DetailCard label={t("cloud.table.name", "Name")} value={share.managed_ssh_key.name} />
                      <DetailCard label={t("cloud.share.fingerprint", "Fingerprint")} value={share.managed_ssh_key.fingerprint || "-"} />
                      <DetailCard label={t("cloud.tokens.table.account", "Account")} value={share.managed_ssh_key.token_name || "-"} />
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div>
                        <div className="mb-2 text-sm font-medium text-slate-800">{t("cloud.access.public_key", "Public Key")}</div>
                        <Textarea className="min-h-40 font-mono text-xs" readOnly value={share.managed_ssh_key.public_key} />
                        <FlexButton onClick={() => { void copyText(share.managed_ssh_key?.public_key || ""); }} label={t("common.copy", "Copy")} />
                      </div>
                      <div>
                        <div className="mb-2 text-sm font-medium text-slate-800">{t("cloud.access.private_key", "Managed Private Key")}</div>
                        <Textarea className="min-h-40 font-mono text-xs" readOnly value={share.managed_ssh_key.private_key} />
                        <FlexButton onClick={() => { void copyText(share.managed_ssh_key?.private_key || ""); }} label={t("common.copy", "Copy")} />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </Section>
          ) : null}

          {renderProviderSections()}
        </>
      ) : null}
    </div>
  );
}

function FlexButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <div className="mt-2 flex justify-end">
      <Button variant="outline" size="sm" onClick={onClick}>
        <Copy className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </div>
  );
}
