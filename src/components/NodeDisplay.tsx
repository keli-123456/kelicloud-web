import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Grid3X3, Search, Table2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
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
  const onlineSearchTerms = useMemo(
    () =>
      new Set(
        ["online", "在线", "在線", String(t("nodeCard.online")).toLowerCase()].filter(Boolean),
      ),
    [t],
  );
  const offlineSearchTerms = useMemo(
    () =>
      new Set(
        ["offline", "离线", "離線", String(t("nodeCard.offline")).toLowerCase()].filter(Boolean),
      ),
    [t],
  );

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
        (onlineSearchTerms.has(term) && isOnline) ||
        (offlineSearchTerms.has(term) && !isOnline);

      return basicMatch || regionMatch || priceMatch || statusMatch;
    });
  }, [liveData, nodes, offlineSearchTerms, onlineSearchTerms, searchTerm, selectedGroup]);

  const baseSelectionCount =
    selectedGroup === "all"
      ? nodes.length
      : nodes.filter((node) => node.group === selectedGroup).length;
  const filteredOnlineCount = filteredNodes.filter((node) =>
    liveData?.online?.includes(node.uuid),
  ).length;

  return (
    <div className="w-full space-y-4">
      <div className="relative mx-4 overflow-hidden rounded-lg border border-border/60 bg-background/90 p-4 shadow-none">
        <div className="relative flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info" className="rounded-full px-3 py-1">
                  {t("nodes.explorer", { defaultValue: "Node Explorer" })}
                </Badge>
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {t("nodes.total_badge", {
                    count: nodes.length,
                    defaultValue: "{{count}} total",
                  })}
                </Badge>
                <Badge
                  variant={filteredOnlineCount > 0 ? "success" : "warning"}
                  className="rounded-full px-3 py-1"
                >
                  {t("nodes.online_in_view", {
                    count: filteredOnlineCount,
                    defaultValue: "{{count}} online in view",
                  })}
                </Badge>
              </div>
              <div>
                <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                  {t("nodes.browser_title", {
                    defaultValue:
                      "Filter by group, search instantly, then switch between card and table views.",
                  })}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {t("nodes.browser_description", {
                    defaultValue:
                      "Filter nodes by name, OS, region, or live status from one compact explorer instead of scattered controls.",
                  })}
                </p>
              </div>
            </div>

            <div className="flex w-full max-w-3xl flex-col gap-3 xl:items-end">
              <div className="relative w-full xl:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  placeholder={t("search.placeholder", {
                    defaultValue: "搜索节点名称、地区、系统...",
                  })}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-box min-w-32 rounded-full border-border/60 bg-background/90 pr-20 pl-9 shadow-none"
                />
                <span className="pointer-events-none absolute right-11 top-1/2 -translate-y-1/2 rounded-full border border-border/60 bg-muted/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                  /
                </span>
                {searchTerm ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="search-clear-button absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"
                    onClick={() => {
                      setSearchTerm("");
                      searchRef.current?.focus();
                    }}
                  >
                    <X size={12} />
                  </Button>
                ) : null}
              </div>

              <SegmentedControl.Root
                value={viewMode}
                onValueChange={(value) => setViewMode(value as ViewMode)}
                size="2"
                radius="full"
                className="bg-background/80"
              >
                <SegmentedControl.Item value="grid" className="gap-2">
                  <Grid3X3 size={15} />
                  {t("nodes.cards_view", { defaultValue: "Cards" })}
                </SegmentedControl.Item>
                <SegmentedControl.Item value="table" className="gap-2">
                  <Table2 size={15} />
                  {t("nodes.table_view", { defaultValue: "Table" })}
                </SegmentedControl.Item>
              </SegmentedControl.Root>
            </div>
          </div>

          {showGroupSelector ? (
            <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span className="text-[11px] uppercase tracking-[0.24em]">
                  {t("nodes.groups", { defaultValue: "Groups" })}
                </span>
                <span>
                  {t("nodes.current_scope", {
                    count: baseSelectionCount,
                    defaultValue: "{{count}} nodes in current scope",
                  })}
                </span>
              </div>
              <div className="overflow-x-auto pb-1">
                <SegmentedControl.Root
                  value={selectedGroup}
                  onValueChange={setSelectedGroup}
                  size="1"
                  className="w-max bg-background/80"
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
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {searchTerm.trim()
            ? t("search.results", {
                count: filteredNodes.length,
                total: baseSelectionCount,
                defaultValue: `找到 ${filteredNodes.length} 个服务器，共 ${baseSelectionCount} 个`,
              })
            : selectedGroup === "all"
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
                  online: filteredOnlineCount,
                  defaultValue: `${selectedGroup} 分组：共 ${filteredNodes.length} 个节点，${filteredOnlineCount} 个在线`,
                })}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            {t("nodes.visible_badge", {
              count: filteredNodes.length,
              defaultValue: "{{count}} visible",
            })}
          </Badge>
          <Badge
            variant={filteredOnlineCount > 0 ? "success" : "warning"}
            className="rounded-full px-3 py-1"
          >
            {t("nodes.online_badge", {
              count: filteredOnlineCount,
              defaultValue: "{{count}} online",
            })}
          </Badge>
        </div>
      </div>

      {filteredNodes.length === 0 ? (
        <div className="mx-4 rounded-lg border border-dashed border-border/70 bg-background/70 px-6 py-16 text-center">
          <span className="mb-2 block text-xl text-muted-foreground">
            {searchTerm.trim()
              ? t("search.no_results", { defaultValue: "未找到匹配的节点" })
              : t("nodes.empty", { defaultValue: "暂无节点数据" })}
          </span>
          {searchTerm.trim() ? (
            <span className="text-sm text-muted-foreground">
              {t("search.try_different", {
                defaultValue: "尝试不同的搜索关键词",
              })}
            </span>
          ) : null}
        </div>
      ) : viewMode === "grid" ? (
        <NodeGrid nodes={filteredNodes} liveData={liveData} />
      ) : (
        <Suspense fallback={<div style={{ padding: 16 }}>{t("nodes.loading_table", { defaultValue: "Loading table..." })}</div>}>
          <NodeTable nodes={filteredNodes} liveData={liveData} />
        </Suspense>
      )}
    </div>
  );
};

export default NodeDisplay;
