import React from 'react';
import { useAccount } from "@/contexts/AccountContext";
import type { AdminNodeDto } from "@/types/nodeDtos";

export type NodeDetail = AdminNodeDto;

interface NodeDetailsContextType {
  nodeDetail: NodeDetail[] | [];
  isLoading: boolean;
  error: string | null;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
}
const NodeDetailsContext = React.createContext<NodeDetailsContextType | undefined>(undefined);

type NodeDetailsProviderProps = {
  children: React.ReactNode;
  listEndpoint?: string;
};

export const NodeDetailsProvider: React.FC<NodeDetailsProviderProps> = ({
  children,
  listEndpoint,
}) => {
  const { platformAdmin } = useAccount();
  const [nodeDetail, setNodeDetail] = React.useState<NodeDetail[] | []>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const nodeDetailRef = React.useRef<NodeDetail[]>([]);
  const defaultListEndpoint = React.useMemo(
    () => (platformAdmin ? "/api/admin/client/list?all=1" : "/api/admin/client/list"),
    [platformAdmin],
  );
  const resolvedListEndpoint = listEndpoint || defaultListEndpoint;

  React.useEffect(() => {
    nodeDetailRef.current = nodeDetail;
  }, [nodeDetail]);

  const refresh = React.useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    const shouldShowLoading = !silent && nodeDetailRef.current.length === 0;

    if (shouldShowLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(resolvedListEndpoint);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as NodeDetail[];
      setNodeDetail(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      if (shouldShowLoading) {
        setIsLoading(false);
      }
    }
  }, [resolvedListEndpoint]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = React.useMemo(
    () => ({ nodeDetail, isLoading, error, refresh }),
    [nodeDetail, isLoading, error, refresh],
  );

  return (
    <NodeDetailsContext.Provider value={value}>
      {children}
    </NodeDetailsContext.Provider>
  );
};

export const useNodeDetails = () => {
    const context = React.useContext(NodeDetailsContext);
    if (context === undefined) {
        throw new Error("useNodeDetails must be used within a NodeDetailsProvider");
    }
    return context;
};
