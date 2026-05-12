import React from "react";
import { useNodeDetails } from "@/contexts/NodeDetailsContext";
import { useTranslation } from "react-i18next";
import Selector from "./Selector";
import { Skeleton } from "@/components/ui/skeleton";

interface NodeSelectorProps {
  className?: string;
  scrollAreaClassName?: string;
  hiddenDescription?: boolean;
  value: string[]; // uuid 列表
  onChange: (uuids: string[]) => void;
  hiddenUuidOnlyClient?: boolean;
  displayMode?: "name" | "ip";
}

const NodeSelector: React.FC<NodeSelectorProps> = ({
  className = "",
  scrollAreaClassName = "",
  hiddenDescription = false,
  value,
  onChange,
  hiddenUuidOnlyClient = false,
  displayMode = "name",
}) => {
  const { nodeDetail, isLoading, error } = useNodeDetails();
  const { t } = useTranslation();
  let nodesFiltered = value;
  if (hiddenUuidOnlyClient) {
    nodesFiltered = nodesFiltered.filter((node) =>
      nodeDetail.find((n) => n.uuid === node && !n.is_only_client)
    );
  }
  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {!hiddenDescription ? <Skeleton className="h-4 w-28" /> : null}
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <div className={`rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive ${className}`}>
        {error}
      </div>
    );
  }

  const getNodeAddress = (node: (typeof nodeDetail)[number]) =>
    node.ipv4 || node.ipv6 || node.name || node.uuid;

  const getNodeLabel = (node: (typeof nodeDetail)[number]) =>
    displayMode === "ip" ? getNodeAddress(node) : node.name;

  return (
    <Selector
      className={className}
      scrollAreaClassName={`min-h-0 ${scrollAreaClassName}`}
      hiddenDescription={hiddenDescription}
      value={nodesFiltered}
      onChange={onChange}
      items={[...nodeDetail]}
      sortItems={(a, b) => (a.weight ?? 0) - (b.weight ?? 0)}
      getId={(n) => n.uuid}
      getLabel={getNodeLabel}
      filterItem={(node, keyword) => {
        const normalizedKeyword = keyword.toLowerCase();
        return [
          node.ipv4,
          node.ipv6,
          node.name,
          node.uuid,
        ].some((value) => String(value || "").toLowerCase().includes(normalizedKeyword));
      }}
      searchPlaceholder={t("common.search")}
      headerLabel={t("common.server")}
    />
  );
};

export default NodeSelector;
