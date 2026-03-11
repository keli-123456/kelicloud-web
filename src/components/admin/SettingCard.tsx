import {
  Button,
  DropdownMenu,
  Flex,
  IconButton,
  Switch,
  TextArea,
  TextField,
} from "@/components/ui/compat";
import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion"; // 引入 Framer Motion

import { cn } from "@/lib/utils";

interface SettingCardProps {
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bordless?: boolean;
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  onHeaderClick?: () => void;
}

export function SettingCard({
  title = "",
  description = "",
  children,
  className = "",
  direction = "column",
  bordless = false,
  onHeaderClick = () => { },
}: SettingCardProps) {
  const actionChild = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === Action
  );

  const otherChildren = React.Children.toArray(children).filter(
    (child) => !(React.isValidElement(child) && child.type === Action)
  );

  return (
    <Flex
      direction={direction}
      justify="between"
      align="start"
      wrap="wrap"
      className={cn(
        bordless
          ? "border-0 bg-transparent p-0 shadow-none"
          : "min-h-0 border-b border-slate-200/70 px-0 py-2.5",
        className,
      )}
    >
      <Flex
        className="w-full gap-3"
        direction="row"
        justify="between"
        align="start"
        wrap="nowrap"
        onClick={onHeaderClick}
      >
        <Flex
          direction="column"
          gap="1"
          className="min-h-0 flex-1"
          justify={"center"}
        >
          <label className="text-[13px] font-medium tracking-tight text-slate-900">
            {title}
          </label>
          {description && (
            <label className="text-[12px] leading-5 text-slate-500">
              {description}
            </label>
          )}
        </Flex>
        {actionChild}
      </Flex>
      {otherChildren}
    </Flex>
  );
}

function Action({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
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
  const handleChange = (c: boolean) => {
    if (autoDisabled) setDisabled(true);
    const previousValue = checked;
    setChecked(c);
    const result: any =
      onChange && switchRef.current
        ? onChange(c, switchRef.current)
        : undefined;
    if (autoDisabled) {
      const promise: Promise<any> = result;
      if (promise && typeof promise.then === "function") {
        promise
          .then(() => { })
          .catch(() => {
            setChecked(previousValue);
          })
          .finally(() => {
            setDisabled(false);
          });
      } else {
        setDisabled(false);
      }
    }
  };
  return (
    <SettingCard {...props} direction="column">
      <SettingCard.Action>
        <Flex direction="row" gap="2" align="center">
          <label className="text-[12px] text-slate-600">{label}</label>
          <Switch
            ref={switchRef}
            checked={checked}
            onCheckedChange={handleChange}
            disabled={disabled}
          />
        </Flex>
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
  variant?: "solid" | "soft" | "outline" | "ghost";
  children?: React.ReactNode;
  onClick?: (buttonElement: HTMLButtonElement) => void;
  autoDisabled?: boolean;
}) {
  const [disabled, setDisabled] = React.useState(false);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (autoDisabled) setDisabled(true);
    const result: any = onClick ? onClick(event.currentTarget) : undefined;
    if (autoDisabled) {
      const promise: Promise<any> = result;
      if (promise && typeof promise.then === "function") {
        promise.finally(() => setDisabled(false));
      } else {
        setDisabled(false);
      }
    }
  };
  return (
    <SettingCard {...props} direction="column">
      <SettingCard.Action>
        <Flex>
          <Flex direction="row" gap="2" align="center">
            <label className="text-[12px] text-slate-600">{label}</label>
            <Button
              onClick={handleClick}
              variant={variant}
              disabled={disabled}
              size="1"
              className="rounded-md text-[12px]"
            >
              {children}
            </Button>
          </Flex>
        </Flex>
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
  variant?: "solid" | "soft" | "outline" | "ghost";
  children?: React.ReactNode;
  onClick?: (buttonElement: HTMLButtonElement) => void;
  autoDisabled?: boolean;
}) {
  const [disabled, setDisabled] = React.useState(false);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (autoDisabled) setDisabled(true);
    const result: any = onClick ? onClick(event.currentTarget) : undefined;
    if (autoDisabled) {
      const promise: Promise<any> = result;
      if (promise && typeof promise.then === "function") {
        promise.finally(() => setDisabled(false));
      } else {
        setDisabled(false);
      }
    }
  };
  return (
    <SettingCard {...props} direction="column">
      <SettingCard.Action>
        <Flex>
          <Flex direction="row" gap="2" align="center">
            <label className="text-[12px] text-slate-600">{label}</label>
            <IconButton
              onClick={handleClick}
              variant={variant}
              disabled={disabled}
              size="1"
              className="rounded-md"
            >
              {children}
            </IconButton>
          </Flex>
        </Flex>
      </SettingCard.Action>
    </SettingCard>
  );
}

