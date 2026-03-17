import { useEffect, useState } from "react";
import { useRPC2Call } from "@/contexts/RPC2Context";

const Footer = () => {
  const formatBuildTime = (isoString: string) => {
    const date = new Date(isoString);
    return (
      date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Shanghai",
      }) + " (GMT+8)"
    );
  };

  const buildTime =
    typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : null;
  const [versionInfo, setVersionInfo] = useState<{
    hash: string;
    version: string;
  } | null>(null);
  const { call } = useRPC2Call();

  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        const data = await call("common:getVersion");
        setVersionInfo({ hash: data.hash?.slice(0, 7), version: data.version });
      } catch (error) {
        console.error("Failed to fetch version info:", error);
      }
    };

    fetchVersionInfo();
  }, [call]);

  return (
    <footer className="mt-auto px-2 pb-2">
      <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col items-center justify-between gap-3 md:flex-row md:items-start">
          <div className="min-w-0 text-center md:text-left">
            <div className="text-sm text-muted-foreground">Powered by Komari Monitor.</div>
            {buildTime ? (
              <div className="text-xs text-muted-foreground">
                Build Time: {formatBuildTime(buildTime)}
              </div>
            ) : null}
          </div>
          <div className="min-w-0 text-center md:text-right">
            <div className="text-xs text-muted-foreground">
              {versionInfo ? `${versionInfo.version} (${versionInfo.hash})` : " "}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
