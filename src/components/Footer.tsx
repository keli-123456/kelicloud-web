import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRPC2Call } from "@/contexts/RPC2Context";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { Separator } from "@/components/ui/separator";
import {
  getSiteName,
  getSiteSubtitle,
} from "@/constants/siteBrand";

const Footer = () => {
  const { t } = useTranslation();
  const { publicInfo } = usePublicInfo();
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
  const siteName = getSiteName(publicInfo?.sitename);
  const siteSubtitle = getSiteSubtitle(publicInfo?.site_subtitle, t("site.subtitle"));
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
    <footer className="mt-auto border-t border-border/80 bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="min-w-0 space-y-1 text-center md:text-left">
          <div className="text-sm font-semibold tracking-tight text-foreground">
            {siteName}
          </div>
          <div className="text-xs text-muted-foreground">{siteSubtitle}</div>
          <div className="text-sm text-muted-foreground">
            {t("site.powered_by", { siteName })}
          </div>
        </div>

        <Separator orientation="vertical" className="hidden h-8 md:block" />

        <div className="min-w-0 space-y-1 text-center md:text-right">
          <div className="text-xs text-muted-foreground">
            {versionInfo ? `${versionInfo.version} (${versionInfo.hash})` : " "}
          </div>
          {buildTime ? (
            <div className="text-xs text-muted-foreground">
              {t("site.build_time", { time: formatBuildTime(buildTime) })}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
