import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useLiveData } from "../../contexts/LiveDataContext";
import { useTranslation } from "react-i18next";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBytes } from "@/utils/unitHelper";
import { useNodeList } from "@/contexts/NodeListContext";
import fillMissingTimePoints, { type RecordFormat } from "@/utils/RecordHelper";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { usePublicInfo } from "@/contexts/PublicInfoContext";

// #region 图表
type LoadChartProps = {
  data: RecordFormat[];
  intervalSec?: number; // 数据间隔，单位秒
};

const ChartGridSkeleton = () => (
  <div
    className="grid gap-4"
    style={{ gridTemplateColumns: "repeat(auto-fit, minmax(288px, 1fr))" }}
  >
    {Array.from({ length: 4 }).map((_, index) => (
      <Card key={index}>
        <CardHeader className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[220px] w-full rounded-md" />
        </CardContent>
      </Card>
    ))}
  </div>
);

type MetricCardProps = {
  metricLabel: string;
  title: string;
  description?: string;
  latest: ReactNode;
  children: ReactNode;
};

const MetricCard = ({
  metricLabel,
  title,
  description,
  latest,
  children,
}: MetricCardProps) => (
  <Card className="overflow-hidden rounded-lg border-border/70 shadow-none">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {metricLabel}
          </div>
          <CardTitle className="truncate text-sm tracking-tight">{title}</CardTitle>
          {description ? (
            <CardDescription className="text-xs leading-5">{description}</CardDescription>
          ) : null}
        </div>
        <div className="min-w-0 text-right text-xs text-muted-foreground">
          {latest}
        </div>
      </div>
    </CardHeader>
    <CardContent className="pt-0">{children}</CardContent>
  </Card>
);

