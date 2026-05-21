import React from "react";
import { Check, ChevronDown } from "lucide-react";

import { Button, TextField } from "@/components/admin/cloud/cloud-ui";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getAWSRegionOptionLabel,
  type AWSRegionOption,
} from "./awsPanelCatalog";

type AWSRegionSelectProps = {
  value?: string;
  options: AWSRegionOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
};

export function AWSRegionSelect({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled = false,
  onValueChange,
}: AWSRegionSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const deferredSearchQuery = React.useDeferredValue(searchQuery.trim().toLowerCase());
  const selectedOption = React.useMemo(
    () => options.find((option) => option.name === value) || null,
    [options, value],
  );
  const filteredOptions = React.useMemo(() => {
    if (!deferredSearchQuery) {
      return options;
    }

    return options.filter((option) => {
      const haystack = [
        option.name,
        option.label,
        getAWSRegionOptionLabel(option),
        option.country,
        option.endpoint,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(deferredSearchQuery);
    });
  }, [deferredSearchQuery, options]);
  const triggerLabel = selectedOption ? getAWSRegionOptionLabel(selectedOption) : value || "";

  React.useEffect(() => {
    if (!open && searchQuery) {
      setSearchQuery("");
    }
  }, [open, searchQuery]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (disabled && nextOpen) {
          return;
        }
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full min-w-0 justify-between font-normal"
        >
          <span
            className={`min-w-0 flex-1 truncate text-left ${!triggerLabel ? "text-muted-foreground" : ""}`}
            title={triggerLabel || placeholder}
          >
            {triggerLabel || placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="z-[60] flex max-h-[min(24rem,calc(100vh-2rem))] w-[var(--radix-popover-trigger-width)] min-w-[18rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0"
      >
        <div className="border-b p-2">
          <TextField.Root
            autoFocus
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
        <div className="h-[min(18rem,calc(100vh-10rem))] min-h-0 overflow-y-auto overscroll-contain p-1 [scrollbar-gutter:stable]">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-6 text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option.name === value;
              const primaryLabel = getAWSRegionOptionLabel(option);
              const detailLabel = [option.name, option.endpoint].filter(Boolean).join(" · ");

              return (
                <button
                  key={option.name}
                  type="button"
                  className={`flex w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground ${
                    isSelected ? "bg-accent/60 text-accent-foreground" : ""
                  }`}
                  onClick={() => {
                    onValueChange(option.name);
                    setOpen(false);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{primaryLabel}</div>
                    {detailLabel ? (
                      <div className="truncate text-xs text-muted-foreground">{detailLabel}</div>
                    ) : null}
                  </div>
                  <Check className={`mt-0.5 h-4 w-4 shrink-0 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
