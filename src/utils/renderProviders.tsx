import {
    SettingCardCollapse,
    SettingCardSelect,
    SettingCardSwitch,
    SettingCardShortTextInput,
    SettingCardLongTextInput,
    SettingCardButton,
} from "@/components/admin/SettingCard";
import type React from "react";
import { toast } from "sonner";

interface RenderProviderInputsProps {
    currentProvider: string;
    providerDefs: any;
    providerValues: any;
    translationPrefix?: string;
    title?: string;
    description?: string;
    footer?: React.ReactNode | string;
    collapsible?: boolean;
    setProviderValues: (updater: (prev: any) => any) => void;
    handleSave: (values: any) => Promise<void>;
    t: any;
}

const ACRONYM_PARTS = new Set([
    "api",
    "arn",
    "aws",
    "dns",
    "ec2",
    "id",
    "ip",
    "ram",
    "ssh",
    "ssl",
    "sts",
    "tls",
    "ttl",
    "url",
    "vpc",
]);

function parseFieldDefault(field: any) {
    if (field.default === undefined) {
        return undefined;
    }

    if (field.type === "bool") {
        return field.default === "true" || field.default === true;
    }

    if (["int", "int64", "float32", "float64"].includes(field.type)) {
        const numericValue = Number(field.default);
        return Number.isNaN(numericValue) ? field.default : numericValue;
    }

    return field.default;
}

