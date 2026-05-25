import { Suspense, lazy, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";

import Flag from "../../components/Flag";
import { useLiveData } from "../../contexts/LiveDataContext";
import type { Record } from "../../types/LiveData";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useNodeList } from "@/contexts/NodeListContext";
import { DetailsGrid } from "@/components/DetailsGrid";
import { liveDataToRecords } from "@/utils/RecordHelper";
import { formatBytes } from "@/utils/unitHelper";

const LoadChart = lazy(() => import("./LoadChart"));

export default function InstancePage() {
  const { t } = useTranslation();
  const { onRefresh, live_data } = useLiveData();
  const { uuid } = useParams<{ uuid: string }>();
  const [recent, setRecent] = useState<Record[]>([]);
  const { nodeList } = useNodeList();
  const length = 30 * 5;
  const node = nodeList?.find((n) => n.uuid === uuid);
  const liveRecord = live_data?.data?.data[uuid ?? ""];
  const isOnline = live_data?.data?.online.includes(uuid ?? "") ?? false;

  useEffect(() => {
    fetch(`/api/recent/${uuid}`)
      .then((res) => res.json())
      .then((data) => {
        const records = Array.isArray(data?.data) ? data.data.slice(-length) : [];
        setRecent(records);
      })
      .catch((err) => console.error("Failed to fetch recent data:", err));
  }, [length, uuid]);

  useEffect(() => {
    const unsubscribe = onRefresh((resp) => {
      if (!uuid) return;
      const data = resp.data.data[uuid];
      if (!data) return;

      setRecent((prev) => {
        const newRecord: Record = data;
        const exists = prev.some((item) => item.time === newRecord.time);
        if (exists) return prev;
        return [...prev, newRecord].slice(-length);
      });
    });

    return unsubscribe;
  }, [length, onRefresh, uuid]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6 md:py-6">
      <Card className="rounded-lg border-border/70 shadow-none">
        <CardHeader className="gap-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("instance.details_title")}
              </div>
              <div className="flex min-w-0 items-start gap-3">
                <div className="pt-1">
                  <Flag flag={node?.region ?? ""} />
                </div>
                <div className="min-w-0">
                  <CardTitle className="truncate text-2xl tracking-tight md:text-3xl">
                    {node?.name ?? uuid}
                  </CardTitle>
                  <CardDescription className="mt-1 truncate font-mono text-xs">
                    {node?.uuid}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isOnline ? "success" : "warning"}>
                  {isOnline ? t("nodeCard.online") : t("nodeCard.offline")}
                </Badge>
                <Badge variant="outline">{node?.region || "UN"}</Badge>
                {node?.group ? <Badge variant="secondary">{node.group}</Badge> : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
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
        </CardHeader>
      </Card>

      {!isOnline ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{t("nodeCard.offline")}</AlertTitle>
          <AlertDescription>
            This instance is currently offline. Historical details and charts remain
            available, but live readings may lag behind.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="rounded-lg border-border/70 shadow-none">
        <CardHeader className="gap-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("instance.details_title")}
          </div>
          <CardTitle className="text-base tracking-tight">
            {t("instance.summary_description")}
          </CardTitle>
          <CardDescription className="text-sm leading-6">
            Base profile, capacity, and recent status remain in one compact section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DetailsGrid uuid={uuid ?? ""} />
        </CardContent>
      </Card>

      <Card className="rounded-lg border-border/70 shadow-none">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("nodeCard.status")}
              </div>
              <CardTitle className="text-base tracking-tight">
                Realtime history
              </CardTitle>
              <CardDescription className="text-sm leading-6">
                Recent load history remains available for quick health review.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-normal">
              {liveRecord?.time ? new Date(liveRecord.time).toLocaleString() : "-"}
            </Badge>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <Suspense fallback={<ChartSkeleton />}>
            <LoadChart data={liveDataToRecords(uuid ?? "", recent)} />
          </Suspense>
        </CardContent>
      </Card>
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
    <Card className="gap-3 rounded-lg border-border/70 py-4 shadow-none">
      <CardContent className="px-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-2 text-lg font-semibold tracking-tight">{value}</div>
        {helper ? (
          <div className="mt-1 text-sm text-muted-foreground">{helper}</div>
        ) : null}
      </CardContent>
    </Card>
  );
};

const ChartSkeleton = () => {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="gap-4 rounded-lg border-border/70 py-4 shadow-none">
          <CardHeader className="gap-2 px-4 pb-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="px-4">
            <Skeleton className="h-56 w-full rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
