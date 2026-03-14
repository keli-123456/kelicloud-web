import React, { Suspense, useEffect } from "react";
import { Activity, Globe2, Server, Settings, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import Loading from "@/components/loading";
import { useNodeList } from "@/contexts/NodeListContext";
import { useLiveData } from "@/contexts/LiveDataContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/utils/unitHelper";

const NodeDisplay = React.lazy(() => import("../components/NodeDisplay"));

const formatSpeed = (bytes: number): string => {
  if (bytes === 0) return "0 B/s";
  const units = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  let decimals = 2;
  if (i >= 3) decimals = 1;
  if (i <= 1) decimals = 0;
  if (size >= 100) decimals = 0;

  return `${size.toFixed(decimals)} ${units[i]}`;
};

const Index = () => {
  const InnerLayout = () => {
    const [t] = useTranslation();
    const { live_data } = useLiveData();
    const [currentTime, setCurrentTime] = React.useState(
      new Date().toLocaleTimeString(),
    );
    const { nodeList, isLoading, error, refresh } = useNodeList();
    const [statusCardsVisibility, setStatusCardsVisibility] = useLocalStorage(
      "statusCardsVisibility",
      {
        currentTime: true,
        currentOnline: true,
        regionOverview: true,
        trafficOverview: true,
        networkSpeed: true,
      },
    );

    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentTime(new Date().toLocaleTimeString());
      }, 1000);
      return () => clearInterval(timer);
    }, []);

    const statusCards = [
      {
        key: "currentTime",
        title: t("current_time"),
        getValue: () => currentTime,
        visible: statusCardsVisibility.currentTime,
      },
      {
        key: "currentOnline",
        title: t("current_online"),
        getValue: () =>
          `${live_data?.data?.online.length ?? 0} / ${nodeList?.length ?? 0}`,
        visible: statusCardsVisibility.currentOnline,
      },
      {
        key: "regionOverview",
        title: t("region_overview"),
        getValue: () =>
          nodeList
            ? Object.entries(
                nodeList.reduce(
                  (acc, item) => {
                    if (live_data?.data.online.includes(item.uuid)) {
                      acc[item.region] = (acc[item.region] || 0) + 1;
                    }
                    return acc;
                  },
                  {} as Record<string, number>,
                ),
              ).length
            : 0,
        visible: statusCardsVisibility.regionOverview,
      },
      {
        key: "trafficOverview",
        title: t("traffic_overview"),
        getValue: () => {
          const data = live_data?.data?.data;
          const online = live_data?.data?.online;
          if (!data || !online) return "↑ 0B / ↓ 0B";
          const onlineSet = new Set(online);
          const values = Object.entries(data)
            .filter(([uuid]) => onlineSet.has(uuid))
            .map(([, node]) => node);
          const up = values.reduce(
            (acc, node) => acc + (node.network.totalUp || 0),
            0,
          );
          const down = values.reduce(
            (acc, node) => acc + (node.network.totalDown || 0),
            0,
          );
          return `↑ ${formatBytes(up)} / ↓ ${formatBytes(down)}`;
        },
        visible: statusCardsVisibility.trafficOverview,
      },
      {
        key: "networkSpeed",
        title: t("network_speed"),
        getValue: () => {
          const data = live_data?.data?.data;
          const online = live_data?.data?.online;
          if (!data || !online) return "↑ 0 B/s / ↓ 0 B/s";
          const onlineSet = new Set(online);
          const values = Object.entries(data)
            .filter(([uuid]) => onlineSet.has(uuid))
            .map(([, node]) => node);
          const up = values.reduce(
            (acc, node) => acc + (node.network.up || 0),
            0,
          );
          const down = values.reduce(
            (acc, node) => acc + (node.network.down || 0),
            0,
          );
          return `↑ ${formatSpeed(up)} / ↓ ${formatSpeed(down)}`;
        },
        visible: statusCardsVisibility.networkSpeed,
      },
    ];

    const totalNodes = nodeList?.length ?? 0;
    const onlineCount = live_data?.data?.online.length ?? 0;
    const onlineRatio = totalNodes > 0 ? Math.round((onlineCount / totalNodes) * 100) : 0;
    const regionCount = nodeList
      ? new Set(nodeList.map((item) => item.region).filter(Boolean)).size
      : 0;
    const visibleStatusCards = statusCards.filter((card) => card.visible);
    const liveSpeedValue =
      statusCards.find((card) => card.key === "networkSpeed")?.getValue() ?? "-";

    useEffect(() => {
      const interval = setInterval(() => {
        refresh();
      }, 5000);
      return () => clearInterval(interval);
    }, [nodeList, refresh]);

    if (isLoading) return <Loading />;
    if (error) return <div>Error: {error}</div>;

    return (
      <div className="mx-4 flex flex-col gap-4 pb-4">
        <Callouts />

        <Card className="relative overflow-hidden rounded-[32px] border border-border/60 bg-background/90 px-5 py-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.55)]">
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-45"
            style={{
              background:
                "radial-gradient(circle at top right, var(--accent-a8), transparent 58%)",
            }}
          />
          <div
            className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full blur-3xl"
            style={{ backgroundColor: "var(--accent-a4)" }}
          />

          <div className="relative grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info" className="rounded-full px-3 py-1">
                  <Sparkles size={13} />
                  Live Overview
                </Badge>
                <Badge
                  variant={
                    onlineRatio >= 75
                      ? "success"
                      : onlineRatio > 0
                        ? "warning"
                        : "destructive"
                  }
                  className="rounded-full px-3 py-1"
                >
                  {onlineRatio}% online
                </Badge>
              </div>

              <div className="max-w-2xl space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Realtime visibility for every region, node, and traffic edge.
                </h1>
                <p className="text-sm leading-6 text-muted-foreground md:text-base">
                  用更清晰的总览先看到全局状态，再进入节点细节和历史图表。这个页现在不只是列表，而是一个真正的实时驾驶舱。
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <HeroStat
                  icon={<Server size={16} />}
                  label={t("current_online")}
                  value={`${onlineCount} / ${totalNodes}`}
                  hint="Active nodes across the visible fleet"
                />
                <HeroStat
                  icon={<Globe2 size={16} />}
                  label={t("region_overview")}
                  value={regionCount}
                  hint="Regions represented in the current catalog"
                />
                <HeroStat
                  icon={<Activity size={16} />}
                  label={t("network_speed")}
                  value={liveSpeedValue}
                  hint="Live ingress and egress throughput"
                />
              </div>
            </div>

            <div className="rounded-[28px] border border-border/60 bg-background/80 p-4 backdrop-blur-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    Status Deck
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    Current fleet snapshot
                  </div>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                    >
                      <Settings size={16} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px]">
                    <div className="flex flex-col gap-3">
                      <div className="text-sm font-semibold">{t("status_settings")}</div>
                      <div className="flex flex-col gap-2">
                        {statusCards.map((card) => (
                          <StatusSettingSwitch
                            key={card.key}
                            label={card.title}
                            checked={card.visible}
                            onCheckedChange={(checked) =>
                              setStatusCardsVisibility({
                                ...statusCardsVisibility,
                                [card.key]: checked,
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {visibleStatusCards.map((card, index) => (
                  <TopCard
                    key={card.key}
                    title={card.title}
                    value={card.getValue()}
                    tone={index}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-[32px] border border-border/60 bg-background/95 py-0 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)]">
          <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Node Explorer
              </div>
              <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
                Search, filter, compare, then drill into a single node.
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {totalNodes} total nodes
              </Badge>
              <Badge
                variant={onlineCount > 0 ? "success" : "warning"}
                className="rounded-full px-3 py-1"
              >
                {onlineCount} currently online
              </Badge>
            </div>
          </div>

          <div className="pb-4 pt-3">
            <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
              <NodeDisplay
                nodes={nodeList ?? []}
                liveData={live_data?.data ?? { online: [], data: {} }}
              />
            </Suspense>
          </div>
        </Card>
      </div>
    );
  };

  return <InnerLayout />;
};

const Callouts = () => {
  const [t] = useTranslation();
  const { showCallout } = useLiveData();
  const ishttps = window.location.protocol === "https:";

  return (
    <div className="flex flex-col gap-2">
      {!ishttps && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            viewBox="0 0 24 24"
            className="text-red-600"
          >
            <path
              fill="currentColor"
              d="M10.03 3.659c.856-1.548 3.081-1.548 3.937 0l7.746 14.001c.83 1.5-.255 3.34-1.969 3.34H4.254c-1.715 0-2.8-1.84-1.97-3.34zM12.997 17A.999.999 0 1 0 11 17a.999.999 0 0 0 1.997 0m-.259-7.853a.75.75 0 0 0-1.493.103l.004 4.501l.007.102a.75.75 0 0 0 1.493-.103l-.004-4.502z"
            />
          </svg>
          <AlertDescription className="font-medium text-red-700">
            {t("warn_https")}
          </AlertDescription>
        </Alert>
      )}

      {!showCallout && (
        <Alert className="border-orange-200 bg-orange-50 text-orange-800">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            className="text-orange-600"
          >
            <path
              fill="currentColor"
              d="M21.707 3.707a1 1 0 0 0-1.414-1.414L18.496 4.09a4.25 4.25 0 0 0-5.251.604l-1.068 1.069a1.75 1.75 0 0 0 0 2.474l3.585 3.586a1.75 1.75 0 0 0 2.475 0l1.068-1.068a4.25 4.25 0 0 0 .605-5.25zm-11 8a1 1 0 0 0-1.414-1.414l-1.47 1.47l-.293-.293a.75.75 0 0 0-1.06 0l-1.775 1.775a4.25 4.25 0 0 0-.605 5.25l-1.797 1.798a1 1 0 1 0 1.414 1.414l1.798-1.797a4.25 4.25 0 0 0 5.25-.605l1.775-1.775a.75.75 0 0 0 0-1.06l-.293-.293l1.47-1.47a1 1 0 0 0-1.414-1.414l-1.47 1.47l-1.586-1.586z"
            />
          </svg>
          <AlertDescription className="font-medium text-orange-800">
            {t("warn_websocket")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

type TopCardProps = {
  title: string;
  value: string | number;
  description?: string;
  tone?: number;
};

const TopCard: React.FC<TopCardProps> = React.memo(
  ({ title, value, description, tone = 0 }) => {
    const tones = [
      "border-[color:var(--accent-a5)] bg-[color:var(--accent-a2)]",
      "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30",
      "border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/30",
      "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30",
      "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40",
    ];

    return (
      <div
        className={cn(
          "relative min-h-28 overflow-hidden rounded-2xl border px-4 py-4",
          tones[tone % tones.length],
        )}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-[var(--accent-7)]/70" />
        <div className="flex flex-col gap-2">
          <label className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {title}
          </label>
          <label className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            {value}
          </label>
          {description ? (
            <span className="text-sm text-muted-foreground">{description}</span>
          ) : null}
        </div>
      </div>
    );
  },
);

type StatusSettingSwitchProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

const StatusSettingSwitch: React.FC<StatusSettingSwitchProps> = React.memo(
  ({ label, checked, onCheckedChange }) => {
    return (
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm">{label}</span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    );
  },
);

const HeroStat = ({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint: string;
}) => {
  return (
    <div className="rounded-[26px] border border-border/60 bg-background/80 px-4 py-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--accent-3)] text-[var(--accent-11)]">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{hint}</div>
    </div>
  );
};

export default Index;
