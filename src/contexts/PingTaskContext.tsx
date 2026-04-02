import React from "react";

export interface PingTask {
  clients?: string[];
  id?: number;
  interval?: number;
  target?: string;
  type?: string;
  [property: string]: any;
}

interface Response {
  data: PingTask[];
  message: string;
  status: string;
  [property: string]: any;
}

interface PingTaskContextType {
  pingTasks: PingTask[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const PingTaskContext = React.createContext<PingTaskContextType | undefined>(
  undefined,
);

export const PingTaskProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [pingTasks, setPingTasks] = React.useState<PingTask[] | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/ping");
      if (!response.ok) {
        throw new Error("Failed to fetch ping tasks");
      }
      const resp = (await response.json()) as Response;
      setPingTasks(Array.isArray(resp?.data) ? resp.data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while fetching ping tasks",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = React.useMemo(
    () => ({ pingTasks, isLoading, error, refresh }),
    [pingTasks, isLoading, error, refresh],
  );

  return (
    <PingTaskContext.Provider value={value}>
      {children}
    </PingTaskContext.Provider>
  );
};

export const usePingTask = () => {
  const context = React.useContext(PingTaskContext);
  if (!context) {
    throw new Error("usePingTask must be used within a PingTaskProvider");
  }
  return context;
};
