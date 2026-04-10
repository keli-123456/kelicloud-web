import React, { useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import { getOSImage } from "@/utils";
import { formatBytes } from "@/utils/unitHelper";
import type { LiveData, Record } from "../types/LiveData";

import { formatUptime } from "./Node";
import { DetailsGrid } from "./DetailsGrid";
import Flag from "./Flag";
import PriceTags from "./PriceTags";
import Tips from "./ui/tips";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import UsageBar from "./UsageBar";

const MiniPingChart = React.lazy(() => import("./MiniPingChart"));

interface NodeTableProps {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
}

type SortField =
  | "name"
  | "os"
  | "status"
  | "cpu"
  | "ram"
  | "disk"
  | "price"
  | "networkUp"
  | "networkDown"
  | "totalUp"
  | "totalDown";
type SortOrder = "asc" | "desc" | "default";

interface SortState {
  field: SortField | null;
  order: SortOrder;
}

function HeaderLabel({
  children,
  icon,
  center = false,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1 ${
        center ? "justify-center" : ""
      }`}
    >
      {children}
      {icon}
    </div>
  );
}

const NodeTable: React.FC<NodeTableProps> = ({ nodes, liveData }) => {
  const [t] = useTranslation();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortState, setSortState] = useState<SortState>({
    field: null,
    order: "default",
  });

  const toggleRowExpansion = (uuid: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) {
        next.delete(uuid);
      } else {
        next.add(uuid);
      }
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    return (event: React.MouseEvent) => {
      event.preventDefault();

      setSortState((prev) => {
        if (prev.field === field) {
          const nextOrder: SortOrder =
            prev.order === "default"
              ? "asc"
              : prev.order === "asc"
                ? "desc"
                : "default";
          return {
            field: nextOrder === "default" ? null : field,
            order: nextOrder,
          };
        }

        return { field, order: "asc" };
      });
    };
  };

  const getSortIcon = (field: SortField) => {
    if (sortState.field !== field) return null;
    return sortState.order === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  };

  const onlineNodes = liveData && liveData.online ? liveData.online : [];

  const getNodeData = (uuid: string): Record => {
    const defaultLive = {
      cpu: { usage: 0 },
      swap: { used: 0 },
      load: { load1: 0, load5: 0, load15: 0 },
      ram: { used: 0 },
      disk: { used: 0 },
      network: { up: 0, down: 0, totalUp: 0, totalDown: 0 },
      connections: { tcp: 0, udp: 0 },
      uptime: 0,
      process: 0,
      message: "",
      time: "",
    } as Record;

    return liveData && liveData.data
      ? liveData.data[uuid] || defaultLive
      : defaultLive;
  };

  const sortedNodes = [...nodes].sort((a, b) => {
    const aOnline = onlineNodes.includes(a.uuid);
    const bOnline = onlineNodes.includes(b.uuid);
    const aData = getNodeData(a.uuid);
    const bData = getNodeData(b.uuid);

    if (!sortState.field || sortState.order === "default") {
      if (aOnline !== bOnline) {
        return aOnline ? -1 : 1;
      }
      return a.weight - b.weight;
    }

    let comparison = 0;
    switch (sortState.field) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "os":
        comparison = a.os.localeCompare(b.os);
        break;
      case "status":
        comparison = Number(bOnline) - Number(aOnline);
        break;
      case "cpu":
        comparison = aData.cpu.usage - bData.cpu.usage;
        break;
      case "ram": {
        const aRamPercent = a.mem_total ? (aData.ram.used / a.mem_total) * 100 : 0;
        const bRamPercent = b.mem_total ? (bData.ram.used / b.mem_total) * 100 : 0;
        comparison = aRamPercent - bRamPercent;
        break;
      }
      case "disk": {
        const aDiskPercent = a.disk_total
          ? (aData.disk.used / a.disk_total) * 100
          : 0;
        const bDiskPercent = b.disk_total
          ? (bData.disk.used / b.disk_total) * 100
          : 0;
        comparison = aDiskPercent - bDiskPercent;
        break;
      }
      case "price":
        comparison = a.price - b.price;
        break;
      case "networkUp":
        comparison = aData.network.up - bData.network.up;
        break;
      case "networkDown":
        comparison = aData.network.down - bData.network.down;
        break;
      case "totalUp":
        comparison = aData.network.totalUp - bData.network.totalUp;
        break;
      case "totalDown":
        comparison = aData.network.totalDown - bData.network.totalDown;
        break;
      default:
        comparison = 0;
    }

    return sortState.order === "desc" ? -comparison : comparison;
  });

  return (
    <div className="node-table-container mx-4 overflow-hidden rounded-[28px] border border-border/60 bg-background/95 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.42)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-4 md:px-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {t("nodes.table_view", { defaultValue: "Table" })}
          </div>
          <div className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            {t("nodeCard.totalNodes", {
              total: sortedNodes.length,
              online: onlineNodes.length,
              defaultValue: `共 ${sortedNodes.length} 个节点，${onlineNodes.length} 个在线`,
            })}
          </div>
        </div>
        <div className="rounded-full border border-border/60 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
          {t("nodeCard.sortTooltip")}
        </div>
      </div>

      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/35 hover:bg-muted/35">
            <TableHead className="w-[24px]" />
            <TableHead
              className="w-[200px] min-w-[150px] cursor-pointer select-none hover:bg-muted/60"
              onClick={handleSort("name")}
              title={t("nodeCard.sortTooltip")}
            >
              <HeaderLabel icon={getSortIcon("name")}>
                {t("nodeCard.name")}
              </HeaderLabel>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none hover:bg-muted/60"
              onClick={handleSort("os")}
              title={t("nodeCard.sortTooltip")}
            >
              <HeaderLabel icon={getSortIcon("os")}>
                {t("nodeCard.os")}
              </HeaderLabel>
            </TableHead>
            <TableHead
              className="max-w-[128px] cursor-pointer select-none hover:bg-muted/60"
              onClick={handleSort("status")}
              title={t("nodeCard.sortTooltip")}
            >
              <HeaderLabel icon={getSortIcon("status")}>
                {t("nodeCard.status")}
              </HeaderLabel>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none hover:bg-muted/60"
              onClick={handleSort("cpu")}
              title={t("nodeCard.sortTooltip")}
            >
              <HeaderLabel icon={getSortIcon("cpu")}>
                {t("nodeCard.cpu")}
              </HeaderLabel>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none hover:bg-muted/60"
              onClick={handleSort("ram")}
              title={t("nodeCard.sortTooltip")}
            >
              <HeaderLabel icon={getSortIcon("ram")}>
                {t("nodeCard.ram")}
              </HeaderLabel>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none hover:bg-muted/60"
              onClick={handleSort("disk")}
              title={t("nodeCard.sortTooltip")}
            >
              <HeaderLabel icon={getSortIcon("disk")}>
                {t("nodeCard.disk")}
              </HeaderLabel>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none hover:bg-muted/60"
              onClick={handleSort("price")}
              title={t("nodeCard.sortTooltip")}
            >
              <HeaderLabel icon={getSortIcon("price")}>
                {t("nodeCard.price")}
              </HeaderLabel>
            </TableHead>
            <TableHead
              className="min-w-[80px] cursor-pointer select-none text-center hover:bg-muted/60"
              onClick={handleSort("networkUp")}
              title={t("nodeCard.sortTooltip")}
            >
              <HeaderLabel icon={getSortIcon("networkUp")} center>
                {t("nodeCard.networkUploadSpeed")}
              </HeaderLabel>
            </TableHead>
            <TableHead
              className="min-w-[80px] cursor-pointer select-none text-center hover:bg-muted/60"
              onClick={handleSort("networkDown")}
              title={t("nodeCard.sortTooltip")}
            >
              <HeaderLabel icon={getSortIcon("networkDown")} center>
                {t("nodeCard.networkDownloadSpeed")}
              </HeaderLabel>
            </TableHead>
            <TableHead
              className="min-w-[80px] cursor-pointer select-none text-center hover:bg-muted/60"
              onClick={handleSort("totalUp")}
              title={t("nodeCard.sortTooltip")}
            >
              <HeaderLabel icon={getSortIcon("totalUp")} center>
                {t("nodeCard.totalUpload")}
              </HeaderLabel>
            </TableHead>
            <TableHead
              className="min-w-[80px] cursor-pointer select-none text-center hover:bg-muted/60"
              onClick={handleSort("totalDown")}
              title={t("nodeCard.sortTooltip")}
            >
              <HeaderLabel icon={getSortIcon("totalDown")} center>
                {t("nodeCard.totalDownload")}
              </HeaderLabel>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedNodes.map((node) => {
            const isOnline = onlineNodes.includes(node.uuid);
            const nodeData = getNodeData(node.uuid);
            const isExpanded = expandedRows.has(node.uuid);

            const memoryUsagePercent = node.mem_total
              ? (nodeData.ram.used / node.mem_total) * 100
              : 0;
            const diskUsagePercent = node.disk_total
              ? (nodeData.disk.used / node.disk_total) * 100
              : 0;

            return (
              <React.Fragment key={node.uuid}>
                <TableRow
                  className="table-row-hover cursor-pointer border-b border-border/50 transition-colors duration-200 hover:bg-muted/40"
                  onClick={() => toggleRowExpansion(node.uuid)}
                >
                  <TableCell>
                    <div className="flex items-center justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`expand-button h-8 w-8 rounded-full ${
                          isExpanded ? "expanded" : ""
                        }`}
                        aria-label="Expand row"
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </TableCell>

                  <TableCell className="node-name-cell">
                    <div className="flex items-center gap-1">
                      <Flag flag={node.region} />
                      <Link
                        to={`/instance/${node.uuid}`}
                        className="hover:text-[var(--accent-11)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div>
                          <label className="max-w-[150px] truncate text-lg font-semibold tracking-tight">
                            {node.name}
                          </label>
                          <div className="-mt-1 text-xs text-muted-foreground">
                            {isOnline ? formatUptime(nodeData.uptime, t) : "-"}
                          </div>
                        </div>
                      </Link>
                    </div>
                  </TableCell>

                  <TableCell className="w-4">
                    <img
                      src={getOSImage(node.os)}
                      alt={node.os}
                      className="mr-2 h-5 w-5"
                    />
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge variant={isOnline ? "success" : "destructive"}>
                        {isOnline ? t("nodeCard.online") : t("nodeCard.offline")}
                      </Badge>
                      {nodeData.message && (
                        <Tips color="#CE282E">{nodeData.message}</Tips>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="w-[100px]">
                      <UsageBar label="" value={nodeData.cpu.usage} compact />
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="w-[100px]">
                      <UsageBar label="" value={memoryUsagePercent} compact />
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="w-[100px]">
                      <UsageBar label="" value={diskUsagePercent} compact />
                    </div>
                  </TableCell>

                  <TableCell>
                    <PriceTags
                      price={node.price}
                      billing_cycle={node.billing_cycle}
                      expired_at={node.expired_at}
                      currency={node.currency}
                      gap="1"
                      tags={node.tags || ""}
                    />
                  </TableCell>

                  <TableCell className="min-w-[80px] text-center">
                    <label>↑{formatBytes(nodeData.network.up)}/s</label>
                  </TableCell>
                  <TableCell className="min-w-[80px] text-center">
                    <label>↓{formatBytes(nodeData.network.down)}/s</label>
                  </TableCell>
                  <TableCell className="min-w-[80px] text-center">
                    <label>↑{formatBytes(nodeData.network.totalUp)}</label>
                  </TableCell>
                  <TableCell className="min-w-[80px] text-center">
                    <label>↓{formatBytes(nodeData.network.totalDown)}</label>
                  </TableCell>
                </TableRow>

                {isExpanded && (
                  <TableRow className="expanded-row">
                    <TableCell colSpan={12} className="bg-muted/20 p-0">
                      <div className="expand-content">
                        <ExpandedNodeDetails node={node} />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
};

interface ExpandedNodeDetailsProps {
  node: NodeBasicInfo;
}

const ExpandedNodeDetails: React.FC<ExpandedNodeDetailsProps> = ({ node }) => {
  return (
    <div className="space-y-4 px-4 py-5 md:px-5">
      <DetailsGrid gap="0" uuid={node.uuid} />
      <div>
        <React.Suspense
          fallback={
            <div className="panel-muted border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          }
        >
          <MiniPingChart hours={24} uuid={node.uuid} />
        </React.Suspense>
      </div>
    </div>
  );
};

export default NodeTable;
