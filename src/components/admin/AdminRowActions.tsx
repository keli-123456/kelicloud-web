import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type AdminRowAction = {
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  hidden?: boolean;
  onSelect: () => void;
};

function AdminRowActions({
  actions,
  label,
  className,
  contentClassName,
}: {
  actions: AdminRowAction[];
  label?: string;
  className?: string;
  contentClassName?: string;
}) {
  const { t } = useTranslation();
  const visibleActions = actions.filter((action) => !action.hidden);
  const resolvedLabel = label ?? t("common.more_actions", "更多操作");

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={resolvedLabel}
          title={resolvedLabel}
          className={cn("h-10 w-10 rounded-md sm:h-8 sm:w-8", className)}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("min-w-40", contentClassName)}
        onClick={(event) => event.stopPropagation()}
      >
        {visibleActions.map((action, index) => (
          <DropdownMenuItem
            key={index}
            disabled={action.disabled}
            variant={action.destructive ? "destructive" : "default"}
            onSelect={() => {
              action.onSelect();
            }}
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { AdminRowActions, type AdminRowAction };
