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
import { SettingSaveFeedback } from "./SettingSaveFeedback";
import { useSettingSave } from "./useSettingSave";
import { useNavigationGuard } from "./useNavigationGuard";

type LegacyButtonVariant = "solid" | "soft" | "outline" | "ghost";

interface SettingCardProps {
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bordless?: boolean;
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  onHeaderClick?: () => void;
  controlId?: string;
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
  controlId,
}: SettingCardProps) {
  const actionChild = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === Action,
  );

  const otherChildren = React.Children.toArray(children).filter(
    (child) => !(React.isValidElement(child) && child.type === Action),
  );
  const Title = controlId ? "label" : "div";

  return (
    <div
      className={cn(
        "flex min-w-0 gap-3",
        getDirectionClass(direction),
        bordless
          ? "border-0 bg-transparent p-0 shadow-none"
          : "min-h-0 border-t border-border py-3.5 first:border-t-0",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
          onHeaderClick && "cursor-pointer",
        )}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("[data-setting-action='true']")) {
            return;
          }
          onHeaderClick?.();
        }}
      >
        <div className="min-h-0 min-w-0 flex-1 space-y-1">
          <Title htmlFor={controlId} className="block text-[14px] font-semibold leading-5 tracking-normal text-foreground">
            {title}
          </Title>
          {description ? (
            <div className="max-w-3xl text-sm leading-5 text-muted-foreground">
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
  return <div data-setting-action="true" className="shrink-0 sm:pt-0.5">{children}</div>;
}

SettingCard.Action = Action;

export function SettingCardSwitch({
  label = "",
  autoDisabled = true,
  defaultChecked,
  onChange,
  deferred = false,
  ...props
}: SettingCardProps & {
  label?: string;
  autoDisabled?: boolean;
  defaultChecked?: boolean;
  deferred?: boolean;
  onChange?: (checked: boolean, switchElement: HTMLButtonElement) => void;
}) {
  const switchRef = React.useRef<HTMLButtonElement>(null);
  const controlId = React.useId();
  const feedbackId = React.useId();
  const save = useSettingSave();
  const [checked, setChecked] = React.useState(defaultChecked || false);

  React.useEffect(() => {
    if (!save.pending.current) setChecked(defaultChecked || false);
  }, [defaultChecked, save.pending]);

  const handleChange = async (nextChecked: boolean) => {
    if (save.pending.current || !switchRef.current) return;
    const element = switchRef.current;
    const previousValue = checked;
    setChecked(nextChecked);
    const ok = await save.run(() => onChange?.(nextChecked, element));
    if (!ok) setChecked(previousValue);
  };

  return (
    <SettingCard {...props} controlId={controlId} direction="column">
      <SettingCard.Action>
        <div className="flex items-center gap-2">
          <label htmlFor={controlId} className="text-sm text-muted-foreground">{label}</label>
          <Switch
            id={controlId}
            aria-describedby={feedbackId}
            ref={switchRef}
            checked={checked}
            onCheckedChange={handleChange}
            disabled={autoDisabled && save.status === "saving"}
          />
        </div>
      </SettingCard.Action>
      <SettingSaveFeedback id={feedbackId} state={save} showSuccess={!deferred} />
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
  const save = useSettingSave();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const element = event.currentTarget;
    void save.run(() => onClick?.(element));
  };

  return (
    <SettingCard {...props} direction="column">
      <SettingCard.Action>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">{label}</label>
          <Button
            onClick={handleClick}
            variant={mapButtonVariant(variant)}
            disabled={autoDisabled && save.status === "saving"}
            size="sm"
            className="rounded-md text-sm"
          >
            {children}
          </Button>
        </div>
      </SettingCard.Action>
      <SettingSaveFeedback state={save} showSuccess={false} />
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
  const save = useSettingSave();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const element = event.currentTarget;
    void save.run(() => onClick?.(element));
  };

  return (
    <SettingCard {...props} direction="column">
      <SettingCard.Action>
        <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">{label}</label>
          <Button
            onClick={handleClick}
            variant={mapButtonVariant(variant)}
            disabled={autoDisabled && save.status === "saving"}
            aria-label={label || (typeof props.title === "string" ? props.title : undefined)}
            size="icon"
            className="size-8 rounded-md"
          >
            {children}
          </Button>
        </div>
      </SettingCard.Action>
      <SettingSaveFeedback state={save} showSuccess={false} />
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
  label,
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
  const { t } = useTranslation();
  const save = useSettingSave();
  const generatedId = React.useId();
  const controlId = restProps.id || generatedId;
  const feedbackId = React.useId();
  const savingState = Boolean(isSaving || (autoDisabled && save.status === "saving"));
  const [internalValue, setInternalValue] = React.useState(
    value?.toString() ?? defaultValue?.toString() ?? "",
  );
  const currentValue = value !== undefined ? value : internalValue;
  const [savedValue, setSavedValue] = React.useState(currentValue.toString());
  useNavigationGuard(showSaveButton && currentValue.toString() !== savedValue, showSaveButton && (Boolean(isSaving) || save.status === "saving"));
  const previousDefault = React.useRef(defaultValue?.toString() ?? "");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const resolvedLabel = label ?? t("save");

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value.toString());
    }
  }, [value]);

  React.useEffect(() => {
    const nextDefault = defaultValue?.toString() ?? "";
    const oldDefault = previousDefault.current;
    previousDefault.current = nextDefault;
    if (value === undefined && !save.pending.current && oldDefault !== nextDefault) {
      setInternalValue((current) => current === oldDefault ? nextDefault : current);
      setSavedValue(nextDefault);
    }
  }, [defaultValue, value, save.pending]);

  const handleSave = async () => {
    if (!showSaveButton || savingState || save.pending.current || !inputRef.current || !buttonRef.current) return;
    if (!inputRef.current.reportValidity()) return;
    const input = inputRef.current;
    const button = buttonRef.current;
    const valueToSave = currentValue.toString();
    const ok = await save.run(() => OnSave(valueToSave, input, button));
    if (ok) setSavedValue(valueToSave);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    save.reset();
    const nextValue = event.target.value;
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onChange?.(event);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.key === "Enter" && showSaveButton && !event.defaultPrevented && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSave();
    }
  };

  return (
    <SettingCard title={title} description={description} bordless={bordless} controlId={controlId}>
      <div className="mt-1 flex w-full flex-col items-start gap-2">
        <div className="flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            {...restProps}
            id={controlId}
            aria-invalid={save.status === "error" || restProps["aria-invalid"]}
            aria-describedby={[restProps["aria-describedby"], showSaveButton ? feedbackId : ""].filter(Boolean).join(" ") || undefined}
            className={cn(
              "h-9 min-w-0 flex-1 rounded-md text-sm",
              className,
            )}
            value={value !== undefined ? value : internalValue}
            disabled={restProps.disabled || savingState}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            ref={inputRef}
          />
          <Button
            type="button"
            ref={buttonRef}
            onClick={handleSave}
            hidden={!showSaveButton}
            disabled={restProps.disabled || savingState}
            size="sm"
                className="h-9 shrink-0 rounded-md px-3 text-sm"
          >
            {resolvedLabel}
          </Button>
        </div>
        {showSaveButton ? <SettingSaveFeedback id={feedbackId} state={save} busy={Boolean(isSaving)} dirty={currentValue.toString() !== savedValue} /> : null}
        {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
    </SettingCard>
  );
}

