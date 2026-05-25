import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const NotFound: React.FC = () => {
  const [t] = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="max-w-lg rounded-lg border-border/70 bg-background/80 p-8 text-center shadow-none">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="text-7xl font-bold">404</div>
          <div className="text-balance text-xl text-muted-foreground">
            {t("page_not_found")}
          </div>
          <Link to="/">
            <Button variant="outline" className="rounded-full px-6">
              {t("go_to_home")}
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default NotFound;
