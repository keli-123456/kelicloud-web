import { useState, type Dispatch, type SetStateAction } from "react";
import type { TFunction } from "i18next";
import {
  ChevronDown,
  CheckCircle2,
  Eye,
  KeyRound,
  MoreHorizontal,
  Server,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import {
  AdminPagination,
  useClientPagination,
} from "@/components/admin/AdminPagination";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const [poolOpen, setPoolOpen] = useState(true);
  const activeToken = tokenRows.find((token) => token.is_active) || null;

  return (
    <div className={`order-1 flex h-full min-h-[520px] flex-col ${cloudPanelCardClassName}`}>
      <div className={cloudPanelHeaderClassName}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className={cloudPanelTitleClassName}>
              {t("cloud.tokens.title", "Token Pool")}
              </div>
              <Badge color={activeToken ? "green" : "amber"}>
                {activeToken ? t("cloud.tokens.active", "Active") : t("cloud.no_active", "No active")}
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
                : t("cloud.tokens.no_active_hint", "Import or select a token when you need to manage credentials.")}
            </div>
          </div>
          <Flex gap="2" wrap="wrap">
            <Button size="1" onClick={onOpenTokenImport}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t("cloud.tokens.import", "Import Tokens")}
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
              {t("cloud.providers.linode.view_instances", "View Instances")}
            </Button>
            <Button
              variant="outline"
              size="1"
              onClick={() => setPoolOpen((open) => !open)}
            >
              <ChevronDown className={`mr-2 h-4 w-4 transition-transform ${poolOpen ? "rotate-180" : ""}`} />
              {poolOpen ? t("common.collapse", "Collapse") : t("cloud.tokens.manage", "Manage")}
            </Button>
          </Flex>
        </div>
        {poolOpen ? (
          <Flex className="mt-3 border-t border-border pt-3" gap="2" wrap="wrap">
            <label className="flex h-8 items-center gap-2 rounded-md border border-border bg-background px-2 text-xs font-medium text-muted-foreground">
              <Checkbox
                checked={allTokensSelected || (someTokensSelected && "indeterminate")}
                onCheckedChange={(checked) => {
                  setSelectedTokenIds(checked === true ? tokenRows.map((token) => token.id) : []);
                }}
                aria-label={t("cloud.tokens.select_all", "Select all tokens")}
              />
              {t("cloud.tokens.select_all", "Select all tokens")}
            </label>
            <Button
              variant="outline"
              size="1"
              onClick={onOpenPromo}
              disabled={promoDisabled}
            >
              {promoSubmitting
                ? t("cloud.providers.linode.promo_redeeming", "Redeeming...")
                : t("cloud.providers.linode.redeem_promo", "Redeem Promo")}
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
              {t("cloud.tokens.check_all", "Check All Tokens")}
            </Button>
            <Button
              variant="outline"
              size="1"
              onClick={() => onOpenTokenGroupEditor(selectedTokens)}
              disabled={selectedTokens.length === 0}
            >
              {t("cloud.tokens.set_group", "Set Group")}
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
        ) : null}
      </div>

      {poolOpen ? (
        <>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-gutter:stable]">
        {!tokenRows.length ? (
          <AdminEmptyState
            icon={<KeyRound className="h-5 w-5" />}
            title={t("cloud.providers.linode.tokens_empty", "No Linode tokens saved yet")}
            description={t(
              "cloud.providers.linode.tokens_empty_description",
              "Import a Linode personal access token to select an active account, check health, and load instances.",
            )}
            actions={(
              <Button size="1" onClick={onOpenTokenImport}>
                <KeyRound className="mr-2 h-4 w-4" />
                {t("cloud.tokens.import", "Import Tokens")}
              </Button>
            )}
            className={cloudTableEmptyStateClassName}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>{t("cloud.tokens.table.name", "Name")}</TableHead>
                  <TableHead>{t("cloud.tokens.group", "Group")}</TableHead>
                  <TableHead>{t("cloud.providers.linode.balance", "Balance")}</TableHead>
                  <TableHead>{t("cloud.tokens.table.status", "Status")}</TableHead>
                  <TableHead className="text-right">{t("common.action", "Action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleTokenRows.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className={cloudTablePrimaryTextClassName}>
                      <span className="block max-w-44 truncate">
                        {token.name || token.profile_email || token.id}
                      </span>
                    </TableCell>
                    <TableCell className={cloudTableSecondaryTextClassName}>
                      <span className="block max-w-36 truncate">
                        {token.group || t("cloud.tokens.no_group", "No group")}
                      </span>
                    </TableCell>
                    <TableCell className={cloudTableSecondaryTextClassName}>
                      {formatUsdCurrency(token.account_balance)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {token.is_active ? (
                          <Badge color="blue">{t("cloud.tokens.active", "Active")}</Badge>
                        ) : null}
                        <Badge color={getTokenStatusColor(token.last_status)}>
                          {t(`cloud.tokens.status.${token.last_status}`, token.last_status || "unknown")}
                        </Badge>
                        {isRestrictedLinodeToken(token) ? (
                          <Badge color="red">{t("cloud.providers.linode.restricted", "Restricted")}</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="soft"
                          size="1"
                          color={token.is_active ? "blue" : undefined}
                          disabled={token.is_active}
                          onClick={() => {
                            void onSelectToken(token);
                          }}
                        >
                          <Server className="mr-1 h-3.5 w-3.5" />
                          {token.is_active ? t("cloud.tokens.current", "Current") : t("cloud.tokens.use", "Use")}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={t("common.action", "Action")}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-44">
                            <DropdownMenuItem
                              disabled={tokenSecretLoading}
                              onSelect={() => {
                                void onViewTokenSecret(token);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              {t("cloud.tokens.view_token", "View Token")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => {
                                void onDeleteToken(token);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              {t("cloud.tokens.delete", "Delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
        </>
      ) : null}
    </div>
  );
}
