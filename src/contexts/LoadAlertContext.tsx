import React from "react";

export interface LoadAlert {
  id?: number;
  name?: string;
  clients?: string[];
  metric?: "cpu" | "ram" | "disk" | "net_in" | "net_out";
  threshold?: number;
  ratio?: number;
  interval?: number;
  last_notified?: string;
  [property: string]: any;
}

interface Response {
  data: LoadAlert[];
  message: string;
  status: string;
  [property: string]: any;
}

interface LoadAlertContextType {
  loadAlerts: LoadAlert[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const LoadAlertContext = React.createContext<LoadAlertContextType | undefined>(
  undefined,
);

export const LoadAlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [loadAlerts, setLoadAlerts] = React.useState<LoadAlert[] | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/notification/load");
      if (!response.ok) {
        throw new Error("Failed to fetch notification tasks");
      }
      const resp = (await response.json()) as Response;
      setLoadAlerts(Array.isArray(resp?.data) ? resp.data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while fetching load alerts",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = React.useMemo(
    () => ({ loadAlerts, isLoading, error, refresh }),
    [loadAlerts, isLoading, error, refresh],
  );

  return (
    <LoadAlertContext.Provider value={value}>
      {children}
    </LoadAlertContext.Provider>
  );
};

export const useLoadAlert = () => {
  const context = React.useContext(LoadAlertContext);
  if (!context) {
    throw new Error("useLoadAlert must be used within a LoadAlertProvider");
  }
  return context;
};