const LoadChart = ({ data = [] }: LoadChartProps) => {
  const { t } = useTranslation();
  const { live_data: all_live_data } = useLiveData();
  const { uuid } = useParams<{ uuid: string }>();
  const { nodeList } = useNodeList();
  const { publicInfo } = usePublicInfo();
  const max_record_preserve_time = publicInfo?.record_preserve_time || 0;
  // 计算可用视图
  const [hoursView, setHoursView] = useState<string>("real-time");
  const [remoteData, setRemoteData] = useState<RecordFormat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // real-time 总是可用
  // 其余根据 max_record_preserve_time (单位: 小时) 动态生成
  // 4hour, 1day(24h), 7day(168h), 30day(720h)
  // 超过最大预设则显示 "xxx hours"
  const presetViews = useMemo(
    () => [
      { label: t("chart.hours", { count: 4 }), hours: 4 },
      { label: t("chart.days", { count: 1 }), hours: 24 },
      { label: t("chart.days", { count: 7 }), hours: 168 },
      { label: t("chart.days", { count: 30 }), hours: 720 },
    ],
    [t],
  );
  const avaliableView = useMemo(() => {
    const views: { label: string; hours?: number }[] = [
      { label: t("common.real_time") },
    ];
    if (
      typeof max_record_preserve_time === "number" &&
      max_record_preserve_time > 0
    ) {
      for (const v of presetViews) {
        if (max_record_preserve_time >= v.hours) {
          views.push({ label: v.label, hours: v.hours });
        }
      }
      const maxPreset = presetViews[presetViews.length - 1];
      if (max_record_preserve_time > maxPreset.hours) {
        const dynamicLabel =
          max_record_preserve_time % 24 === 0
            ? `${t("chart.days", {
                count: Math.floor(max_record_preserve_time / 24),
              })}`
            : `${t("chart.hours", { count: max_record_preserve_time })}`;
        views.push({
          label: dynamicLabel,
          hours: max_record_preserve_time,
        });
      } else if (
        max_record_preserve_time > 4 &&
        !presetViews.some((v) => v.hours === max_record_preserve_time)
      ) {
        const dynamicLabel =
          max_record_preserve_time % 24 === 0
            ? `${t("chart.days", {
                count: Math.floor(max_record_preserve_time / 24),
              })}`
            : `${t("chart.hours", { count: max_record_preserve_time })}`;
        views.push({
          label: dynamicLabel,
          hours: max_record_preserve_time,
        });
      }
    }
    return views;
  }, [max_record_preserve_time, presetViews, t]);

  // 选择第一个可用视图为默认
  useEffect(() => {
    if (avaliableView.length > 0) {
      setHoursView(avaliableView[0].label);
    }
  }, [avaliableView]);

  // 新增：根据 hoursView 拉取数据
  useEffect(() => {
    // 找到当前 hoursView 对应的 hours
    const selected = avaliableView.find((v) => v.label === hoursView);
    if (!uuid) return;
    if (!selected || !selected.hours) {
      setRemoteData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/records/load?uuid=${uuid}&hours=${selected.hours}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((resp) => {
        const records = resp.data?.records || [];
        const gpuDevices = resp.data?.gpu_devices || {};

        // 合并基础记录和GPU数据
        const mergedRecords = records.map((record: RecordFormat) => {
          const gpuDetailed = [];

          // 遍历所有GPU设备，找到对应时间的GPU数据
          for (const deviceIndex in gpuDevices) {
            const device = gpuDevices[deviceIndex];
            const gpuRecord = device.records?.find(
              (gr: any) =>
                new Date(gr.time).getTime() === new Date(record.time).getTime()
            );

            if (gpuRecord) {
              gpuDetailed.push({
                usage: gpuRecord.utilization,
                memory: (gpuRecord.mem_used / gpuRecord.mem_total) * 100,
                temperature: gpuRecord.temperature,
                device_index: gpuRecord.device_index,
                device_name: gpuRecord.device_name,
                mem_total: gpuRecord.mem_total,
                mem_used: gpuRecord.mem_used,
              });
            }
          }

          return {
            ...record,
            gpu_detailed: gpuDetailed.length > 0 ? gpuDetailed : undefined,
          };
        });

        // 按照时间升序排序
        mergedRecords.sort(
          (a: RecordFormat, b: RecordFormat) =>
            new Date(a.time).getTime() - new Date(b.time).getTime()
        );
        // // 根据所选视图推导采样间隔，并对远程数据做瘦身，仅保留绘图需要的点数，避免高频数据占用内存
        // const selectedHours = selected.hours ?? 24;
        // const minute = 60; // s
        // const hour = 60 * 60; // s
        // // 与下方 chartData 的间隔策略保持一致
        // const intervalSec =
        //   selectedHours > 120
        //     ? hour
        //     : selectedHours === 4
        //     ? minute
        //     : 15 * minute;
        // const totalSec = selectedHours * 3600;
        // const maxNeededPoints = Math.max(
        //   1,
        //   Math.floor(totalSec / intervalSec) + 2
        // );
        // // 只保留末尾需要的数量（避免保留更高频的秒级数据）
        // const thinned = mergedRecords.slice(-maxNeededPoints);
        setRemoteData(mergedRecords);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || t("chart.error", "加载失败"));
        setLoading(false);
      });
  }, [avaliableView, hoursView, t, uuid]);

  // colors
  const colors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-4)",
    "var(--chart-3)",
  ];
  const primaryColor = colors[0];
  const secondaryColor = colors[1];
  const chartMargin = {
    top: 0,
    right: 16,
    bottom: 0,
    left: 16,
  };
  const live_data = all_live_data?.data?.data[uuid ?? ""];
  const timeFormatter = (value: any, index: number) => {
    if (index === 0 || index === chartData.length - 1) {
      if (
        presetViews[0].label === hoursView ||
        hoursView === "real-time" ||
        hoursView === t("common.real_time")
      ) {
        return new Date(value).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return new Date(value).toLocaleDateString([], {
        month: "2-digit",
        day: "2-digit",
      });
    }
    return "";
  };
  const node = nodeList?.find((n) => n.uuid === uuid);
  const lableFormatter = (value: any) => {
    const date = new Date(value);
    if (hoursView === t("common.real_time") || hoursView === "real-time") {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
    return date.toLocaleString([], {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const percentageFormatter = (value: number) => {
    return `${value.toFixed(2)}%`;
  };
  const minute = 60;
  const hour = minute * 60;
  // 限制实时模式的数据点数量，避免长时间运行时数据无限增长
  const MAX_REALTIME_POINTS = 30 * 5; // 与父组件 recent.length 一致（150）
  const isRealtime =
    hoursView === t("common.real_time") || hoursView === "real-time";
  const realtimeData = Array.isArray(data)
    ? data.slice(-MAX_REALTIME_POINTS)
    : data;

  const chartData = isRealtime
    ? realtimeData
    : hoursView === presetViews[0].label
    ? fillMissingTimePoints(remoteData ?? [], minute, hour * 4, minute * 2)
    : (() => {
        const selectedHours =
          presetViews.find((v) => v.label === hoursView)?.hours ||
          avaliableView.find((v) => v.label === hoursView)?.hours ||
          24;
        const interval = selectedHours > 120 ? hour : minute * 15;
        const maxGap = interval * 2;
        return fillMissingTimePoints(
          remoteData ?? [],
          interval,
          hour * selectedHours,
          maxGap
        );
      })();

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("chart.performance")}
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold tracking-tight">
              {t("chart.resource_history")}
            </h3>
            <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
              {t("chart.resource_history_description")}
            </p>
          </div>
        </div>
        <Tabs value={hoursView} onValueChange={setHoursView} className="w-full md:w-auto">
          <TabsList className="h-9 w-full flex-wrap justify-start md:w-auto">
            {avaliableView.map((view) => (
              <TabsTrigger
                key={view.label}
                value={view.label}
                className="capitalize"
              >
                {view.label === "real-time"
                  ? t("common.real_time")
                  : view.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {loading ? <ChartGridSkeleton /> : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {!loading && !error && chartData.length === 0 ? (
        <Alert>
          <AlertDescription>{t("common.none")}</AlertDescription>
        </Alert>
      ) : null}
      <div
        className="grid w-full gap-4"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(288px, 1fr))",
          display:
            loading || error || chartData.length === 0 ? "none" : undefined,
        }}
      >
        {/* CPU */}
        <MetricCard
          metricLabel={t("chart.metric")}
          title={t("admin.nodeDetail.cpu")}
          latest={live_data?.cpu?.usage ? `${live_data.cpu.usage.toFixed(2)}%` : "-"}
        >
          <ChartContainer
            className="h-[220px] w-full"
            config={{
              cpu: {
                label: t("admin.nodeDetail.cpu"),
                color: primaryColor,
              },
            }}
          >
            <AreaChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value, index) =>
                  index !== 0 ? `${value}%` : ""
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={percentageFormatter}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="cpu"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </MetricCard>
        {/* Ram */}
        <MetricCard
          metricLabel={t("chart.metric")}
          title={t("chart.ram")}
          latest={
            <div className="flex flex-col items-end gap-0 text-sm">
              <label>
                {live_data?.ram?.used
                  ? `${formatBytes(live_data.ram.used)} / ${formatBytes(
                      node?.mem_total || 0
                    )}`
                  : "-"}
              </label>
              <label>
                {live_data?.swap?.used
                  ? `${formatBytes(live_data.swap.used)} / ${formatBytes(
                      node?.swap_total || 0
                    )}`
                  : "-"}
              </label>
            </div>
          }
        >
          <ChartContainer
            className="h-[220px] w-full"
            config={{
              ram: {
                label: t("chart.ram"),
                color: primaryColor,
              },
              swap: {
                label: t("chart.swap"),
                color: secondaryColor,
              },
            }}
          >
            <AreaChart
              data={chartData.map((item) => ({
                time: item.time,
                ram: ((item.ram ?? 0) / (node?.mem_total ?? 1)) * 100,
                ram_raw: item.ram,
                swap: ((item.swap ?? 0) / (node?.swap_total ?? 1)) * 100,
                swap_raw: item.swap,
                client: item.client,
              }))}
              accessibilityLayer
              margin={chartMargin}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value, index) =>
                  index !== 0 ? `${value}%` : ""
                }
                orientation="left"
                type="number"
                // 让Y轴显示在图表内侧
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={(value, name, props) => {
                  // value: 百分比
                  // name: ram/swap
                  // props: { payload, ... }
                  const payload = props?.payload || {};
                  let rawValue = 0;
                  if (name === "ram") {
                    rawValue = payload.ram_raw ?? 0;
                  } else if (name === "swap") {
                    rawValue = payload.swap_raw ?? 0;
                  }
                  let percent = 0;
                  if (typeof value === "number") {
                    percent = value;
                  } else if (typeof value === "string") {
                    const parsed = parseFloat(value);
                    percent = isNaN(parsed) ? 0 : parsed;
                  } else if (Array.isArray(value)) {
                    percent =
                      typeof value[0] === "number"
                        ? value[0]
                        : parseFloat(value[0] || "0");
                  }
                  return `${formatBytes(rawValue)} (${percent.toFixed(0)}%)`;
                }}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="ram"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
              <Area
                dataKey="swap"
                animationDuration={0}
                stroke={secondaryColor}
                fill={secondaryColor}
                opacity={0.8}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </MetricCard>
        {/* Disk */}
        <MetricCard
          metricLabel={t("chart.metric")}
          title={t("admin.nodeDetail.diskTotal")}
          latest={
            live_data?.disk?.used
              ? `${formatBytes(live_data.disk.used)} / ${formatBytes(
                  node?.disk_total || 0
                )}`
              : "-"
          }
        >
          <ChartContainer
            className="h-[220px] w-full"
            config={{
              disk: {
                label: t("admin.nodeDetail.diskTotal"),
                color: primaryColor,
              },
            }}
          >
            <AreaChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, node?.disk_total || 100]}
                tickFormatter={(value, index) =>
                  index !== 0 ? `${formatBytes(value)}` : ""
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={formatBytes}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="disk"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </MetricCard>
        {/* Netwodk */}
        <MetricCard
          metricLabel={t("chart.metric")}
          title={t("nodeCard.networkSpeed")}
          latest={
            <div className="flex flex-col items-end gap-0 text-sm">
              <span>
                ↑ {formatBytes(live_data?.network.up || 0)}
                /s
              </span>
              <span>
                ↓ {formatBytes(live_data?.network.down || 0)}
                /s
              </span>
            </div>
          }
        >
          <ChartContainer
            className="h-[220px] w-full"
            config={{
              net_in: {
                label: t("chart.network_down"),
                color: primaryColor,
              },
              net_out: {
                label: t("chart.network_up"),
                color: colors[3],
              },
            }}
          >
            <LineChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value, index) =>
                  index !== 0 ? `${formatBytes(value)}` : ""
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={formatBytes}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Line
                dataKey="net_in"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
              <Line
                dataKey="net_out"
                animationDuration={0}
                stroke={colors[3]}
                fill={colors[3]}
                opacity={0.8}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </MetricCard>
        {/* Connections */}
        <MetricCard
          metricLabel={t("chart.metric")}
          title={t("chart.connections")}
          latest={
            <div className="flex flex-col items-end gap-0 text-sm">
                <span>{`${t("chart.tcp_connections")}: ${live_data?.connections.tcp}`}</span>
                <span>{`${t("chart.udp_connections")}: ${live_data?.connections.udp}`}</span>
            </div>
          }
        >
          <ChartContainer
            className="h-[220px] w-full"
            config={{
              connections: {
                label: t("chart.tcp_connections"),
                color: primaryColor,
              },
              connections_udp: {
                label: t("chart.udp_connections"),
                color: colors[3],
              },
            }}
          >
            <LineChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value, index) =>
                  index !== 0 ? `${value}` : ""
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Line
                dataKey="connections"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
              <Line
                dataKey="connections_udp"
                animationDuration={0}
                stroke={colors[3]}
                fill={colors[3]}
                opacity={0.8}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </MetricCard>
        {/* Process */}
        <MetricCard
          metricLabel={t("chart.metric")}
          title={t("chart.process")}
          latest={live_data?.process ?? "-"}
        >
          <ChartContainer
            className="h-[220px] w-full"
            config={{
              process: {
                label: t("chart.process"),
                color: primaryColor,
              },
            }}
          >
            <LineChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value, index) =>
                  index !== 0 ? `${value}` : ""
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Line
                dataKey="process"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                opacity={0.8}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </MetricCard>
        {/* GPU Charts - Each GPU gets its own chart */}
        {live_data?.gpu &&
          live_data.gpu.count > 0 &&
          live_data.gpu.detailed_info?.map((gpu, index) => (
            <MetricCard
              metricLabel={t("chart.metric")}
              key={`gpu-${index}`}
              title={`${t("chart.gpu")} ${index + 1}: ${gpu.name}`}
              description={t("chart.gpu_memory", { defaultValue: "GPU memory" })}
              latest={formatBytes(gpu.memory_total)}
            >
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 px-3 py-3 text-center">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {t("chart.usage")}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-foreground">
                    {gpu.utilization}%
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 px-3 py-3 text-center">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {t("chart.gpu_memory")}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-foreground">
                    {((gpu.memory_used / gpu.memory_total) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 px-3 py-3 text-center">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {t("nodeCard.temperature")}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-foreground">
                    {gpu.temperature}°C
                  </div>
                </div>
              </div>
              <ChartContainer
                className="h-[220px] w-full"
                config={{
              gpu_usage: {
                label: t("chart.gpu"),
                color: primaryColor,
              },
                  gpu_memory: {
                    label: t("chart.gpu_memory"),
                    color: secondaryColor,
                  },
                  gpu_temp: {
                    label: t("nodeCard.temperature"),
                    color: colors[2],
                  },
                }}
              >
                <AreaChart
                  data={chartData.map((item) => ({
                    time: item.time,
                    gpu_usage:
                      item.gpu_detailed?.[index]?.usage ?? item.gpu_usage ?? 0,
                    gpu_memory:
                      item.gpu_detailed?.[index]?.memory ??
                      item.gpu_memory ??
                      0,
                    gpu_memory_raw:
                      item.gpu_detailed?.[index]?.mem_used ??
                      (gpu.memory_total *
                        (item.gpu_detailed?.[index]?.memory || 0)) /
                        100,
                    gpu_temp: item.gpu_detailed?.[index]?.temperature ?? 0,
                    client: item.client,
                  }))}
                  accessibilityLayer
                  margin={chartMargin}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    tickFormatter={timeFormatter}
                    interval={0}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(value, index) =>
                      index !== 0 ? `${value}%` : ""
                    }
                    orientation="left"
                    type="number"
                    tick={{ dx: -10 }}
                    mirror={true}
                  />
                  <ChartTooltip
                    cursor={false}
                    formatter={(value, name, props) => {
                      if (name === "gpu_temp") {
                        return `${value}°C`;
                      }
                      if (name === "gpu_usage") {
                        return `${Number(value).toFixed(1)}%`;
                      }
                      if (name === "gpu_memory") {
                        const percentage = Number(value).toFixed(1);
                        const rawValue = props.payload?.gpu_memory_raw || 0;
                        return `${formatBytes(rawValue)}(${percentage}%)`;
                      }
                      return `${Number(value).toFixed(1)}`;
                    }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={lableFormatter}
                        indicator="dot"
                      />
                    }
                  />
                  <Area
                    dataKey="gpu_usage"
                    animationDuration={0}
                    stroke={primaryColor}
                    fill={primaryColor}
                    opacity={0.8}
                    dot={false}
                  />
                  <Area
                    dataKey="gpu_memory"
                    animationDuration={0}
                    stroke={secondaryColor}
                    fill={secondaryColor}
                    opacity={0.8}
                    dot={false}
                  />
                  <Area
                    dataKey="gpu_temp"
                    animationDuration={0}
                    stroke={colors[2]}
                    fill={colors[2]}
                    opacity={0.6}
                    dot={false}
                  />
                </AreaChart>
              </ChartContainer>
            </MetricCard>
          ))}
      </div>
    </div>
  );
};

export default LoadChart;
