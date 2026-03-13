import React from "react";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

import NumberPicker from "@/components/ui/number-picker";
import Loading from "@/components/loading";
import {
  AdminPageShell,
  AdminSurface,
} from "@/components/admin/AdminPageShell";

interface Log {
  id: number;
  ip: string;
  uuid: string;
  message: string;
  msg_type: string;
  time: string;
}

const LogPage = () => {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [logs, setLogs] = React.useState<Log[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState<number>(1);
  const [total, setTotal] = React.useState<number>(1);
  const [limit, setLimit] = React.useState<number>(10);
  const [t] = useTranslation();

  React.useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/admin/logs?limit=${limit}&page=${page}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch logs");
        }
        const data = await response.json();
        setLogs(data.data.logs);
        setTotal(data.data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [limit, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const siblingsCount = 1;
  let pageNumbers: (number | string)[] = [];
  const leftSibling = Math.max(page - siblingsCount, 1);
  const rightSibling = Math.min(page + siblingsCount, totalPages);
  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < totalPages - 1;

  pageNumbers.push(1);
  if (showLeftDots) {
    pageNumbers.push("...");
  } else {
    for (let i = 2; i < leftSibling; i++) pageNumbers.push(i);
  }
  for (let i = leftSibling; i <= rightSibling; i++) {
    if (i > 1 && i < totalPages) pageNumbers.push(i);
  }
  if (showRightDots) {
    pageNumbers.push("...");
  } else {
    for (let i = rightSibling + 1; i < totalPages; i++) pageNumbers.push(i);
  }
  if (totalPages > 1) pageNumbers.push(totalPages);

  if (loading) {
    return <Loading />;
  }
  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <AdminPageShell
      eyebrow={t("logs.title")}
      title="系统日志"
      description="按分页浏览后台操作日志，快速排查来源 IP、事件类型和具体消息内容。"
      stats={[
        {
          label: "总记录",
          value: `${total}`,
          hint: "接口返回的日志总数。",
          tone: "blue",
        },
        {
          label: "当前页",
          value: `${page} / ${totalPages}`,
          hint: "切换页码查看历史记录。",
          tone: "emerald",
        },
        {
          label: "每页数量",
          value: `${limit}`,
          hint: "调整分页大小会立即重新拉取数据。",
          tone: "amber",
        },
      ]}
      actions={
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="text-slate-500">Limit</span>
          <NumberPicker
            defaultValue={limit}
            onChange={(value) => {
              setPage(1);
              setLimit(value);
            }}
            min={1}
            max={100}
          />
        </div>
      }
    >
      <AdminSurface className="overflow-hidden p-0">
        <div className="border-b border-slate-200/70 px-1 py-3">
          <div className="flex flex-col gap-1">
            <label className="text-lg font-semibold tracking-tight text-slate-900">
              日志明细
            </label>
            <p className="text-sm text-slate-500">
              点击日志 ID 可查看完整消息、UUID 和时间信息。
            </p>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-slate-500">
            当前没有日志记录。
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-[linear-gradient(135deg,rgba(19,70,134,0.10),rgba(255,255,255,0.92),rgba(89,172,119,0.10))]">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="transition-colors hover:bg-slate-50/60">
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="font-semibold text-slate-900 hover:underline"
                        >
                          {log.id}
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{t("log.title")}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">ID</div>
                            <div className="text-sm text-slate-900">{log.id}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">IP</div>
                            <div className="text-sm text-slate-900">{log.ip}</div>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">UUID</div>
                            <div className="break-all text-sm text-slate-900">{log.uuid}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Type</div>
                            <div className="text-sm text-slate-900">{log.msg_type}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Time</div>
                            <div className="text-sm text-slate-900">
                              {new Date(log.time).toLocaleString()}
                            </div>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Message</div>
                            <div className="whitespace-pre-wrap break-all rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-900">
                              {log.message}
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">{t("close")}</Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                  <TableCell>{log.ip}</TableCell>
                  <TableCell>{log.msg_type}</TableCell>
                  <TableCell>
                    {log.message.length > 75
                      ? `${log.message.slice(0, 75)}...`
                      : log.message}
                  </TableCell>
                  <TableCell>{new Date(log.time).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminSurface>

      <div className="flex justify-center items-center gap-2">
        <Button
          disabled={page === 1}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
          variant="outline"
          className="rounded-xl"
        >
          {"<"}
        </Button>
        {pageNumbers.map((value, index) =>
          typeof value === "number" ? (
            <Button
              key={index}
              variant={value === page ? "default" : "outline"}
              onClick={() => setPage(value)}
              className="rounded-xl"
            >
              {value}
            </Button>
          ) : (
            <span key={index} className="px-2 text-sm text-slate-500">
              ...
            </span>
          ),
        )}
        <Button
          disabled={page === totalPages}
          onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          variant="outline"
          className="rounded-xl"
        >
          {">"}
        </Button>
      </div>
    </AdminPageShell>
  );
};

export default LogPage;
