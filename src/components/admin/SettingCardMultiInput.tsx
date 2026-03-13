import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import React from "react";
import { useTranslation } from "react-i18next";
import { SettingCardCollapse } from "./SettingCard";

interface InputItem {
  tag: string;
  label: string;
  type?: "short" | "long";
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  number?: boolean;
}

type OnSaveHandler = (values: Record<string, string>) => Promise<any> | any;

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
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    items.reduce((acc, item) => {
      acc[item.tag] = item.defaultValue || "";
      return acc;
    }, {} as Record<string, string>),
  );
  const [saving, setSaving] = React.useState(false);
  const savingState = isSaving !== undefined ? isSaving : saving;

  React.useEffect(() => {
    setValues(
      items.reduce((acc, item) => {
        acc[item.tag] = item.defaultValue || "";
        return acc;
      }, {} as Record<string, string>),
    );
  }, [items]);

  const handleChange = (tag: string, value: string) => {
    setValues((prev) => {
      const nextValues = { ...prev, [tag]: value };
      onChange?.(nextValues);
      return nextValues;
    });
  };

  const handleSave = async () => {
    if (isSaving === undefined) setSaving(true);
    try {
      await onSave(values);
    } finally {
      if (isSaving === undefined) setSaving(false);
    }
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

      <div className="flex w-full flex-col gap-2">
        {items.map((item) => (
          <React.Fragment key={item.tag}>
            <label className="text-[13px] font-medium text-foreground">
              {item.label}
            </label>
            {item.type === "long" ? (
              <Textarea
                className="w-full text-[13px] leading-6"
                value={values[item.tag]}
                placeholder={item.placeholder}
                disabled={item.disabled}
                onChange={(event) => handleChange(item.tag, event.target.value)}
              />
            ) : (
              <Input
                className="h-8 w-full text-[13px]"
                value={values[item.tag]}
                placeholder={item.placeholder}
                disabled={item.disabled}
                type={item.number ? "number" : "text"}
                onChange={(event) => handleChange(item.tag, event.target.value)}
              />
            )}
          </React.Fragment>
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
            size="sm"
            className="mt-1 rounded-md text-[13px]"
            onClick={handleSave}
            disabled={savingState}
          >
            {t("save")}
          </Button>
        </div>
      </div>
    </SettingCardCollapse>
  );
}
