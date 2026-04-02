import { Suspense, lazy, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import Flag from "../../components/Flag";
import { useLiveData } from "../../contexts/LiveDataContext";
import type { Record } from "../../types/LiveData";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useNodeList } from "@/contexts/NodeListContext";
import { DetailsGrid } from "@/components/DetailsGrid";
import { liveDataToRecords } from "@/utils/RecordHelper";
import { formatBytes } from "@/utils/unitHelper";

const LoadChart = lazy(() => import("./LoadChart"));
const PingChart = lazy(() => import("./PingChart"));

export default function InstancePage() {
  const { t } = useTranslation();
  const { onRefresh, live_data } = useLiveData();
  const { uuid } = useParams<{ uuid: string }>();
  const [recent, setRecent] = useState<Record[]>([]);
  const { nodeList } = useNodeList();
  const length = 30 * 5;
  const [chartView, setChartView] = useState<"load" | "ping">("load");
  const node = nodeList?.find((n) => n.uuid === uuid);
  const liveRecord = live_data?.data?.data[uuid ?? ""];
  const isOnline = live_data?.data?.online.includes(uuid ?? "") ?? false;

  useEffect(() => {
    fetch(`/api/recent/${uuid}`)
      .then((res) => res.json())
      .then((data) => setRecent(data.data.slice(-length)))
      .catch((err) => console.error("Failed to fetch recent data:", err));
  }, [length, uuid]);

  useEffect(() => {
    const unsubscribe = onRefresh((resp) => {
      if (!uuid) return;
      const data = resp.data.data[uuid];
      if (!data) return;

      setRecent((prev) => {
        const newRecord: Record = data;
        const exists = prev.some(
          (item) => item.updated_at === newRecord.updated_at,
        );
        if (exists) return prev;
        return [...prev, newRecord].slice(-length);
      });
    });

    return unsubscribe;
  }, [length, onRefresh, uuid]);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-2 pb-6">
      <Card className="relative overflow-hidden rounded-[32px] border border-border/60 bg-background/90 px-5 py-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.5)]">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-40"
          style={{
            background:
              "radial-gradient(circle at top right, var(--accent-a8), transparent 58%)",
          }}
        />

        <div className="relative grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={isOnline ? "success" : "warning"}
                className="rounded-full px-3 py-1"
              >
                {isOnline ? "Online" : "Offline"}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {node?.region || "UN"}
              </Badge>
              {node?.group ? (
                <Badge variant="info" className="rounded-full px-3 py-1">
                  {node.group}
                </Badge>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Flag flag={node?.region ?? ""} />
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  {node?.name ?? uuid}
                </h1>
              </div>
              <div className="rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur-sm">
                {node?.uuid}
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                聚焦单节点的实时负载、连通性和历史趋势。这个页现在把节点身份、当前状态和图表入口拆成更清晰的阅读层级。
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InstanceStat
              label={t("nodeCard.arch")}
              value={node?.arch ?? "Unknown"}
            />
            <InstanceStat
              label={t("nodeCard.os")}
              value={node?.os ?? "Unknown"}
            />
            <InstanceStat
              label={t("nodeCard.networkSpeed")}
              value={`↑ ${formatBytes(liveRecord?.network.up || 0)}/s`}
              helper={`↓ ${formatBytes(liveRecord?.network.down || 0)}/s`}
            />
            <InstanceStat
              label={t("nodeCard.totalTraffic")}
              value={`↑ ${formatBytes(liveRecord?.network.totalUp || 0)}`}
              helper={`↓ ${formatBytes(liveRecord?.network.totalDown || 0)}`}
            />
          </div>
        </div>
      </Card>

      <Card className="rounded-[30px] border border-border/60 bg-background/95 px-4 py-4 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-3 border-b border-border/60 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Node Details
            </div>
            <div className="mt-1 text-xl font-semibold tracking-tight">
              Hardware profile and runtime snapshot
            </div>
          </div>
          <SegmentedControl.Root
            radius="full"
            value={chartView}
            onValueChange={(value) => setChartView(value as "load" | "ping")}
          >
            <SegmentedControl.Item value="load">
              {t("nodeCard.load")}
            </SegmentedControl.Item>
            <SegmentedControl.Item value="ping">
              {t("nodeCard.ping")}
            </SegmentedControl.Item>
          </SegmentedControl.Root>
        </div>
        <div className="pt-4">
          <DetailsGrid uuid={uuid ?? ""} />
        </div>
      </Card>

      <Suspense
        fallback={
          <Card className="rounded-[30px] border border-border/60 bg-background/95 px-4 py-10 text-center text-sm text-muted-foreground shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)]">
            {t("common.loading", { defaultValue: "Loading..." })}
          </Card>
        }
      >
        {chartView === "load" ? (
          <LoadChart data={liveDataToRecords(uuid ?? "", recent)} />
        ) : (
          <PingChart uuid={uuid ?? ""} />
        )}
      </Suspense>
    </div>
  );
}

const InstanceStat = ({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) => {
  return (
    <div className="rounded-[24px] border border-border/60 bg-background/80 px-4 py-4 shadow-sm backdrop-blur-sm">
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold tracking-tight">{value}</div>
      {helper ? (
        <div className="mt-1 text-sm text-muted-foreground">{helper}</div>
      ) : null}
    </div>
  );
};
