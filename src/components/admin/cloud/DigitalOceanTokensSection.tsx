import { type ComponentProps, type Dispatch, type SetStateAction } from "react";
import type { TFunction } from "i18next";
import {
  CheckCircle2,
  Eye,
  KeyRound,
  Server,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import type { DigitalOceanTokenRecord } from "@/lib/cloud";
import {
  AdminDataTable,
  AdminDataTableCell,
  AdminDataTableHead,
  AdminDataTableHeadRow,
  AdminDataTableRow,
  AdminDataTableScroll,
} from "@/components/admin/AdminDataTable";
import {
  AdminPagination,
  useClientPagination,
} from "@/components/admin/AdminPagination";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import {
  Badge,
  Button,
  Checkbox,
  cloudPanelCardClassName,
  cloudPanelHeaderClassName,
  cloudPanelTitleClassName,
  cloudTableEmptyStateClassName,
  cloudTablePrimaryTextClassName,
  cloudTableSecondaryTextClassName,
  Flex,
} from "@/components/admin/cloud/cloud-ui";
type MaybePromise<T> = T | Promise<T>;
type BadgeColor = ComponentProps<typeof Badge>["color"];

type DigitalOceanTokensSectionProps = {
  t: TFunction;
  tokenRows: DigitalOceanTokenRecord[];
  selectedTokenIds: string[];
  setSelectedTokenIds: Dispatch<SetStateAction<string[]>>;
  selectedTokens: DigitalOceanTokenRecord[];
  allTokensSelected: boolean;
  someTokensSelected: boolean;
  tokenChecking: boolean;
  tokenSecretLoading: boolean;
  managedKeyLoading: boolean;
  getTokenStatusColor: (status: string) => BadgeColor;
  onCheckTokens: () => MaybePromise<void>;
  onOpenTokenGroupEditor: (tokens: DigitalOceanTokenRecord[]) => void;
  onDeleteSelectedTokens: () => MaybePromise<void>;
  onOpenTokenImport: () => void;
  onToggleTokenSelection: (tokenId: string, selected: boolean) => void;
  onSelectToken: (token: DigitalOceanTokenRecord) => MaybePromise<void>;
  onOpenDropletsForToken: (token: DigitalOceanTokenRecord) => MaybePromise<void>;
  onViewTokenSecret: (token: DigitalOceanTokenRecord) => MaybePromise<void>;
  onViewManagedKey: (token: DigitalOceanTokenRecord) => MaybePromise<void>;
  onDeleteToken: (token: DigitalOceanTokenRecord) => MaybePromise<void>;
};

export function DigitalOceanTokensSection({
  t,
  tokenRows,
  selectedTokenIds,
  setSelectedTokenIds,
  selectedTokens,
  allTokensSelected,
  someTokensSelected,
  tokenChecking,
  tokenSecretLoading,
  managedKeyLoading,
  getTokenStatusColor,
  onCheckTokens,
  onOpenTokenGroupEditor,
  onDeleteSelectedTokens,
  onOpenTokenImport,
  onToggleTokenSelection,
  onSelectToken,
  onOpenDropletsForToken,
  onViewTokenSecret,
  onViewManagedKey,
  onDeleteToken,
}: DigitalOceanTokensSectionProps) {
  const tokenPagination = useClientPagination(tokenRows, {
    initialPageSize: 5,
  });
  const visibleTokenRows = tokenPagination.pageItems;
  const activeToken = tokenRows.find((token) => token.is_active) || null;

  return (
    <div className={`order-1 flex h-full min-h-[520px] flex-col ${cloudPanelCardClassName}`}>
      <div className={cloudPanelHeaderClassName}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className={cloudPanelTitleClassName}>
              {t("cloud.tokens.title", "令牌池")}
              </div>
              <Badge color={activeToken ? "green" : "amber"}>
                {activeToken ? t("cloud.tokens.active", "已激活") : t("cloud.no_active", "未激活")}
              </Badge>
              <Badge color="gray">
                {t("cloud.tokens.count", {
                  count: tokenRows.length,
                  defaultValue: "{{count}} tokens",
                })}
              </Badge>
            </div>
            <div className="mt-1 min-w-0 truncate text-xs leading-5 text-muted-foreground">
              {activeToken
                ? t("cloud.tokens.active_hint", {
                  name: activeToken.name || activeToken.account_email || activeToken.id,
                  defaultValue: "Active: {{name}}",
                })
                : t("cloud.tokens.no_active_hint", "需要管理凭证时，请先导入或选择令牌。")}
            </div>
          </div>
          <Flex gap="2" wrap="wrap">
            <Button size="1" onClick={onOpenTokenImport}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t("cloud.tokens.import", "导入令牌")}
            </Button>
            <Button
              variant="outline"
              size="1"
              disabled={!activeToken}
              onClick={() => {
                if (!activeToken) return;
                void onOpenDropletsForToken(activeToken);
              }}
            >
              <Server className="mr-2 h-4 w-4" />
              {t("cloud.tokens.view_droplets", "查看实例")}
            </Button>
          </Flex>
        </div>
        <Flex className="mt-3 border-t border-border pt-3" gap="2" wrap="wrap">
          <label className="flex h-8 items-center gap-2 rounded-md border border-border bg-background px-2 text-xs font-medium text-muted-foreground">
            <Checkbox
              checked={allTokensSelected || (someTokensSelected && "indeterminate")}
              onCheckedChange={(checked) => {
                setSelectedTokenIds(checked === true ? tokenRows.map((token) => token.id) : []);
              }}
              aria-label={t("cloud.tokens.select_all", "选择全部令牌")}
            />
            {t("cloud.tokens.select_all", "选择全部令牌")}
          </label>
          <Button
            variant="outline"
            size="1"
            onClick={() => {
              void onCheckTokens();
            }}
            disabled={tokenChecking || tokenRows.length === 0}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            {t("cloud.tokens.check_all", "检查全部凭证")}
          </Button>
          <Button
            variant="outline"
            size="1"
            onClick={() => onOpenTokenGroupEditor(selectedTokens)}
            disabled={selectedTokens.length === 0}
          >
            {t("cloud.tokens.set_group", "设置分组")}
          </Button>
          <Button
            variant="outline"
            size="1"
            color="red"
            onClick={() => {
              void onDeleteSelectedTokens();
            }}
            disabled={selectedTokens.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("cloud.tokens.delete_selected", {
              count: selectedTokens.length,
              defaultValue: "Delete selected",
            })}
          </Button>
        </Flex>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-gutter:stable]">
        {tokenRows.length === 0 ? (
          <AdminEmptyState
            icon={<KeyRound className="h-5 w-5" />}
            title={t("cloud.tokens.empty", "还没有保存任何 DigitalOcean 令牌")}
            description={t(
              "cloud.tokens.empty_description",
              "先导入 API 令牌。令牌激活后，就可以检查账户状态并加载 Droplet 资源。",
            )}
            actions={
              <Button size="1" onClick={onOpenTokenImport}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t("cloud.tokens.import", "导入令牌")}
              </Button>
            }
            className={cloudTableEmptyStateClassName}
          />
        ) : (
          <AdminDataTableScroll className="rounded-lg border border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-950">
            <AdminDataTable minWidth={460} className="[&_td]:px-2 [&_th]:px-2">
              <thead>
                <AdminDataTableHeadRow>
                  <AdminDataTableHead className="w-10" />
                  <AdminDataTableHead>{t("cloud.tokens.table.name", "名称")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.tokens.group", "分组")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.tokens.quota", "配额")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.tokens.table.status", "状态")}</AdminDataTableHead>
                  <AdminDataTableHead sticky="right" align="right" className="w-[72px]">
                    {t("common.action", "操作")}
                  </AdminDataTableHead>
                </AdminDataTableHeadRow>
              </thead>
              <tbody>
                {visibleTokenRows.map((token) => (
                  <AdminDataTableRow key={token.id}>
                    <AdminDataTableCell>
                      <Checkbox
                        checked={selectedTokenIds.includes(token.id)}
                        onCheckedChange={(checked) => {
                          onToggleTokenSelection(token.id, Boolean(checked));
                        }}
                        aria-label={t("cloud.tokens.select_one", {
                          name: token.name,
                          defaultValue: `Select token ${token.name}`,
                        })}
                      />
                    </AdminDataTableCell>
                    <AdminDataTableCell className={cloudTablePrimaryTextClassName}>
                      <span className="block max-w-44 truncate">
                        {token.name || token.account_email || token.id}
                      </span>
                    </AdminDataTableCell>
                    <AdminDataTableCell className={cloudTableSecondaryTextClassName}>
                      <span className="block max-w-36 truncate">
                        {token.group || t("cloud.tokens.no_group", "未分组")}
                      </span>
                    </AdminDataTableCell>
                    <AdminDataTableCell className={cloudTableSecondaryTextClassName}>
                      {token.droplet_limit
                        ? t("cloud.tokens.droplet_limit", {
                          count: token.droplet_limit,
                          defaultValue: `Droplet limit ${token.droplet_limit}`,
                        })
                        : "-"}
                    </AdminDataTableCell>
                    <AdminDataTableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {token.is_active ? (
                          <Badge color="blue">{t("cloud.tokens.active", "已激活")}</Badge>
                        ) : null}
                        <Badge color={getTokenStatusColor(token.last_status)}>
                          {t(`cloud.tokens.status.${token.last_status}`, token.last_status || "unknown")}
                        </Badge>
                      </div>
                    </AdminDataTableCell>
                    <AdminDataTableCell sticky="right" align="right">
                      <AdminRowActions
                        actions={[
                          {
                            label: token.is_active
                              ? t("cloud.tokens.current", "当前")
                              : t("cloud.tokens.use", "使用"),
                            icon: <Server className="h-4 w-4" />,
                            disabled: token.is_active,
                            onSelect: () => {
                              void onSelectToken(token);
                            },
                          },
                          {
                            label: t("cloud.tokens.view_token", "查看令牌"),
                            icon: <Eye className="h-4 w-4" />,
                            disabled: tokenSecretLoading,
                            onSelect: () => {
                              void onViewTokenSecret(token);
                            },
                          },
                          {
                            label: t("cloud.tokens.view_managed_key", "查看托管密钥"),
                            icon: <KeyRound className="h-4 w-4" />,
                            disabled: !token.managed_ssh_key_ready || managedKeyLoading,
                            onSelect: () => {
                              void onViewManagedKey(token);
                            },
                          },
                          {
                            label: t("cloud.tokens.delete", "删除"),
                            icon: <Trash2 className="h-4 w-4" />,
                            destructive: true,
                            onSelect: () => {
                              void onDeleteToken(token);
                            },
                          },
                        ]}
                      />
                    </AdminDataTableCell>
                  </AdminDataTableRow>
                ))}
              </tbody>
            </AdminDataTable>
          </AdminDataTableScroll>
        )}
      </div>
      <AdminPagination
        page={tokenPagination.page}
        totalPages={tokenPagination.totalPages}
        total={tokenPagination.total}
        pageSize={tokenPagination.pageSize}
        visibleStart={tokenPagination.visibleStart}
        visibleEnd={tokenPagination.visibleEnd}
        onPageChange={tokenPagination.setPage}
        onPageSizeChange={tokenPagination.setPageSize}
        pageSizeOptions={[5, 10, 20]}
        itemLabel={t("admin.pagination.credentials", { defaultValue: "credentials" })}
        compact
      />
    </div>
  );
}
