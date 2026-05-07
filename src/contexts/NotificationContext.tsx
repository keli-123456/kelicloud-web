import React from "react";
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";

export type OfflineNotification = {
  client: string;
  enable: boolean;
  cooldown: number;
  grace_period: number;
  last_notified: string;
};

interface OfflineNotificationContextType {
  offlineNotification: OfflineNotification[];
  loading?: boolean;
  error?: Error | null;
  refresh: () => Promise<void>;
}

const NotificationContext = React.createContext<
  OfflineNotificationContextType | undefined
>(undefined);

export const OfflineNotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [offlineNotification, setOfflineNotification] = React.useState<OfflineNotification[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const firstLoad = React.useRef(true);
  const [error, setError] = React.useState<Error | null>(null);

  const refresh = React.useCallback(async () => {
    setError(null);
    if (firstLoad.current) setLoading(true);
    try {
      const response = await fetch("/api/admin/notification/offline");
      if (!response.ok) {
        throw new Error(formatApiErrorMessage("Failed to fetch offline notifications", { status: response.status }));
      }
      const data = await response.json();
      setOfflineNotification(data.data || []);
    } catch (error) {
      console.error("Error fetching offline notifications:", error);
      setError(new Error(getReadableErrorMessage(error)));
    } finally {
      if (firstLoad.current) {
        setLoading(false);
        firstLoad.current = false;
      }
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = React.useMemo(
    () => ({ offlineNotification, refresh, loading, error }),
    [offlineNotification, refresh, loading, error],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
export const useOfflineNotification = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error("useOfflineNotification must be used within a OfflineNotificationProvider");
  }
  return context;
};