interface SettingCardShortTextInputProps
  extends Omit<React.ComponentProps<typeof TextField.Root>, 'onChange' | 'onKeyDown'> {
  // SettingCard 相关属性
  title?: string;
  description?: string;
  bordless?: boolean;

  // 按钮相关属性
  showSaveButton?: boolean;
  label?: string;
  autoDisabled?: boolean;
  isSaving?: boolean;

  // 保存回调
  OnSave?: (
    value: string,
    inputElement: HTMLInputElement,
    buttonElement: HTMLButtonElement
  ) => void;

  // 额外内容
  children?: React.ReactNode | null;

  // 输入框事件回调 (可选，用于额外处理)
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function SettingCardShortTextInput({
  // SettingCard 属性
  title = "",
  description = "",
  bordless = false,

  // 按钮属性
  showSaveButton = true,
  label = useTranslation().t("save"),
  autoDisabled = true,
  isSaving,

  // 保存回调
  OnSave = () => { },

  // 额外内容
  children = null,

  // 事件回调
  onChange,
  onKeyDown,

  // TextField.Root 的所有其他属性
  value,
  defaultValue,
  placeholder,
  disabled,
  type = "text",
  required,
  readOnly,
  maxLength,
  minLength,
  pattern,
  autoComplete,
  autoFocus,
  name,
  id,
  className = "w-full",
  ...restProps
}: SettingCardShortTextInputProps) {
  const [internalDisabled, setInternalDisabled] = React.useState(false);
  const savingState = isSaving !== undefined ? isSaving : internalDisabled;
  const [internalValue, setInternalValue] = React.useState(value || defaultValue || "");
  const currentValue = value !== undefined ? value : internalValue;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // 当外部value改变时，同步内部状态
  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value.toString());
    }
  }, [value]);

  const handleSave = () => {
    if (isSaving === undefined && autoDisabled) setInternalDisabled(true);
    const valueToSave = currentValue?.toString() || "";
    const result: any =
      inputRef.current && buttonRef.current
        ? OnSave(valueToSave, inputRef.current, buttonRef.current)
        : undefined;
    if (autoDisabled) {
      const promise: Promise<any> = result;
      if (promise && typeof promise.then === "function") {
        promise.finally(() => isSaving === undefined && setInternalDisabled(false));
      } else {
        isSaving === undefined && setInternalDisabled(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // 只有在非受控模式下才更新内部状态
    if (value === undefined) {
      setInternalValue(newValue);
    }

    // 调用外部传入的 onChange 回调
    onChange?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 按 Enter 键时触发保存
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }

    // 调用外部传入的 onKeyDown 回调
    onKeyDown?.(e);
  };

  return (
    <SettingCard title={title} description={description} bordless={bordless}>
      <Flex direction="column" className="mt-0.5 w-full" gap="1" align="start">
        <TextField.Root
          {...restProps}
          size="1"
          className={cn(
            "w-full rounded-md border border-slate-200/80 bg-white text-[12px]",
            className,
          )}
          value={value !== undefined ? value : internalValue}
          defaultValue={value === undefined ? defaultValue : undefined}
          placeholder={placeholder}
          disabled={disabled || savingState}
          type={type}
          required={required}
          readOnly={readOnly}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          name={name}
          id={id}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          ref={inputRef}
        >
        </TextField.Root>
        {children}
        <Button
          ref={buttonRef}
          onClick={handleSave}
          variant="solid"
          hidden={!showSaveButton}
          disabled={savingState}
          size="1"
          className="rounded-md text-[12px]"
        >
          {label}
        </Button>
      </Flex>
    </SettingCard>
  );
}

export function SettingCardLongTextInput({
  title = "",
  description = "",
  label = useTranslation().t("save"),
  defaultValue = "",
  OnSave = () => { },
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
    buttonElement: HTMLButtonElement
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

  const handleSave = () => {
    if (isSaving === undefined && autoDisabled) setDisabled(true);
    const result: any =
      textAreaRef.current && buttonRef.current
        ? OnSave(value, textAreaRef.current, buttonRef.current)
        : undefined;
    if (autoDisabled) {
      const promise: Promise<any> = result;
      if (promise && typeof promise.then === "function") {
        promise.finally(() => isSaving === undefined && setDisabled(false));
      } else {
        isSaving === undefined && setDisabled(false);
      }
    }
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // 调用外部传入的 onChange 回调
    onChange?.(e);
  };

  return (
    <SettingCard title={title} description={description} bordless={bordless}>
      <Flex direction="column" className="mt-0.5 w-full" gap="1" align="start">
        <TextArea
          className="w-full rounded-md border border-slate-200/80 bg-white text-[12px] leading-5"
          defaultValue={defaultValue}
          resize="vertical"
          value={value}
          onChange={handleTextAreaChange}
          ref={textAreaRef}
        />
        {showSaveButton && (
          <Button
            ref={buttonRef}
            onClick={handleSave}
            variant="solid"
            disabled={savingState}
            size="1"
            className="rounded-md text-[12px]"
          >
            {label}
          </Button>
        )}
      </Flex>
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
  OnSave = () => { },
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
    value !== undefined ? value : defaultValue
  );
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleSave = (value: string) => {
    if (isSaving === undefined && autoDisabled) setDisabled(true);
    const previousValue = selectedValue; // 保存之前的值
    setSelectedValue(value); // 先更新选择的值

    const result: any = buttonRef.current
      ? OnSave(value, buttonRef.current)
      : undefined;
    if (autoDisabled) {
      const promise: Promise<any> = result;
      if (promise && typeof promise.then === "function") {
        promise
          .then(() => {
            // 成功时不需要额外操作，值已经更新
          })
          .catch(() => {
            // 错误时自动切换回之前的值
            setSelectedValue(previousValue);
          })
          .finally(() => {
            isSaving === undefined && setDisabled(false);
          });
      } else {
        isSaving === undefined && setDisabled(false);
      }
    }
  };

  // 获取要显示的文本，优先显示选择的值对应的标签
  const getDisplayText = () => {
    if (selectedValue) {
      const selectedOption = options.find(
        (option) => option.value === selectedValue
      );
      return selectedOption?.label || selectedValue;
    }
    return label;
  };

  return (
    <SettingCard title={title} description={description} bordless={bordless}>
      <SettingCard.Action>
        <Flex>
          <Flex direction="row" gap="2" align="center">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger disabled={savingState}>
                <Button
                  variant="soft"
                  size="1"
                  ref={buttonRef}
                  className="rounded-md text-[12px]"
                >
                  {getDisplayText()}
                  <DropdownMenu.TriggerIcon />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                {options.map((option) => (
                  <DropdownMenu.Item
                    disabled={option.disabled}
                    key={option.value}
                    onSelect={() => {
                      handleSave(option.value);
                    }}
                  >
                    {option.label ? option.label : option.value}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Flex>
        </Flex>
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
    <label className="pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
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
    <SettingCard
      title={title}
      description={description}
      onHeaderClick={() => setOpen(!open)}
      bordless={bordless}
    >
      <SettingCard.Action>
        <IconButton
          variant="ghost"
          size="1"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="collapsible-content"
          className="rounded-lg"
        >
          <motion.div
            initial={{ rotate: 0, scale: 1 }}
            animate={{ rotate: open ? 180 : 0, scale: open ? 1.1 : 1 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <ChevronDownIcon />
          </motion.div>
        </IconButton>
      </SettingCard.Action>
      <AnimatePresence>
        {open && (
          <motion.div
            className="w-full pt-2"
            layout // Smoothly handles height changes
            initial={{ height: 0, opacity: 0, y: -10 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
            id="collapsible-content"
          >
            <div className="mb-2 h-px bg-slate-200/80" />
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </SettingCard>
  );
}

// Header slot for SettingCardCollapse
SettingCardCollapse.Header = function Header({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
};
