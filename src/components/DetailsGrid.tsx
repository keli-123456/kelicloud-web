import { useTranslation } from "react-i18next";
import { UpDownStack } from "./UpDownStack";
import { useNodeList } from "@/contexts/NodeListContext";
import { useLiveData } from "@/contexts/LiveDataContext";
import { formatUptime } from "./Node";
import { formatBytes } from "@/utils/unitHelper";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  const Container = box ? Card : "div";
  const alignToEnd = align === "center";
  const gapClass = gap === "0" ? "gap-0" : "gap-4";

  return (
    <Container
      className={cn("DetailsGrid max-w-[900px]", box && "px-4 py-4 sm:px-6")}
    >
      <div
        className={cn(
          "flex basis-full flex-wrap justify-center",
          gapClass,
          alignToEnd && "justify-between",
        )}
      >
        <UpDownStack
          className="md:w-128 flex-[0_0_calc(50%-0.5rem)]"
          up="CPU"
          down={`${node?.cpu_name} (x${node?.cpu_cores})`}
        />
        <label
          className={cn(
            "flex flex-[0_0_calc(50%-0.5rem)] flex-wrap gap-2 gap-x-8",
            alignToEnd && "justify-end",
          )}
        >
          <UpDownStack up={t("nodeCard.arch")} down={node?.arch ?? "Unknown"} />

          <UpDownStack
            up={t("nodeCard.virtualization")}
            align={alignToEnd ? "end" : "start"}
            down={node?.virtualization ?? "Unknown"}
          />
        </label>
        <UpDownStack up="GPU" down={node?.gpu_name ?? "Unknown"} className="flex-[0_0_calc(50%-0.5rem)]" />
        <div
          className={cn(
            "flex flex-[0_0_calc(50%-0.5rem)] flex-col gap-0",
            alignToEnd ? "items-end text-right" : "items-start",
          )}
        >
          <label className="text-base font-bold">{t("nodeCard.os")}</label>
          <label className="text-sm text-muted-foreground -mt-1">{node?.os ?? "Unknown"}</label>
          <label className="text-xs text-muted-foreground opacity-75">
            {t("nodeCard.kernelVersion")}: {node?.kernel_version ?? "Unknown"}
          </label>
        </div>

        <UpDownStack
          className="md:w-64 w-full flex-[0_0_calc(50%-0.5rem)]"
          up={t("nodeCard.networkSpeed")}
          down={` ↑ ${formatBytes(
            live_data?.data.data[uuid ?? ""]?.network.up || 0
          )}/s
          ↓
          ${formatBytes(
            live_data?.data.data[uuid ?? ""]?.network.down || 0
          )}/s`}
        />
        <UpDownStack
          up={t("nodeCard.totalTraffic")}
          align={alignToEnd ? "end" : "start"}
          className="flex-[0_0_calc(50%-0.5rem)]"
          down={`↑
          ${formatBytes(
            live_data?.data.data[uuid ?? ""]?.network.totalUp || 0
          )}
          ↓
          ${formatBytes(
            live_data?.data.data[uuid ?? ""]?.network.totalDown || 0
          )}`}
        />
        <UpDownStack
          className="md:w-70 w-full flex-[0_0_calc(50%-0.5rem)]"
          up={t("nodeCard.ram")}
          down={formatBytes(node?.mem_total || 0)}
        />
        <UpDownStack
          up={t("nodeCard.swap")}
          className="flex-[0_0_calc(50%-0.5rem)]"
          align={alignToEnd ? "end" : "start"}
          down={formatBytes(node?.swap_total || 0)}
        />
        <UpDownStack
          className="md:w-64 w-full flex-[0_0_calc(50%-0.5rem)]"
          up={t("nodeCard.disk")}
          down={formatBytes(node?.disk_total || 0)}
        />
        <div className="flex-[0_0_calc(50%-0.5rem)]" />
        <UpDownStack
          up={t("nodeCard.uptime")}
          className="flex-[0_0_calc(50%-0.5rem)]"
          down={
            live_data?.data.data[uuid ?? ""]?.uptime
              ? formatUptime(live_data?.data.data[uuid ?? ""]?.uptime, t)
              : "-"
          }
        />
        <label
          className={cn(
            "flex flex-[0_0_calc(50%-0.5rem)] flex-wrap gap-2",
            alignToEnd && "justify-end",
          )}
        >
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-sm font-bold">
              {t("nodeCard.last_updated")}
            </span>
            <span className="text-sm">
              {node?.updated_at
                ? new Date(
                    live_data?.data.data[uuid ?? ""]?.updated_at ||
                      node.updated_at,
                  ).toLocaleString()
                : "-"}
            </span>
          </div>
        </label>
      </div>
    </Container>
  );
};
