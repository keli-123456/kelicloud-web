import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDownIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

type LegacyButtonVariant = "solid" | "soft" | "outline" | "ghost";

interface SettingCardProps {
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bordless?: boolean;
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  onHeaderClick?: () => void;
}

function getDirectionClass(direction: SettingCardProps["direction"]) {
  switch (direction) {
    case "row":
      return "flex-row";
    case "row-reverse":
      return "flex-row-reverse";
    case "column-reverse":
      return "flex-col-reverse";
    default:
      return "flex-col";
  }
}

function mapButtonVariant(variant: LegacyButtonVariant = "solid") {
  switch (variant) {
    case "soft":
      return "outline" as const;
    case "outline":
      return "outline" as const;
    case "ghost":
      return "ghost" as const;
    default:
      return "default" as const;
  }
}

export function SettingCard({
  title = "",
  description = "",
  children,
  className = "",
  direction = "column",
  bordless = false,
  onHeaderClick,
}: SettingCardProps) {
  const actionChild = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === Action,
  );

  const otherChildren = React.Children.toArray(children).filter(
    (child) => !(React.isValidElement(child) && child.type === Action),
  );

  return (
    <div
      className={cn(
        "flex gap-2",
        getDirectionClass(direction),
        bordless
          ? "border-0 bg-transparent p-0 shadow-none"
          : "min-h-0 border-b border-border/70 px-0 py-2.5",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full items-start justify-between gap-3",
          onHeaderClick && "cursor-pointer",
        )}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("[data-setting-action='true']")) {
            return;
          }
          onHeaderClick?.();
        }}
      >
        <div className="min-h-0 flex-1 space-y-1">
          <div className="text-[14px] font-medium tracking-tight text-foreground">
            {title}
          </div>
          {description ? (
            <div className="text-[13px] leading-5 text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
        {actionChild}
      </div>
      {otherChildren}
    </div>
  );
}

function Action({ children }: { children: React.ReactNode }) {
  return <div data-setting-action="true">{children}</div>;
}

SettingCard.Action = Action;

export function SettingCardSwitch({
  label = "",
  autoDisabled = true,
  defaultChecked,
  onChange,
  ...props
}: SettingCardProps & {
  label?: string;
  autoDisabled?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean, switchElement: HTMLButtonElement) => void;
}) {
  const switchRef = React.useRef<HTMLButtonElement>(null);
  const [disabled, setDisabled] = React.useState(false);
  const [checked, setChecked] = React.useState(defaultChecked || false);

  const handleChange = (nextChecked: boolean) => {
    if (autoDisabled) setDisabled(true);
    const previousValue = checked;
    setChecked(nextChecked);
    const result: unknown =
      onChange && switchRef.current
        ? onChange(nextChecked, switchRef.current)
        : undefined;

    if (autoDisabled && result && typeof (result as Promise<unknown>).then === "function") {
      (result as Promise<unknown>)
        .catch(() => {
          setChecked(previousValue);
        })
        .finally(() => {
          setDisabled(false);
        });
      return;
    }

    if (autoDisabled) setDisabled(false);
  };

  return (
    <SettingCard {...props} direction="column">
      <SettingCard.Action>
        <div className="flex items-center gap-2">
          <label className="text-[13px] text-muted-foreground">{label}</label>
          <Switch
            ref={switchRef}
            checked={checked}
            onCheckedChange={handleChange}
            disabled={disabled}
          />
        </div>
      </SettingCard.Action>
    </SettingCard>
  );
}

export function SettingCardButton({
  label = "",
  variant = "solid",
  children,
  onClick,
  autoDisabled = true,
  ...props
}: SettingCardProps & {
  label?: string;
  variant?: LegacyButtonVariant;
  children?: React.ReactNode;
  onClick?: (buttonElement: HTMLButtonElement) => void;
  autoDisabled?: boolean;
}) {
  const [disabled, setDisabled] = React.useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (autoDisabled) setDisabled(true);
    const result: unknown = onClick ? onClick(event.currentTarget) : undefined;

    if (autoDisabled && result && typeof (result as Promise<unknown>).then === "function") {
      (result as Promise<unknown>).finally(() => setDisabled(false));
      return;
    }

    if (autoDisabled) setDisabled(false);
  };

  return (
    <SettingCard {...props} direction="column">
      <SettingCard.Action>
        <div className="flex items-center gap-2">
          <label className="text-[13px] text-muted-foreground">{label}</label>
          <Button
            onClick={handleClick}
            variant={mapButtonVariant(variant)}
            disabled={disabled}
            size="sm"
            className="rounded-md text-[13px]"
          >
            {children}
          </Button>
        </div>
      </SettingCard.Action>
    </SettingCard>
  );
}