export function SettingCardLongTextInput({
  title = "",
  description = "",
  label,
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
  const { t } = useTranslation();
  const save = useSettingSave();
  const controlId = React.useId();
  const feedbackId = React.useId();
  const savingState = Boolean(isSaving || (autoDisabled && save.status === "saving"));
  const [value, setValue] = React.useState(defaultValue);
  const [savedValue, setSavedValue] = React.useState(defaultValue);
  useNavigationGuard(showSaveButton && value !== savedValue, showSaveButton && (Boolean(isSaving) || save.status === "saving"));
  const previousDefault = React.useRef(defaultValue);
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const resolvedLabel = label ?? t("save");

  React.useEffect(() => {
    const oldDefault = previousDefault.current;
    previousDefault.current = defaultValue;
    if (!save.pending.current) {
      setValue((current) => !showSaveButton || current === oldDefault ? defaultValue : current);
      setSavedValue(defaultValue);
    }
  }, [defaultValue, showSaveButton, save.pending]);

  const handleSave = async () => {
    if (!showSaveButton || savingState || save.pending.current || !textAreaRef.current || !buttonRef.current) return;
    const input = textAreaRef.current;
    const button = buttonRef.current;
    const ok = await save.run(() => OnSave(value, input, button));
    if (ok) setSavedValue(value);
  };

  const handleTextAreaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    save.reset();
    setValue(event.target.value);
    onChange?.(event);
  };

  return (
    <SettingCard title={title} description={description} bordless={bordless} controlId={controlId}>
      <div className="mt-1 flex w-full max-w-3xl flex-col items-start gap-2">
        <Textarea
          id={controlId}
          aria-invalid={save.status === "error"}
          aria-describedby={showSaveButton ? feedbackId : undefined}
          disabled={savingState}
          className="min-h-28 w-full rounded-md text-sm leading-6"
          value={value}
          onChange={handleTextAreaChange}
          ref={textAreaRef}
        />
        <Button
          ref={buttonRef}
          onClick={handleSave}
          hidden={!showSaveButton}
          disabled={savingState}
          size="sm"
                className="h-9 rounded-md px-3 text-sm"
        >
          {resolvedLabel}
        </Button>
        {showSaveButton ? <SettingSaveFeedback id={feedbackId} state={save} busy={Boolean(isSaving)} dirty={value !== savedValue} /> : null}
      </div>
    </SettingCard>
  );
}

