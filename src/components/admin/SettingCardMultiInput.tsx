import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import React from "react";
import { useTranslation } from "react-i18next";
import { SettingCardCollapse } from "./SettingCard";
import { SettingSaveFeedback } from "./SettingSaveFeedback";
import { useSettingSave } from "./useSettingSave";
import { useNavigationGuard } from "./useNavigationGuard";

interface InputItem {
  tag: string;
  label: string;
  type?: "short" | "long";
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  number?: boolean;
}

type OnSaveHandler = (values: Record<string, string>) => unknown | Promise<unknown>;

export function SettingCardMultiInputCollapse({
  title = "",
  description = "",
  defaultOpen = false,
  items,
  onSave,
  isSaving,
  children,
  onChange,
}: {
  title?: string;
  description?: string;
  defaultOpen?: boolean;
  items: InputItem[];
  onSave: OnSaveHandler;
  isSaving?: boolean;
  children?: React.ReactNode;
  onChange?: (values: Record<string, string>) => void;
}) {
  const { t } = useTranslation();
  const id = React.useId();
  const feedbackId = `${id}-feedback`;
  const save = useSettingSave();
  const defaults = JSON.stringify(Object.fromEntries(items.map((item) => [item.tag, item.defaultValue || ""])));
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    items.reduce((acc, item) => {
      acc[item.tag] = item.defaultValue || "";
      return acc;
    }, {} as Record<string, string>),
  );
  const [baseline, setBaseline] = React.useState(values);
  const previousDefaults = React.useRef(defaults);
  const savingState = Boolean(isSaving) || save.status === "saving";
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);
  useNavigationGuard(dirty, savingState);

  React.useEffect(() => {
    if (savingState || defaults === previousDefaults.current) return;
    previousDefaults.current = defaults;
    const next = JSON.parse(defaults) as Record<string, string>;
    setValues((current) => Object.fromEntries(Object.entries(next).map(([tag, value]) => [
      tag, current[tag] !== undefined && current[tag] !== baseline[tag] ? current[tag] : value,
    ])));
    setBaseline(next);
  }, [defaults, savingState, baseline]);

  const handleChange = (tag: string, value: string) => {
    if (savingState || save.pending.current) return;
    const nextValues = { ...values, [tag]: value };
    setValues(nextValues);
    save.reset();
    onChange?.(nextValues);
  };

  const handleSave = async () => {
    if (savingState || save.pending.current) return;
    const snapshot = { ...values };
    if (await save.run(() => onSave(snapshot))) setBaseline(snapshot);
  };

  return (
    <SettingCardCollapse
      title={title}
      description={description}
      defaultOpen={defaultOpen}
    >
      {React.Children.map(children, (child) => {
        if (
          React.isValidElement(child) &&
          child.type === SettingCardCollapse.Header
        ) {
          return child;
        }
        return null;
      })}

      <div className="flex w-full flex-col gap-3" aria-busy={savingState}>
        {items.map((item) => (
          <div key={item.tag} className="space-y-1.5">
            <label htmlFor={`${id}-${item.tag}`} className="text-sm font-medium text-foreground">
              {item.label}
            </label>
            {item.type === "long" ? (
              <Textarea
                id={`${id}-${item.tag}`}
                aria-describedby={feedbackId}
                className="w-full text-sm leading-6"
                value={values[item.tag] ?? ""}
                placeholder={item.placeholder}
                disabled={item.disabled || savingState}
                onChange={(event) => handleChange(item.tag, event.target.value)}
              />
            ) : (
              <Input
                id={`${id}-${item.tag}`}
                aria-describedby={feedbackId}
                className="h-8 w-full text-sm"
                value={values[item.tag] ?? ""}
                placeholder={item.placeholder}
                disabled={item.disabled || savingState}
                type={item.number ? "number" : "text"}
                onChange={(event) => handleChange(item.tag, event.target.value)}
              />
            )}
          </div>
        ))}

        {React.Children.map(children, (child) => {
          if (
            React.isValidElement(child) &&
            child.type === SettingCardCollapse.Header
          ) {
            return null;
          }
          return child;
        })}

        <div>
          <Button
            type="button"
            size="sm"
            className="mt-1 rounded-md text-sm"
            onClick={handleSave}
            disabled={savingState}
          >
            {t("save")}
          </Button>
          <SettingSaveFeedback id={feedbackId} state={save} dirty={dirty} busy={savingState} />
        </div>
      </div>
    </SettingCardCollapse>
  );
}