export function SettingCardIconButton({
  label = "",
  variant = "solid",
  children,
  onClick,
  autoDisabled = true,
  ...props
}: SettingCardProps & {
  label?: string;
  variant?: LegacyButtonVariant;
  children?: React.ReactNode;
  onClick?: (buttonElement: HTMLButtonElement) => void;
  autoDisabled?: boolean;
}) {
  const [disabled, setDisabled] = React.useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (autoDisabled) setDisabled(true);
    const result: unknown = onClick ? onClick(event.currentTarget) : undefined;

    if (autoDisabled && result && typeof (result as Promise<unknown>).then === "function") {
      (result as Promise<unknown>).finally(() => setDisabled(false));
      return;
    }

    if (autoDisabled) setDisabled(false);
  };

  return (
    <SettingCard {...props} direction="column">
      <SettingCard.Action>
        <div className="flex items-center gap-2">
          <label className="text-[13px] text-muted-foreground">{label}</label>
          <Button
            onClick={handleClick}
            variant={mapButtonVariant(variant)}
            disabled={disabled}
            size="icon"
            className="size-8 rounded-md"
          >
            {children}
          </Button>
        </div>
      </SettingCard.Action>
    </SettingCard>
  );
}

interface SettingCardShortTextInputProps
  extends Omit<React.ComponentProps<typeof Input>, "onChange" | "onKeyDown"> {
  title?: string;
  description?: string;
  bordless?: boolean;
  showSaveButton?: boolean;
  label?: string;
  autoDisabled?: boolean;
  isSaving?: boolean;
  OnSave?: (
    value: string,
    inputElement: HTMLInputElement,
    buttonElement: HTMLButtonElement,
  ) => void;
  children?: React.ReactNode | null;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function SettingCardShortTextInput({
  title = "",
  description = "",
  bordless = false,
  showSaveButton = true,
  label = useTranslation().t("save"),
  autoDisabled = true,
  isSaving,
  OnSave = () => {},
  children = null,
  onChange,
  onKeyDown,
  value,
  defaultValue,
  className = "w-full",
  ...restProps
}: SettingCardShortTextInputProps) {
  const [internalDisabled, setInternalDisabled] = React.useState(false);
  const savingState = isSaving !== undefined ? isSaving : internalDisabled;
  const [internalValue, setInternalValue] = React.useState(
    value?.toString() ?? defaultValue?.toString() ?? "",
  );
  const currentValue = value !== undefined ? value : internalValue;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value.toString());
    }
  }, [value]);

  const handleSave = () => {
    if (isSaving === undefined && autoDisabled) setInternalDisabled(true);
    const valueToSave = currentValue?.toString() || "";
    const result: unknown =
      inputRef.current && buttonRef.current
        ? OnSave(valueToSave, inputRef.current, buttonRef.current)
        : undefined;

    if (autoDisabled && result && typeof (result as Promise<unknown>).then === "function") {
      (result as Promise<unknown>).finally(() => {
        if (isSaving === undefined) setInternalDisabled(false);
      });
      return;
    }

    if (isSaving === undefined && autoDisabled) setInternalDisabled(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onChange?.(event);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSave();
    }
    onKeyDown?.(event);
  };

  return (
    <SettingCard title={title} description={description} bordless={bordless}>
      <div className="mt-0.5 flex w-full flex-col items-start gap-2">
        <Input
          {...restProps}
          className={cn("h-8 w-full text-[13px]", className)}
          value={value !== undefined ? value : internalValue}
          defaultValue={value === undefined ? defaultValue : undefined}
          disabled={restProps.disabled || savingState}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          ref={inputRef}
        />
        {children}
        <Button
          ref={buttonRef}
          onClick={handleSave}
          hidden={!showSaveButton}
          disabled={savingState}
          size="sm"
          className="rounded-md text-[13px]"
        >
          {label}
        </Button>
      </div>
    </SettingCard>
  );
}