export function SettingCardSelect({
  title,
  description,
  defaultValue = "",
  value,
  label,
  options = [],
  OnSave = () => {},
  autoDisabled = true,
  isSaving,
  bordless = false,
  deferred = false,
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
  deferred?: boolean;
}) {
  const { t } = useTranslation();
  const save = useSettingSave();
  const controlId = React.useId();
  const feedbackId = React.useId();
  const savingState = Boolean(isSaving || (autoDisabled && save.status === "saving"));
  const [selectedValue, setSelectedValue] = React.useState(
    value !== undefined ? value : defaultValue,
  );
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const resolvedLabel = label ?? t("select");

  React.useEffect(() => {
    if (value !== undefined || !save.pending.current) {
      setSelectedValue(value ?? defaultValue);
    }
  }, [value, defaultValue, save.pending]);

  const handleSave = async (nextValue: string) => {
    if (savingState || save.pending.current || !triggerRef.current) return;
    const element = triggerRef.current;
    const previousValue = selectedValue;
    setSelectedValue(nextValue);
    const ok = await save.run(() => OnSave(nextValue, element));
    if (!ok) setSelectedValue(previousValue);
  };

  return (
    <SettingCard title={title} description={description} bordless={bordless} controlId={controlId}>
      <SettingCard.Action>
        <Select
          value={selectedValue || undefined}
          onValueChange={handleSave}
          disabled={savingState}
        >
          <SelectTrigger
            id={controlId}
            aria-describedby={feedbackId}
            aria-invalid={save.status === "error"}
            ref={triggerRef}
            size="sm"
            className="min-w-48 rounded-md text-sm"
          >
            <SelectValue placeholder={resolvedLabel} />
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
      <SettingSaveFeedback id={feedbackId} state={save} showSuccess={!deferred} busy={Boolean(isSaving)} />
    </SettingCard>
  );
}

export function SettingCardLabel({
  children,
}: {
  children: React.ReactNode | null;
}) {
  return (
    <label className="mt-2 pt-1 text-[12px] font-semibold uppercase tracking-normal text-muted-foreground first:mt-0">
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
  open: controlledOpen,
  onOpenChange,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  bordless?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const contentId = React.useId();

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SettingCard
        title={title}
        description={description}
        onHeaderClick={() => setOpen(!open)}
        bordless={bordless}
      >
        <SettingCard.Action>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-expanded={open}
              aria-controls={contentId}
              aria-label={title}
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
                id={contentId}
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
