import React from 'react';
import { useAccount } from "@/contexts/AccountContext";

export type NodeDetail = {
  uuid: string;
  token: string;
  name: string;
  cpu_name: string;
  virtualization: string;
  arch: string;
  cpu_cores: number;
  os: string;
  gpu_name: string;
  ipv4: string;
  ipv6: string;
  region: string;
  mem_total: number;
  swap_total: number;
  disk_total: number;
  version: string;
  weight: number;
  price: number;
  remark: string | undefined;
  public_remark: string;
  group: string | undefined;
  billing_cycle: number;
  expired_at: string;
  created_at: string;
  updated_at: string;
  [key: string]: any; 
};

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

  return (
    <NodeDetailsContext.Provider value={{ nodeDetail, isLoading, error, refresh }}>
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
