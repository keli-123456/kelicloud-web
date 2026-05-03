import "./Loading.css"
import { useTranslation } from "react-i18next";

type LoadingProps = {
  text?: string;
  children?: React.ReactNode;
  size?: number
};

const Loading = ({ text, children, size }: LoadingProps) => {
  const { t } = useTranslation();
  const loadingLabel = t("common.loading", { defaultValue: "正在加载" });

  return (
    <div className="flex min-h-36 flex-col items-center justify-center px-4 py-8 text-center">
      <div
        className="showbox"
        style={{
          transform: `scale(${size ? size * 0.1 : 0.5})`,
          transition: "transform 0.2s",
        }}
      >
        <div className="loader">
          <svg className="circular" viewBox="25 25 50 50">
            <circle
              className="path"
              cx="50"
              cy="50"
              r="20"
              fill="none"
              strokeWidth="2"
              strokeMiterlimit="10"
            />
          </svg>
        </div>
      </div>
      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {loadingLabel}
      </p>
      {text ? (
        <p className="mb-4 mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
          {text}
        </p>
      ) : null}
      <div>
        {children}
      </div>
    </div>
  );
};

export default Loading;
