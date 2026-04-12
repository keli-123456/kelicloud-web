import { z } from "zod";
import { Copy } from "lucide-react";
import { t } from "i18next";

import { schema } from "@/components/admin/NodeTable/schema/node";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DetailSheetShell } from "@/components/ui/modal-shell";
import { useState } from "react";

function formatBytes(bytes?: number | string): string {
  if (!bytes || Number.isNaN(Number(bytes))) return "-";
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  let b = Number(bytes);
  if (b === 0) return "0 Bytes";
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${parseFloat((b / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
}

function DetailBlock({
  label,
  value,
  id,
}: {
  label: string;
  value: React.ReactNode;
  id: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor={id}>{label}</Label>
      <span id={id} className="rounded border bg-muted px-3 py-2 select-text">
        {value}
      </span>
    </div>
  );
}

export function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="flex h-8 items-center text-left text-md font-bold text-foreground hover:underline"
        onClick={() => setOpen(true)}
      >
        {item.name}
      </button>

      <DetailSheetShell
        open={open}
        onOpenChange={setOpen}
        direction={isMobile ? "bottom" : "right"}
        size="xl"
        title={item.name}
        description={t("admin.nodeDetail.machineDetail", "Machine details")}
        footer={(
          <Button onClick={() => setOpen(false)}>
            {t("admin.nodeDetail.done", "Finish")}
          </Button>
        )}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Label>{t("admin.nodeDetail.ipAddress", "IP address")}</Label>
            <div className="flex flex-col gap-1">
              {item.ipv4 ? (
                <div className="flex items-center gap-1">
                  <span
                    id="detail-ipv4"
                    className="flex-1 min-w-0 select-text rounded border bg-muted px-3 py-2"
                  >
                    {item.ipv4}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    type="button"
                    aria-label={t("admin.nodeTable.copyIpv4", {
                      defaultValue: "Copy IPv4 address",
                    })}
                    onClick={() => {
                      void navigator.clipboard.writeText(item.ipv4 || "");
                    }}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              ) : null}
              {item.ipv6 ? (
                <div className="flex items-center gap-1">
                  <span
                    id="detail-ipv6"
                    className="flex-1 min-w-0 select-text rounded border bg-muted px-3 py-2"
                  >
                    {item.ipv6}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    type="button"
                    aria-label={t("admin.nodeTable.copyIpv6", {
                      defaultValue: "Copy IPv6 address",
                    })}
                    onClick={() => {
                      void navigator.clipboard.writeText(item.ipv6 || "");
                    }}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <DetailBlock
            id="detail-version"
            label={t("admin.nodeDetail.clientVersion", "Client version")}
            value={item.version || <span className="text-muted-foreground">-</span>}
          />
          <DetailBlock
            id="detail-os"
            label={t("admin.nodeDetail.os", "Operating system")}
            value={item.os || <span className="text-muted-foreground">-</span>}
          />
          <DetailBlock
            id="detail-arch"
            label={t("admin.nodeDetail.arch", "Architecture")}
            value={item.arch || <span className="text-muted-foreground">-</span>}
          />
          <DetailBlock
            id="detail-cpu_name"
            label={t("admin.nodeDetail.cpu", "CPU")}
            value={item.cpu_name || <span className="text-muted-foreground">-</span>}
          />
          <DetailBlock
            id="detail-cpu_cores"
            label={t("admin.nodeDetail.cpuCores", "CPU core number")}
            value={item.cpu_cores?.toString() || <span className="text-muted-foreground">-</span>}
          />
          <DetailBlock
            id="detail-mem_total"
            label={t("admin.nodeDetail.memTotal", "Total Memory")}
            value={formatBytes(item.mem_total)}
          />
          <DetailBlock
            id="detail-disk_total"
            label={t("admin.nodeDetail.diskTotal", "Total disk space")}
            value={formatBytes(item.disk_total)}
          />
          <DetailBlock
            id="detail-gpu_name"
            label={t("admin.nodeDetail.gpu", "GPU")}
            value={item.gpu_name || <span className="text-muted-foreground">-</span>}
          />
          <DetailBlock
            id="detail-uuid"
            label={t("admin.nodeDetail.uuid", "UUID")}
            value={item.uuid || <span className="text-muted-foreground">-</span>}
          />
          <DetailBlock
            id="detail-createdAt"
            label={t("admin.nodeDetail.createdAt", "Creation time")}
            value={item.created_at ? new Date(item.created_at).toLocaleString() : <span className="text-muted-foreground">-</span>}
          />
          <DetailBlock
            id="detail-updatedAt"
            label={t("admin.nodeDetail.updatedAt", "Update time")}
            value={item.updated_at ? new Date(item.updated_at).toLocaleString() : <span className="text-muted-foreground">-</span>}
          />
        </div>
      </DetailSheetShell>
    </>
  );
}
