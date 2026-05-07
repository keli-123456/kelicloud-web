import React from "react";
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";
//import { useRPC2Call } from "./RPC2Context";

export interface PublicInfo {
  allow_cors: boolean;
  custom_body: string;
  custom_head: string;
  description: string;
  disable_password_login: boolean;
  github_url?: string;
  oauth_provider: string;
  oauth_enable: boolean;
  ping_record_preserve_time: number;
  record_enabled: boolean;
  record_preserve_time: number;
  site_subtitle?: string;
  sitename: string;
  [property: string]: any;
}

interface Response {
  data: PublicInfo;
  message: string;
  status: string;
  [property: string]: any;
}

interface PublicInfoContextType {
  publicInfo: PublicInfo | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const PublicInfoContext = React.createContext<PublicInfoContextType | undefined>(
  undefined,
);

export const PublicInfoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [publicInfo, setPublicInfo] = React.useState<PublicInfo | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  //const { call } = useRPC2Call();
  // 公共信息使用public，避免在私有站点的情况下RPC返回401
  const refresh = React.useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/public");
      if (!response.ok) {
        throw new Error(formatApiErrorMessage("Failed to fetch public info", { status: response.status }));
      }
      const resp = (await response.json()) as Response;
      setPublicInfo(resp?.data ?? null);
    } catch (err) {
      setError(
        getReadableErrorMessage(err, "获取站点公开信息失败，请刷新后重试。"),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = React.useMemo(
    () => ({ publicInfo, isLoading, error, refresh }),
    [publicInfo, isLoading, error, refresh],
  );

  return (
    <PublicInfoContext.Provider value={value}>
      {children}
    </PublicInfoContext.Provider>
  );
};

export const usePublicInfo = () => {
  const context = React.useContext(PublicInfoContext);
  if (!context) {
    throw new Error("usePublicInfo must be used within a PublicInfoProvider");
  }
  return context;
};
