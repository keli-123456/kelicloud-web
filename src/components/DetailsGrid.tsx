import { useTranslation } from "react-i18next";
import { UpDownStack } from "./UpDownStack";
import { useNodeList } from "@/contexts/NodeListContext";
import { useLiveData } from "@/contexts/LiveDataContext";
import { formatUptime } from "./Node";
import { formatBytes } from "@/utils/unitHelper";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type DetailsGridProps = {
  uuid: string;
  gap?: string;
  box?: boolean;
  align?: "start" | "center" | "end";
};

export const DetailsGrid = ({ uuid, gap, box, align }: DetailsGridProps) => {
  const { t } = useTranslation();

  const { nodeList } = useNodeList();
  const { live_data } = useLiveData();
  const node = nodeList?.find((n) => n.uuid === uuid);
  const liveRecord = live_data?.data.data[uuid ?? ""];
  const Container = box ? Card : "div";
  const tileAlign = align === "end" ? "end" : align === "center" ? "center" : "start";

  const formatDateTime = (value?: string) => {
    const normalized = String(value || "").trim();
    if (!normalized) return "-";

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return normalized;
    }
    return parsed.toLocaleString();
  };

  const items: Array<{ label: string; value: ReactNode }> = [
    {
      label: "CPU",
      value: `${node?.cpu_name || "Unknown"}${node?.cpu_cores ? ` (x${node.cpu_cores})` : ""}`,
    },
    {
      label: t("nodeCard.arch"),
      value: node?.arch ?? "Unknown",
    },
    {
      label: t("nodeCard.virtualization"),
      value: node?.virtualization ?? "Unknown",
    },
    {
      label: "GPU",
      value: node?.gpu_name ?? "Unknown",
    },
    {
      label: t("nodeCard.os"),
      value: `${node?.os ?? "Unknown"}\n${t("nodeCard.kernelVersion")}: ${node?.kernel_version ?? "Unknown"}`,
    },
    {
      label: t("nodeCard.networkSpeed"),
      value: `↑ ${formatBytes(liveRecord?.network.up || 0)}/s\n↓ ${formatBytes(liveRecord?.network.down || 0)}/s`,
    },
    {
      label: t("nodeCard.totalTraffic"),
      value: `↑ ${formatBytes(liveRecord?.network.totalUp || 0)}\n↓ ${formatBytes(liveRecord?.network.totalDown || 0)}`,
    },
    {
      label: t("nodeCard.ram"),
      value: formatBytes(node?.mem_total || 0),
    },
    {
      label: t("nodeCard.swap"),
      value: formatBytes(node?.swap_total || 0),
    },
    {
      label: t("nodeCard.disk"),
      value: formatBytes(node?.disk_total || 0),
    },
    {
      label: t("nodeCard.uptime"),
      value: liveRecord?.uptime ? formatUptime(liveRecord.uptime, t) : "-",
    },
    {
      label: t("nodeCard.last_updated"),
      value: formatDateTime(liveRecord?.time),
    },
    {
      label: t("nodeCard.node_updated_at"),
      value: formatDateTime(node?.updated_at),
    },
  ];

  return (
    <Container
      className={cn(
        "DetailsGrid",
        box && "page-section px-4 py-4 sm:px-6",
      )}
    >
      <div
        className={cn(
          "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3",
          gap === "0" && "gap-2",
        )}
      >
        {items.map((item) => (
          <UpDownStack
            key={item.label}
            up={item.label}
            down={item.value}
            align={tileAlign}
          />
        ))}
      </div>
    </Container>
  );
};
