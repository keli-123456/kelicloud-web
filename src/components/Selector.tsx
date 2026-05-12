import React from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

/**
 * 通用多选列表组件：提供搜索、全选、半选（indeterminate）和孤立值渲染能力。
 * 通过传入任意 items，并提供 getId / getLabel 来定义唯一标识与显示内容。
 */
export interface SelectorProps<T> {
  className?: string;
  scrollAreaClassName?: string;
  hiddenDescription?: boolean;
  /** 已选择的 id 列表 */
  value: string[];
  /** 选择变化回调 */
  onChange: (ids: string[]) => void;
  /** 数据源 */
  items: T[];
  /** 获取唯一 id */
  getId: (item: T) => string;
  /** 获取显示标签（单元格内容） */
  getLabel: (item: T) => React.ReactNode;
  /** 自定义排序（可选） */
  sortItems?: (a: T, b: T) => number;
  /** 自定义搜索过滤；返回 true 表示保留 */
  filterItem?: (item: T, keyword: string) => boolean;
  /** 搜索占位符 */
  searchPlaceholder?: string;
  /** 表头标题（第二列） */
  headerLabel?: React.ReactNode;
}

function SelectorInner<T>(props: SelectorProps<T>) {
  const {
    className = "",
    scrollAreaClassName = "max-h-[360px] overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable]",
    hiddenDescription = false,
    value: externalValue,
    onChange,
    items,
    getId,
    getLabel,
    sortItems,
    filterItem,
    searchPlaceholder,
    headerLabel,
  } = props;
  const { t } = useTranslation();
  const resolvedSearchPlaceholder =
    searchPlaceholder ||
    t("selector.search_placeholder", { defaultValue: "Search..." });
  const resolvedHeaderLabel =
    headerLabel ||
    t("selector.header_label", { defaultValue: "Items" });

  const value = externalValue ?? [];
  const [search, setSearch] = React.useState("");

  // 排序 & 搜索
  const processed = React.useMemo(() => {
    let arr = [...items];
    if (sortItems) arr.sort(sortItems);
    if (search.trim()) {
      const kw = search.toLowerCase();
      arr = arr.filter((it) =>
        filterItem
          ? filterItem(it, search)
          : String(getLabel(it)).toLowerCase().includes(kw)
      );
    }
    return arr;
  }, [items, sortItems, filterItem, search, getLabel]);

  const allIds = processed.map(getId);

  // 半选逻辑
  const allChecked =
    allIds.length > 0 && allIds.every((id) => value.includes(id));
  const isIndeterminate =
    value.length > 0 && value.some((id) => allIds.includes(id)) && !allChecked;

  // 孤立（value 中但 items 不再存在）
  const orphanIds = value.filter((id) => !items.some((it) => getId(it) === id));

  const handleCheckAll = (checked: boolean) => {
    if (checked) {
      onChange(Array.from(new Set([...value, ...allIds])));
    } else {
      onChange(value.filter((id) => !allIds.includes(id)));
    }
  };

  const handleCheck = (id: string, checked: boolean) => {
    if (checked) {
      onChange(Array.from(new Set([...value, id])));
    } else {
      onChange(value.filter((v) => v !== id));
    }
  };

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="relative mb-2 shrink-0">
        <Input
          className="pl-9"
          placeholder={resolvedSearchPlaceholder}
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
        />
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
          <Search size="16" />
        </div>
      </div>
      <div
        className={`selector min-h-0 rounded-md ${scrollAreaClassName}`}
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>
                <Checkbox
                  checked={isIndeterminate ? "indeterminate" : allChecked}
                  onCheckedChange={(checked) => handleCheckAll(!!checked)}
                  aria-label={t("selector.select_all", {
                    defaultValue: "Select all",
                  })}
                />
              </TableHead>
              <TableHead>{resolvedHeaderLabel}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processed.map((it) => {
              const id = getId(it);
              return (
                <TableRow
                  key={id}
                  onClick={() => {
                    handleCheck(id, !value.includes(id));
                  }}
                >
                  <TableCell>
                    <Checkbox
                      checked={value.includes(id)}
                      onCheckedChange={(checked) => handleCheck(id, !!checked)}
                      aria-label={t("selector.select_item", {
                        item: id,
                        defaultValue: "Select {{item}}",
                      })}
                    />
                  </TableCell>
                  <TableCell>{getLabel(it)}</TableCell>
                </TableRow>
              );
            })}
            {orphanIds.map((id) => (
              <TableRow
                key={id}
                onClick={() => {
                  handleCheck(id, !value.includes(id));
                }}
              >
                <TableCell>
                  <Checkbox
                    checked={value.includes(id)}
                    onCheckedChange={(checked) => handleCheck(id, !!checked)}
                    aria-label={t("selector.select_item", {
                      item: id,
                      defaultValue: "Select {{item}}",
                    })}
                  />
                </TableCell>
                <TableCell>{id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!hiddenDescription && (
        <label className="text-sm text-muted-foreground">
          {t("common.selected", { count: value.length })}
        </label>
      )}
    </div>
  );
}

/** 泛型组件导出 */
export function Selector<T>(props: SelectorProps<T>) {
  return <SelectorInner {...props} />;
}

export default Selector;