function humanizeFieldName(name: string) {
    return name
        .split(/[._-]+/)
        .filter(Boolean)
        .map((part) => {
            const lower = part.toLowerCase();
            if (ACRONYM_PARTS.has(lower)) {
                return lower.toUpperCase();
            }

            return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(" ");
}

function isSensitiveFieldName(name: string) {
    const normalized = name.toLowerCase();
    return normalized.includes("token") || normalized.includes("secret");
}

export const renderProviderInputs = ({
    currentProvider,
    providerDefs,
    providerValues,
    translationPrefix,
    title,
    description,
    footer,
    collapsible = true,
    setProviderValues,
    handleSave,
    t,
}: RenderProviderInputsProps) => {

    if (!currentProvider || !providerDefs[currentProvider]) return null;

    const fields = providerDefs[currentProvider];
    const translateField = (fieldName: string) => {
        const fallback = humanizeFieldName(fieldName);
        return translationPrefix
            ? String(t(`${translationPrefix}.${fieldName}`, fallback))
            : fallback;
    };
    const translateFieldHelp = (fieldName: string, helpText?: string) => {
        if (!helpText) return undefined;
        return translationPrefix
            ? String(t(`${translationPrefix}.${fieldName}_help`, helpText))
            : helpText;
    };

    // 统一保存所有字段
    const handleSaveAll = async () => {
        try {
            const finalValues = { ...providerValues };

            fields.forEach((f: any) => {
                if (finalValues[f.name] === undefined) {
                    const defaultValue = parseFieldDefault(f);
                    if (defaultValue !== undefined) {
                        finalValues[f.name] = defaultValue;
                    }
                }
            });

            // 验证必填字段
            const requiredFields = fields.filter((f: any) => f.required);
            const missingFields = requiredFields.filter((f: any) => {
                const value = finalValues[f.name];
                return value === undefined || value === null || (typeof value === 'string' && value.trim() === "");
            });

            if (missingFields.length > 0) {
                const fieldNames = missingFields.map((f: any) => translateField(f.name)).join(", ");
                toast.error(
                    t("settings.missing_required_fields", { fieldNames })
                );
                return;
            }

            // 转换数字类型字段
            const processedValues = { ...finalValues };
            fields.forEach((f: any) => {
                const value = processedValues[f.name];

                // 跳过未定义或null的值
                if (value === undefined || value === null) {
                    return;
                }

                if (["int", "int64"].includes(f.type)) {
                    const numValue = value === "" ? 0 : Number(value);
                    if (isNaN(numValue)) {
                        toast.error(t("settings.invalid_number", { field: translateField(f.name) }));
                        throw new Error(`Invalid integer value for ${f.name}`);
                    }
                    if (!Number.isInteger(numValue)) {
                        toast.error(t("settings.invalid_integer", { field: translateField(f.name) }));
                        throw new Error(`Value must be an integer for ${f.name}`);
                    }
                    processedValues[f.name] = numValue;
                } else if (["float32", "float64"].includes(f.type)) {
                    const numValue = value === "" ? 0 : Number(value);
                    if (isNaN(numValue)) {
                        toast.error(t("settings.invalid_number", { field: translateField(f.name) }));
                        throw new Error(`Invalid float value for ${f.name}`);
                    }
                    processedValues[f.name] = numValue;
                }
            });

            await handleSave(processedValues);
        } catch (error) {
            console.error("Validation error:", error);
            throw error;
        }
    };

    // 更新本地值
    const updateLocalValue = (fieldName: string, value: any) => {
        setProviderValues((v: any) => ({ ...v, [fieldName]: value }));
    };

    // 渲染单个字段
    const renderField = (f: any) => {
        const fieldTitle = translateField(f.name) + (f.required ? " *" : "");
        const fieldDescription = translateFieldHelp(f.name, f.help);
        const defaultValue = parseFieldDefault(f);
        const fieldValue = providerValues[f.name] !== undefined ? providerValues[f.name] : (defaultValue ?? "");

        // 选择框类型
        if (f.type === "option" && f.options) {
            return (
                <SettingCardSelect
                    key={f.name}
                    bordless
                    title={fieldTitle}
                    description={fieldDescription}
                    options={f.options.split(",").map((opt: string) => ({ value: opt, label: opt }))}
                    value={String(fieldValue)}
                    OnSave={(val: string) => {
                        updateLocalValue(f.name, val);
                    }}
                />
            );
        }

        // 开关类型
        if (f.type === "bool") {
            return (
                <SettingCardSwitch
                    bordless
                    key={`${f.name}:${String(fieldValue)}`}
                    title={fieldTitle}
                    description={fieldDescription}
                    defaultChecked={fieldValue !== undefined ? !!fieldValue : (f.default === "true" || f.default === true)}
                    onChange={(checked: boolean) => {
                        updateLocalValue(f.name, checked);
                    }}
                />
            );
        }

        // 长文本类型 (richtext)
        if (f.type === "richtext" || f.type === "text") {
            return (
                <SettingCardLongTextInput
                    key={f.name}
                    bordless
                    title={fieldTitle}
                    description={fieldDescription}
                    defaultValue={String(fieldValue)}
                    showSaveButton={false}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        updateLocalValue(f.name, e.target.value);
                    }}
                    OnSave={(value: string) => {
                        updateLocalValue(f.name, value);
                    }}
                />
            );
        }

        // 短文本和数字类型
        const isNumber = ["int", "int64", "float32", "float64"].includes(f.type);
        const isSensitiveField = isSensitiveFieldName(f.name);
        return (
            <SettingCardShortTextInput
                key={f.name}
                bordless
                title={fieldTitle}
                description={fieldDescription}
                value={String(fieldValue)}
                type={isNumber ? "number" : isSensitiveField ? "password" : "text"}
                autoComplete={isSensitiveField ? "new-password" : undefined}
                showSaveButton={false}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = isNumber ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value;
                    updateLocalValue(f.name, value);
                }}
                OnSave={() => {
                    // 这里不做任何操作，只是为了满足接口要求
                }}
            />
        );
    };

    const formContent = (
        <div className="flex gap-4 flex-col">
            {/* 按照服务器传来的顺序渲染所有字段 */}
            {fields.map((f: any) => renderField(f))}

            {/* 底部说明 */}
            {footer && (
                <label className="text-sm text-muted-foreground mt-2 block">
                    {footer}
                </label>
            )}

            {/* 统一的保存按钮 */}
            <SettingCardButton
                bordless
                onClick={handleSaveAll}
            >
                {t("save", "保存")}
            </SettingCardButton>
        </div>
    );

    if (!collapsible) {
        return (
            <div key={currentProvider} className="space-y-4">
                {(title || description) ? (
                    <div className="space-y-1">
                        {title ? (
                            <div className="text-sm font-semibold text-slate-900">{title}</div>
                        ) : null}
                        {description ? (
                            <div className="text-sm text-slate-500">{description}</div>
                        ) : null}
                    </div>
                ) : null}
                {formContent}
            </div>
        );
    }

    return (
        <div key={currentProvider}>
            <SettingCardCollapse
                title={title ?? "详情"}
                description={description}
                defaultOpen={true}
            >
                {formContent}
            </SettingCardCollapse>
        </div>
    );
};
