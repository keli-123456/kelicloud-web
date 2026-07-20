import React from 'react';
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";
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
  enabled?: boolean;
  listEndpoint?: string;
};

export const NodeDetailsProvider: React.FC<NodeDetailsProviderProps> = ({
  children,
  enabled = true,
  listEndpoint,
}) => {
  const [nodeDetail, setNodeDetail] = React.useState<NodeDetail[] | []>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const nodeDetailRef = React.useRef<NodeDetail[]>([]);
  const inFlightRequestRef = React.useRef<Promise<void> | null>(null);
  const requestControllerRef = React.useRef<AbortController | null>(null);
  const resolvedListEndpoint = listEndpoint || "/api/admin/client/list";

  React.useEffect(() => {
    nodeDetailRef.current = nodeDetail;
  }, [nodeDetail]);

  const refresh = React.useCallback(async (options?: { silent?: boolean }) => {
    if (!enabled) {
      setNodeDetail([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (inFlightRequestRef.current) {
      return inFlightRequestRef.current;
    }

    const silent = options?.silent ?? false;
    const shouldShowLoading = !silent && nodeDetailRef.current.length === 0;
    const shouldSurfaceError = !silent || nodeDetailRef.current.length === 0;
    const controller = new AbortController();
    requestControllerRef.current = controller;

    if (shouldShowLoading) {
      setIsLoading(true);
    }
    if (shouldSurfaceError) {
      setError(null);
    }

    const request = (async () => {
      let timedOut = false;
      const timeoutID = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 15_000);

      try {
        const response = await fetch(resolvedListEndpoint, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(formatApiErrorMessage(`HTTP error! status: ${response.status}`, { status: response.status }));
        }

        const data = (await response.json()) as NodeDetail[];
        if (requestControllerRef.current === controller && !controller.signal.aborted) {
          setNodeDetail(data);
          setError(null);
        }
      } catch (requestError) {
        if (requestControllerRef.current !== controller) {
          return;
        }
        if (shouldSurfaceError) {
          if (timedOut) {
            setError("请求超时，请稍后重试。");
          } else if (!controller.signal.aborted) {
            setError(getReadableErrorMessage(requestError));
          }
        }
      } finally {
        window.clearTimeout(timeoutID);
        if (requestControllerRef.current === controller) {
          if (shouldShowLoading) {
            setIsLoading(false);
          }
          requestControllerRef.current = null;
          inFlightRequestRef.current = null;
        }
      }
    })();

    inFlightRequestRef.current = request;
    return request;
  }, [enabled, resolvedListEndpoint]);

  React.useEffect(() => {
    void refresh();
    return () => {
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
      inFlightRequestRef.current = null;
    };
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
