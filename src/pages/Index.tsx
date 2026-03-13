import React, { Suspense, useEffect } from "react";
import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import Loading from "@/components/loading";
import { useLiveData } from "../contexts/LiveDataContext";
import { useNodeList } from "@/contexts/NodeListContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
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

    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentTime(new Date().toLocaleTimeString());
      }, 1000);
      return () => clearInterval(timer);
    }, []);

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
          const up = values.reduce((acc, node) => acc + (node.network.up || 0), 0);
          const down = values.reduce(
            (acc, node) => acc + (node.network.down || 0),
            0,
          );
          return `↑ ${formatSpeed(up)} / ↓ ${formatSpeed(down)}`;
        },
        visible: statusCardsVisibility.networkSpeed,
      },
    ];

    useEffect(() => {
      const interval = setInterval(() => {
        refresh();
      }, 5000);
      return () => clearInterval(interval);
    }, [nodeList, refresh]);

    if (isLoading) {
      return <Loading />;
    }
    if (error) {
      return <div>Error: {error}</div>;
    }

    return (
      <>
        <Callouts />
        <Card className="summary-card relative mx-4 gap-0 px-4 py-5 text-sm md:text-base">
          <div className="absolute right-2 top-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
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

          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gridAutoRows: "min-content",
            }}
          >
            {statusCards
              .filter((card) => card.visible)
              .map((card) => (
                <TopCard
                  key={card.key}
                  title={card.title}
                  value={card.getValue()}
                />
              ))}
          </div>
        </Card>

        <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
          <NodeDisplay
            nodes={nodeList ?? []}
            liveData={live_data?.data ?? { online: [], data: {} }}
          />
        </Suspense>
      </>
    );
  };

  return <InnerLayout />;
};

const Callouts = () => {
  const [t] = useTranslation();
  const { showCallout } = useLiveData();
  const ishttps = window.location.protocol === "https:";

  return (
    <div className="m-2 flex flex-col gap-2">
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
};

const TopCard: React.FC<TopCardProps> = React.memo(
  ({ title, value, description }) => {
    return (
      <div className="min-w-52 w-full md:max-w-72">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-muted-foreground">{title}</label>
          <label className="-mt-2 text-md font-medium">{value}</label>
          {description && (
            <span className="text-sm text-muted-foreground">{description}</span>
          )}
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

export default Index;