export function SettingCardLongTextInput({
  title = "",
  description = "",
  label = useTranslation().t("save"),
  defaultValue = "",
  OnSave = () => {},
  onChange,
  autoDisabled = true,
  isSaving,
  bordless = false,
  showSaveButton = true,
}: {
  title?: string;
  description?: string;
  label?: string;
  defaultValue?: string;
  OnSave?: (
    value: string,
    textAreaElement: HTMLTextAreaElement,
    buttonElement: HTMLButtonElement,
  ) => void;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  autoDisabled?: boolean;
  isSaving?: boolean;
  bordless?: boolean;
  showSaveButton?: boolean;
}) {
  const [disabled, setDisabled] = React.useState(false);
  const savingState = isSaving !== undefined ? isSaving : disabled;
  const [value, setValue] = React.useState(defaultValue);
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleSave = () => {
    if (isSaving === undefined && autoDisabled) setDisabled(true);
    const result: unknown =
      textAreaRef.current && buttonRef.current
        ? OnSave(value, textAreaRef.current, buttonRef.current)
        : undefined;

    if (autoDisabled && result && typeof (result as Promise<unknown>).then === "function") {
      (result as Promise<unknown>).finally(() => {
        if (isSaving === undefined) setDisabled(false);
      });
      return;
    }

    if (isSaving === undefined && autoDisabled) setDisabled(false);
  };

  const handleTextAreaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value);
    onChange?.(event);
  };

  return (
    <SettingCard title={title} description={description} bordless={bordless}>
      <div className="mt-0.5 flex w-full flex-col items-start gap-2">
        <Textarea
          className="w-full text-[13px] leading-6"
          value={value}
          onChange={handleTextAreaChange}
          ref={textAreaRef}
        />
        {showSaveButton ? (
          <Button
            ref={buttonRef}
            onClick={handleSave}
            disabled={savingState}
            size="sm"
            className="rounded-md text-[13px]"
          >
            {label}
          </Button>
        ) : null}
      </div>
    </SettingCard>
  );
}

export function SettingCardSelect({
  title,
  description,
  defaultValue = "",
  value,
  label = useTranslation().t("select"),
  options = [],
  OnSave = () => {},
  autoDisabled = true,
  isSaving,
  bordless = false,
}: {
  title?: string;
  description?: string;
  defaultValue?: string;
  value?: string;
  label?: string;
  options?: { value: string; label?: string; disabled?: boolean }[];
  OnSave?: (value: string, buttonElement: HTMLButtonElement) => void;
  autoDisabled?: boolean;
  isSaving?: boolean;
  bordless?: boolean;
}) {
  const [disabled, setDisabled] = React.useState(false);
  const savingState = isSaving !== undefined ? isSaving : disabled;
  const [selectedValue, setSelectedValue] = React.useState(
    value !== undefined ? value : defaultValue,
  );
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleSave = (nextValue: string) => {
    if (isSaving === undefined && autoDisabled) setDisabled(true);
    const previousValue = selectedValue;
    setSelectedValue(nextValue);

    const result: unknown = triggerRef.current
      ? OnSave(nextValue, triggerRef.current)
      : undefined;

    if (autoDisabled && result && typeof (result as Promise<unknown>).then === "function") {
      (result as Promise<unknown>)
        .catch(() => {
          setSelectedValue(previousValue);
        })
        .finally(() => {
          if (isSaving === undefined) setDisabled(false);
        });
      return;
    }

    if (isSaving === undefined && autoDisabled) setDisabled(false);
  };

  return (
    <SettingCard title={title} description={description} bordless={bordless}>
      <SettingCard.Action>
        <Select
          value={selectedValue || undefined}
          onValueChange={handleSave}
          disabled={savingState}
        >
          <SelectTrigger
            ref={triggerRef}
            size="sm"
            className="min-w-48 rounded-md text-[13px]"
          >
            <SelectValue placeholder={label} />
          </SelectTrigger>
          <SelectContent align="end">
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label ? option.label : option.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingCard.Action>
    </SettingCard>
  );
}

export function SettingCardLabel({
  children,
}: {
  children: React.ReactNode | null;
}) {
  return (
    <label className="pt-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </label>
  );
}

export function SettingCardCollapse({
  title,
  description,
  defaultOpen = false,
  children,
  bordless = false,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  bordless?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SettingCard
        title={title}
        description={description}
        onHeaderClick={() => setOpen((current) => !current)}
        bordless={bordless}
      >
        <SettingCard.Action>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-expanded={open}
              aria-controls="collapsible-content"
              className="size-8 rounded-lg"
            >
              <motion.div
                initial={{ rotate: 0, scale: 1 }}
                animate={{ rotate: open ? 180 : 0, scale: open ? 1.1 : 1 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                <ChevronDownIcon className="size-4" />
              </motion.div>
            </Button>
          </CollapsibleTrigger>
        </SettingCard.Action>
        <AnimatePresence initial={false}>
          {open ? (
            <CollapsibleContent forceMount asChild>
              <motion.div
                className="w-full overflow-hidden pt-2"
                id="collapsible-content"
                initial={{ height: 0, opacity: 0, y: -10 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                <Separator className="mb-3" />
                {children}
              </motion.div>
            </CollapsibleContent>
          ) : null}
        </AnimatePresence>
      </SettingCard>
    </Collapsible>
  );
}

SettingCardCollapse.Header = function Header({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
};
