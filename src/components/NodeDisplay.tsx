import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Grid3X3, Search, Table2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData } from "../types/LiveData";
import { NodeGrid } from "./Node";
import { isRegionMatch } from "@/utils/regionHelper";

import "./NodeDisplay.css";

const NodeTable = React.lazy(() => import("./NodeTable"));

export type ViewMode = "grid" | "table";

interface NodeDisplayProps {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
}

const NodeDisplay: React.FC<NodeDisplayProps> = ({ nodes, liveData }) => {
  const [t] = useTranslation();
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>(
    "nodeViewMode",
    "grid",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useLocalStorage<string>(
    "nodeSelectedGroup",
    "all",
  );
  const searchRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(() => {
    const groupSet = new Set<string>();
    nodes.forEach((node) => {
      if (node.group && node.group.trim()) {
        groupSet.add(node.group);
      }
    });
    return Array.from(groupSet).sort();
  }, [nodes]);

  const showGroupSelector = groups.length >= 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && searchTerm) {
        setSearchTerm("");
        searchRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchTerm]);

  const filteredNodes = useMemo(() => {
    let result = nodes;

    if (selectedGroup !== "all") {
      result = result.filter((node) => node.group === selectedGroup);
    }

    if (!searchTerm.trim()) return result;

    const term = searchTerm.toLowerCase().trim();
    return result.filter((node) => {
      const basicMatch =
        node.name.toLowerCase().includes(term) ||
        node.os.toLowerCase().includes(term) ||
        node.arch.toLowerCase().includes(term);

      const regionMatch = isRegionMatch(node.region, term);
      const priceMatch =
        !Number.isNaN(Number(term)) && node.price.toString().includes(term);
      const isOnline = liveData?.online?.includes(node.uuid) || false;
      const statusMatch =
        ((term === "online" || term === "在线") && isOnline) ||
        ((term === "offline" || term === "离线") && !isOnline);

      return basicMatch || regionMatch || priceMatch || statusMatch;
    });
  }, [liveData, nodes, searchTerm, selectedGroup]);

  return (
    <div className="w-full">
      <div className="control-bar mb-2 flex flex-col gap-4 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder={t("search.placeholder", {
              defaultValue: "搜索节点名称、地区、系统...",
            })}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-box min-w-32 pr-9 pl-9"
          />
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="search-clear-button absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => {
                setSearchTerm("");
                searchRef.current?.focus();
              }}
            >
              <X size={12} />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="whitespace-nowrap text-md text-muted-foreground">
            {t("view.mode", { defaultValue: "显示模式" })}
          </label>
          <div className="flex gap-1">
            <Button
              type="button"
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="view-switch-button"
            >
              <Grid3X3 size={16} />
            </Button>
            <Button
              type="button"
              variant={viewMode === "table" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("table")}
              className="view-switch-button"
            >
              <Table2 size={16} />
            </Button>
          </div>
        </div>
      </div>

      {showGroupSelector && (
        <div className="mx-4 mb-2 -mt-2 flex items-center gap-2 overflow-x-auto">
          <label className="whitespace-nowrap text-md text-muted-foreground">
            {t("common.group", { defaultValue: "分组" })}
          </label>
          <SegmentedControl.Root
            value={selectedGroup}
            onValueChange={setSelectedGroup}
            size="1"
          >
            <SegmentedControl.Item value="all">
              {t("common.all", { defaultValue: "所有" })}
            </SegmentedControl.Item>
            {groups.map((group) => (
              <SegmentedControl.Item key={group} value={group}>
                {group}
              </SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>
        </div>
      )}

      <div className="mx-4 mb-2 flex items-center justify-between">
        {searchTerm.trim() ? (
          <span className="text-sm text-muted-foreground">
            {t("search.results", {
              count: filteredNodes.length,
              total:
                selectedGroup === "all"
                  ? nodes.length
                  : nodes.filter((n) => n.group === selectedGroup).length,
              defaultValue: `找到 ${filteredNodes.length} 个服务器，共 ${
                selectedGroup === "all"
                  ? nodes.length
                  : nodes.filter((n) => n.group === selectedGroup).length
              } 个`,
            })}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            {selectedGroup === "all"
              ? t("nodeCard.totalNodes", {
                  total: nodes.length,
                  online: liveData?.online?.length || 0,
                  defaultValue: `共 ${nodes.length} 个节点，${
                    liveData?.online?.length || 0
                  } 个在线`,
                })
              : t("nodeCard.groupNodes", {
                  group: selectedGroup,
                  total: filteredNodes.length,
                  online: filteredNodes.filter((n) =>
                    liveData?.online?.includes(n.uuid),
                  ).length,
                  defaultValue: `${selectedGroup} 分组：共 ${
                    filteredNodes.length
                  } 个节点，${
                    filteredNodes.filter((n) =>
                      liveData?.online?.includes(n.uuid),
                    ).length
                  } 个在线`,
                })}
          </span>
        )}
      </div>

      {filteredNodes.length === 0 ? (
        <div className="mx-4 flex flex-col items-center justify-center py-16">
          <span className="mb-2 text-xl text-muted-foreground">
            {searchTerm.trim()
              ? t("search.no_results", { defaultValue: "未找到匹配的节点" })
              : t("nodes.empty", { defaultValue: "暂无节点数据" })}
          </span>
          {searchTerm.trim() && (
            <span className="text-sm text-muted-foreground">
              {t("search.try_different", {
                defaultValue: "尝试不同的搜索关键词",
              })}
            </span>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <NodeGrid nodes={filteredNodes} liveData={liveData} />
      ) : (
        <Suspense fallback={<div style={{ padding: 16 }}>Loading table…</div>}>
          <NodeTable nodes={filteredNodes} liveData={liveData} />
        </Suspense>
      )}
    </div>
  );
};

export default NodeDisplay;
