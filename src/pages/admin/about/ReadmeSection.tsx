import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SquareArrowOutUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import Loading from "@/components/loading";
import "github-markdown-css/github-markdown.css";

const README_URL = "https://raw.githubusercontent.com/keli-123456/kelicloud/refs/heads/main/README.md";
const README_REPO_URL = "https://github.com/keli-123456/kelicloud/blob/main/README.md";

export default function ReadmeSection() {
  const { t } = useTranslation();
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadReadme = async () => {
      setLoading(true);

      try {
        const response = await fetch(README_URL);
        const nextMarkdown = await response.text();
        if (!cancelled) {
          setMarkdown(nextMarkdown);
        }
      } catch {
        if (!cancelled) {
          setMarkdown("");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadReadme();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="markdown-body border-t border-slate-200/80 pt-4 !bg-transparent dark:border-slate-800/80 dark:!bg-transparent dark:text-slate-200">
        {loading ? (
          <Loading />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {markdown}
          </ReactMarkdown>
        )}
      </div>
      <a
        href={README_REPO_URL}
        target="_blank"
        rel="noreferrer"
        className="flex flex-row items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
      >
        {t("about.readme_open_in_new_tab")}
        <SquareArrowOutUpRight size="16" />
      </a>
    </div>
  );
}
