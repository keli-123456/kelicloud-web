import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { cutPeakValues, interpolateNullsLinear } from "@/utils/RecordHelper";
import { Eye, EyeOff, Info, MoreHorizontal } from "lucide-react";
import { useRPC2Call } from "@/contexts/RPC2Context";

interface PingRecord {
  client: string;
  task_id: number;
  time: string;
  value: number;
}
interface TaskInfo {
  id: number;
  name: string;
  interval: number;
  loss: number;
  p99?: number;
  p50?: number;
  p99_p50_ratio?: number;
  min?: number;
  max?: number;
  avg?: number;
  latest?: number;
  total?: number;
  type?: string;
}
// 移除旧的 REST API 响应类型，改用 RPC2 返回结构

//const MAX_POINTS = 1000;
const colors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#3b82f6",
  "#f97316",
  "#10b981",
];

const PingChartSkeleton = () => (
  <div className="space-y-4">
    <Card>
      <CardHeader className="space-y-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="space-y-3">
        <Skeleton className="h-4 w-16" />
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-48" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[320px] w-full rounded-md" />
      </CardContent>
    </Card>
  </div>
);

const PingChart = ({ uuid }: { uuid: string }) => {
  const { t } = useTranslation();
  const { publicInfo } = usePublicInfo();
  const { call } = useRPC2Call();
  const max_record_preserve_time = publicInfo?.ping_record_preserve_time || 0;
  // 视图选项
  const presetViews = useMemo(
    () => [
      { label: t("chart.hours", { count: 1 }), hours: 1 },
      { label: t("chart.hours", { count: 6 }), hours: 6 },
      { label: t("chart.hours", { count: 12 }), hours: 12 },
      { label: t("chart.days", { count: 1 }), hours: 24 },
    ],
    [t],
  );
  const avaliableView = useMemo(() => {
    const views: { label: string; hours?: number }[] = [];
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
        max_record_preserve_time > 1 &&
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

  // 默认视图设为1小时
  const initialView =
    avaliableView.find((v) => v.hours === 1)?.label ||
    avaliableView[0]?.label ||
    "";
  const [view, setView] = useState<string>(initialView);
  const [hours, setHours] = useState<number>(
    avaliableView.find((v) => v.label === initialView)?.hours || 1
  ); // Add hours state

  const [remoteData, setRemoteData] = useState<PingRecord[] | null>(null);
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cutPeak, setCutPeak] = useState(false);

  useEffect(() => {
    const nextView =
      avaliableView.find((option) => option.label === view)?.label ||
      avaliableView.find((option) => option.hours === 1)?.label ||
      avaliableView[0]?.label ||
      "";
    if (nextView !== view) {
      setView(nextView);
    }
  }, [avaliableView, view]);

  // Update hours state when view changes
  useEffect(() => {
    const selected = avaliableView.find((v) => v.label === view);
    if (selected && selected.hours !== undefined) {
      setHours(selected.hours);
    }
  }, [view, avaliableView]);

  // 拉取历史数据（改为 RPC2: common:getRecords）
  useEffect(() => {
    if (!uuid) return;
    if (!hours) {
      // Use hours directly
      setRemoteData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    (async () => {
      try {
        type RpcResp = {
          count: number;
          records: PingRecord[];
          tasks?: TaskInfo[];
          from?: string;
          to?: string;
        };
        const result = await call<any, RpcResp>("common:getRecords", {
          uuid,
          type: "ping",
          hours,
        });
        const records = result?.records || [];
        records.sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
        );
        setRemoteData(records);
        setTasks(result?.tasks || []);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || t("common.error"));
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [call, hours, uuid]); // Depend on hours

  const midData = useMemo(() => {
    // 与 Mini 保持一致：只使用合并抖动后的真实锚点，并截取到最后 hours 窗口范围。
    const data = remoteData || [];
    if (!data.length) return [];

    // 参考间隔（若缺失则 60s），仅用于抖动合并容差
    const taskIntervals = tasks
      .map((t) => t.interval)
      .filter((v): v is number => typeof v === "number" && v > 0);
    const fallbackIntervalSec = taskIntervals.length
      ? Math.min(...taskIntervals)
      : 60;

    // 合并抖动：0.25 * 参考间隔（0.8s ~ 6s）
    const toleranceMs = Math.min(
      6000,
      Math.max(800, Math.floor(fallbackIntervalSec * 1000 * 0.25))
    );
    const grouped: Record<number, any> = {};
    const anchors: number[] = [];
    for (const rec of data) {
      const ts = new Date(rec.time).getTime();
      let anchor: number | null = null;
      for (const a of anchors) {
        if (Math.abs(a - ts) <= toleranceMs) {
          anchor = a;
          break;
        }
      }
      const use = anchor ?? ts;
      if (!grouped[use]) {
        grouped[use] = { time: new Date(use).toISOString() };
        if (anchor === null) anchors.push(use);
      }
      grouped[use][rec.task_id] = rec.value < 0 ? null : rec.value;
    }
    const merged = Object.values(grouped).sort(
      (a: any, b: any) =>
        new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    // 截取最后 hours 窗口，并多保留一个窗口外的前置点，便于边界插值
    const lastTs = new Date(
      (merged as any[])[(merged as any[]).length - 1].time
    ).getTime();
    const fromTs = lastTs - hours * 3600_000;
    let startIdx = 0;
    for (let i = 0; i < (merged as any[]).length; i++) {
      const ts = new Date((merged as any[])[i].time).getTime();
      if (ts >= fromTs) {
        startIdx = Math.max(0, i - 1);
        break;
      }
    }
    const clipped = (merged as any[]).slice(startIdx);
    return clipped;
  }, [remoteData, tasks, hours]);

  // 组装图表数据
  const chartData = useMemo(() => {
    let full = midData;
    // 如果开启削峰，应用削峰处理
    if (cutPeak && tasks.length > 0) {
      const taskKeys = tasks.map((task) => String(task.id));
      full = cutPeakValues(midData, taskKeys);
    }
    // 无论是否平滑显示曲线，都做一次“真实感插值”：
    // 仅在相邻有效点之间用线性插值填补中间 null，避免大量零散段。
    // 数据驱动：每条线使用“中位采样间隔 * 倍数（默认6）”作为最大插值跨度，并钳制在 [2min, 30min]。
    if (tasks.length > 0 && full.length > 0) {
      const keys = tasks.map((t) => String(t.id));
      full = interpolateNullsLinear(full, keys, {
        maxGapMultiplier: 6,
        minCapMs: 2 * 60_000,
        maxCapMs: 30 * 60_000,
      });
    }
    return full;
  }, [cutPeak, midData, tasks]);

  // 时间格式化
  const timeFormatter = (value: any, index: number) => {
    if (!chartData.length) return "";
    if (index === 0 || index === chartData.length - 1) {
      if (hours < 24) {
        // Use hours for conditional formatting
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
  const lableFormatter = (value: any) => {
    const date = new Date(value);
    if (hours < 24) {
      // Use hours for conditional formatting
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

  // 颜色配置
  const chartConfig = useMemo(() => {
    const config: Record<string, any> = {};
    tasks.forEach((task, idx) => {
      config[task.id] = {
        label: `${task.name}${
          typeof task.p99_p50_ratio === "number"
            ? ` (${t("chart.volatility")}: ${task.p99_p50_ratio.toFixed(2)})`
            : ""
        }`,
        color: colors[idx % colors.length],
      };
    });
    return config;
  }, [t, tasks]);

  const latestValues = useMemo(() => {
    if (!remoteData || !tasks.length) return [];
    const map = new Map<number, PingRecord>();

    // 为每个task找到最新的有效值（>=0）
    for (const task of tasks) {
      for (let i = remoteData.length - 1; i >= 0; i--) {
        const rec = remoteData[i];
        if (rec.task_id === task.id && rec.value >= 0) {
          map.set(task.id, rec);
          break;
        }
      }
    }

    return tasks.map((task, idx) => ({
      ...task,
      value: map.get(task.id)?.value ?? null,
      time: map.get(task.id)?.time ?? null,
      color: colors[idx % colors.length],
    }));
  }, [remoteData, tasks]);

  const [hiddenLines, setHiddenLines] = useState<Record<string, boolean>>({});
  const toggleLine = useCallback((key: string) => {
    setHiddenLines((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleAllLines = useCallback(() => {
    const allHidden = tasks.every((task) => hiddenLines[String(task.id)]);
    const newHiddenState: Record<string, boolean> = {};
    tasks.forEach((task) => {
      newHiddenState[String(task.id)] = !allHidden;
    });
    setHiddenLines(newHiddenState);
  }, [tasks, hiddenLines]);
  const allLinesHidden =
    tasks.length > 0 && tasks.every((task) => hiddenLines[String(task.id)]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("chart.latency")}
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold tracking-tight">
              {t("chart.ping_history")}
            </h3>
            <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
              {t("chart.ping_header_description")}
            </p>
          </div>
        </div>
        <Tabs
          value={view}
          onValueChange={(newView) => {
            setView(newView);
            const selected = avaliableView.find((v) => v.label === newView);
            if (selected && selected.hours !== undefined) {
              setHours(selected.hours);
            }
          }}
          className="w-full md:w-auto"
        >
          <TabsList className="h-9 w-full flex-wrap justify-start md:w-auto">
            {avaliableView.map((v) => (
              <TabsTrigger
                key={v.label}
                value={v.label}
                className="capitalize"
              >
                {v.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {loading ? <PingChartSkeleton /> : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {latestValues.length > 0 ? (
        <Card className="rounded-xl border-border/70 shadow-none">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {t("chart.overview")}
                </div>
                <CardTitle className="text-sm tracking-tight">
                  {t("chart.task_summaries")}
                </CardTitle>
                <CardDescription className="text-xs leading-5">
                  {t("chart.task_summary_description")}
                </CardDescription>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p>{t("chart.loss_tips")}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(auto-fit, minmax(240px,1fr))`,
              }}
            >
            {latestValues.map((task) => (
              <Card key={task.id} className="rounded-lg border-border/70 bg-card shadow-none">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className="mt-1 h-10 w-1.5 rounded-full"
                        style={{ backgroundColor: task.color }}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {task.name}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {task.time ? lableFormatter(task.time) : t("common.none")}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 px-2 py-1.5 text-sm">
                        {typeof task.min === "number" && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.min")}
                            </span>
                            <span className="font-mono">
                              {Math.round(task.min)} ms
                            </span>
                          </>
                        )}
                        {typeof task.max === "number" && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.max")}
                            </span>
                            <span className="font-mono">
                              {Math.round(task.max)} ms
                            </span>
                          </>
                        )}
                        {typeof task.avg === "number" && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.avg")}
                            </span>
                            <span className="font-mono">
                              {Math.round(task.avg)} ms
                            </span>
                          </>
                        )}
                        {typeof task.latest === "number" && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.latest")}
                            </span>
                            <span className="font-mono">
                              {Math.round(task.latest)} ms
                            </span>
                          </>
                        )}
                        {typeof task.p99_p50_ratio === "number" && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.volatility")}
                            </span>
                            <span className="font-mono">
                              {task.p99_p50_ratio.toFixed(2)}
                            </span>
                          </>
                        )}
                        {typeof task.p50 === "number" && (
                          <>
                            <span className="text-muted-foreground">p50</span>
                            <span className="font-mono">
                              {Math.round(task.p50)} ms
                            </span>
                          </>
                        )}
                        {typeof task.p99 === "number" && (
                          <>
                            <span className="text-muted-foreground">p99</span>
                            <span className="font-mono">
                              {Math.round(task.p99)} ms
                            </span>
                          </>
                        )}
                        {typeof task.loss === "number" && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.lossRate")}
                            </span>
                            <span className="font-mono">
                              {Number(task.loss).toFixed(1)}%
                            </span>
                          </>
                        )}
                        {typeof task.interval === "number" && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.interval")}
                            </span>
                            <span className="font-mono">{task.interval}s</span>
                          </>
                        )}
                        {task.type && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.type")}
                            </span>
                            <span className="font-mono uppercase">
                              {task.type}
                            </span>
                          </>
                        )}
                        {typeof task.total === "number" && (
                          <>
                            <span className="text-muted-foreground">
                              {t("chart.total")}
                            </span>
                            <span className="font-mono">{task.total}</span>
                          </>
                        )}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-end justify-between gap-3">
                    <div className="text-xl font-semibold tracking-tight text-foreground">
                      {task.value !== null
                        ? `${Number(task.value).toFixed(0)} ms`
                        : "-"}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">
                        {`${Number(task.loss).toFixed(1)}% ${t("chart.lossRate")}`}
                      </Badge>
                    {typeof task.p99_p50_ratio === "number" && (
                      <Badge title="p99/p50" variant="secondary">
                        {task.p99_p50_ratio.toFixed(1)}
                        {t("chart.volatility")}
                      </Badge>
                    )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          </CardContent>
        </Card>
      ) : !loading && !error ? (
        <Alert>
          <AlertDescription>{t("common.none")}</AlertDescription>
        </Alert>
      ) : null}
      {!loading && !error ? (
        <Card className="rounded-xl border-border/70 shadow-none">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {t("chart.trend")}
                </div>
                <CardTitle className="text-sm tracking-tight">
                  {t("chart.ping_history")}
                </CardTitle>
                <CardDescription className="text-xs leading-5">
                  {t("chart.ping_chart_description")}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                  <Switch
                    id="cut-peak"
                    checked={cutPeak}
                    onCheckedChange={setCutPeak}
                  />
                  <label
                    htmlFor="cut-peak"
                    className="flex items-center gap-1 text-sm font-medium"
                  >
                    {t("chart.cutPeak")}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Info className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <span
                          dangerouslySetInnerHTML={{ __html: t("chart.cutPeak_tips") }}
                        />
                      </TooltipContent>
                    </Tooltip>
                  </label>
                </div>
                <Button
                  variant="outline"
                  onClick={toggleAllLines}
                  className="flex items-center gap-2"
                >
                  {allLinesHidden ? (
                    <>
                      <Eye size={16} />
                      {t("chart.showAll")}
                    </>
                  ) : (
                    <>
                      <EyeOff size={16} />
                      {t("chart.hideAll")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
          {chartData.length === 0 ? (
            <Alert>
              <AlertDescription>{t("common.none")}</AlertDescription>
            </Alert>
          ) : (
            <>
              <ChartContainer
                className="h-[320px] w-full"
                config={chartConfig}
              >
                <LineChart
                  data={chartData}
                  accessibilityLayer
                  margin={{ top: 0, right: 16, bottom: 0, left: 16 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    tickFormatter={timeFormatter}
                    interval="preserveStartEnd"
                    minTickGap={30}
                    allowDuplicatedCategory={false}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    unit="ms"
                    allowDecimals={false}
                    orientation="left"
                    type="number"
                    tick={{ dx: -10 }}
                    mirror={true}
                  />
                  <ChartTooltip
                    cursor={false}
                    formatter={(v: any) => `${Math.round(v)} ms`}
                    content={
                      <ChartTooltipContent
                        labelFormatter={lableFormatter}
                        indicator="dot"
                      />
                    }
                  />
                  {tasks.map((task, idx) => {
                    const connect = false;
                    return (
                      <Line
                        key={task.id}
                        dataKey={String(task.id)}
                        name={task.name}
                        stroke={colors[idx % colors.length]}
                        dot={false}
                        isAnimationActive={false}
                        strokeWidth={2}
                        connectNulls={connect}
                        type={cutPeak ? "basis" : "linear"}
                        hide={!!hiddenLines[String(task.id)]}
                      />
                    );
                  })}
                </LineChart>
              </ChartContainer>
              <div className="flex flex-wrap gap-2">
                {tasks.map((task, idx) => {
                  const key = String(task.id);
                  const hidden = !!hiddenLines[key];

                  return (
                    <Button
                      key={task.id}
                      onClick={() => toggleLine(key)}
                      variant={hidden ? "outline" : "secondary"}
                      size="sm"
                      className="h-8"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: colors[idx % colors.length] }}
                      />
                      <span className="truncate">{task.name}</span>
                    </Button>
                  );
                })}
              </div>
            </>
          )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default PingChart;
