import { type Dispatch, type SetStateAction } from "react";
import type { TFunction } from "i18next";
import {
  CheckCircle2,
  Eye,
  KeyRound,
  Server,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import {
  AdminPagination,
  useClientPagination,
} from "@/components/admin/AdminPagination";
import {
  AdminDataTable,
  AdminDataTableCell,
  AdminDataTableEmptyRow,
  AdminDataTableHead,
  AdminDataTableHeadRow,
  AdminDataTableRow,
  AdminDataTableScroll,
} from "@/components/admin/AdminDataTable";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import type { LinodeTokenPool, LinodeTokenRecord } from "@/lib/cloudLinode";
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
import {
  formatUsdCurrency,
  getTokenStatusColor,
  isRestrictedLinodeToken,
} from "./linodePanelUtils";

type MaybePromise<T> = T | Promise<T>;

type SelectTokenOptions = {
  loadResources?: boolean;
};

type LinodeTokensSectionProps = {
  t: TFunction;
  tokenPool: LinodeTokenPool | null;
  tokenRows: LinodeTokenRecord[];
  selectedTokenIds: string[];
  setSelectedTokenIds: Dispatch<SetStateAction<string[]>>;
  selectedTokens: LinodeTokenRecord[];
  allTokensSelected: boolean;
  someTokensSelected: boolean;
  tokenChecking: boolean;
  tokenSecretLoading: boolean;
  promoSubmitting: boolean;
  promoDisabled: boolean;
  onOpenPromo: () => void;
  onCheckTokens: () => MaybePromise<void>;
  onOpenTokenGroupEditor: (tokens: LinodeTokenRecord[]) => void;
  onDeleteSelectedTokens: () => MaybePromise<void>;
  onOpenTokenImport: () => void;
  onToggleTokenSelection: (tokenId: string, selected: boolean) => void;
  onSelectToken: (token: LinodeTokenRecord, options?: SelectTokenOptions) => MaybePromise<void>;
  onViewTokenSecret: (token: LinodeTokenRecord) => MaybePromise<void>;
  onDeleteToken: (token: LinodeTokenRecord) => MaybePromise<void>;
};

export function LinodeTokensSection({
  t,
  tokenPool,
  tokenRows,
  selectedTokenIds,
  setSelectedTokenIds,
  selectedTokens,
  allTokensSelected,
  someTokensSelected,
  tokenChecking,
  tokenSecretLoading,
  promoSubmitting,
  promoDisabled,
  onOpenPromo,
  onCheckTokens,
  onOpenTokenGroupEditor,
  onDeleteSelectedTokens,
  onOpenTokenImport,
  onToggleTokenSelection,
  onSelectToken,
  onViewTokenSecret,
  onDeleteToken,
}: LinodeTokensSectionProps) {
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
                  name: activeToken.name || activeToken.profile_email || activeToken.id,
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
                void onSelectToken(activeToken, { loadResources: true });
              }}
            >
              <Server className="mr-2 h-4 w-4" />
              {t("cloud.providers.linode.view_instances", "查看实例")}
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
            onClick={onOpenPromo}
            disabled={promoDisabled}
          >
            {promoSubmitting
              ? t("cloud.providers.linode.promo_redeeming", "兑换中...")
              : t("cloud.providers.linode.redeem_promo", "兑换优惠码")}
          </Button>
          <Button
            variant="outline"
            size="1"
            onClick={() => {
              void onCheckTokens();
            }}
            disabled={tokenChecking || !tokenPool?.tokens.length}
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
        {!tokenRows.length ? (
          <AdminEmptyState
            icon={<KeyRound className="h-5 w-5" />}
            title={t("cloud.providers.linode.tokens_empty", "尚未保存 Linode 令牌")}
            description={t(
              "cloud.providers.linode.tokens_empty_description",
              "Import a Linode personal access token to select an active account, check health, and load instances.",
            )}
            actions={(
              <Button size="1" onClick={onOpenTokenImport}>
                <KeyRound className="mr-2 h-4 w-4" />
                {t("cloud.tokens.import", "导入令牌")}
              </Button>
            )}
            className={cloudTableEmptyStateClassName}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-950">
            <AdminDataTableScroll>
              <AdminDataTable minWidth={480} className="[&_td]:px-2 [&_th]:px-2">
                <thead>
                  <AdminDataTableHeadRow>
                    <AdminDataTableHead className="w-10" />
                    <AdminDataTableHead>{t("cloud.tokens.table.name", "名称")}</AdminDataTableHead>
                    <AdminDataTableHead>{t("cloud.tokens.group", "分组")}</AdminDataTableHead>
                    <AdminDataTableHead>{t("cloud.providers.linode.balance", "余额")}</AdminDataTableHead>
                    <AdminDataTableHead>{t("cloud.tokens.table.status", "状态")}</AdminDataTableHead>
                    <AdminDataTableHead align="right" sticky="right" className="w-[72px]">
                      {t("common.action", "操作")}
                    </AdminDataTableHead>
                  </AdminDataTableHeadRow>
                </thead>
                <tbody>
                  {visibleTokenRows.length === 0 ? (
                    <AdminDataTableEmptyRow colSpan={6}>
                      <AdminEmptyState
                        icon={<KeyRound className="h-5 w-5" />}
                        title={t("cloud.providers.linode.tokens_empty_page", "本页暂无令牌")}
                        description={t("cloud.providers.linode.tokens_empty_page_description", "可调整每页条数或返回上一页。")}
                        className="min-h-28 border-0 bg-muted/25 shadow-none"
                      />
                    </AdminDataTableEmptyRow>
                  ) : visibleTokenRows.map((token) => (
                    <AdminDataTableRow key={token.id} selected={selectedTokenIds.includes(token.id)}>
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
                          {token.name || token.profile_email || token.id}
                        </span>
                      </AdminDataTableCell>
                      <AdminDataTableCell className={cloudTableSecondaryTextClassName}>
                        <span className="block max-w-36 truncate">
                          {token.group || t("cloud.tokens.no_group", "未分组")}
                        </span>
                      </AdminDataTableCell>
                      <AdminDataTableCell className={cloudTableSecondaryTextClassName}>
                        {formatUsdCurrency(token.account_balance)}
                      </AdminDataTableCell>
                      <AdminDataTableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {token.is_active ? (
                            <Badge color="blue">{t("cloud.tokens.active", "已激活")}</Badge>
                          ) : null}
                          <Badge color={getTokenStatusColor(token.last_status)}>
                            {t(`cloud.tokens.status.${token.last_status}`, token.last_status || "unknown")}
                          </Badge>
                          {isRestrictedLinodeToken(token) ? (
                            <Badge color="red">{t("cloud.providers.linode.restricted", "受限")}</Badge>
                          ) : null}
                        </div>
                      </AdminDataTableCell>
                      <AdminDataTableCell align="right" sticky="right" className="w-[72px]">
                        <AdminRowActions
                          label={t("common.action", "操作")}
                          contentClassName="min-w-44"
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
          </div>
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
