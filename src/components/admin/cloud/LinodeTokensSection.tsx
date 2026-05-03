import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";
import {
  CheckCircle2,
  Eye,
  KeyRound,
  MoreHorizontal,
  Server,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import type { LinodeTokenPool, LinodeTokenRecord } from "@/lib/cloudLinode";
import {
  Badge,
  Button,
  Checkbox,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudPanelHeaderClassName,
  cloudPanelTitleClassName,
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
  formatDateTime,
  formatUsdCurrency,
  getLinodeStatusSummary,
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
  return (
    <div className={`order-1 ${cloudPanelCardClassName}`}>
      <div className={cloudPanelHeaderClassName}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className={cloudPanelTitleClassName}>
              {t("cloud.tokens.title", "Token Pool")}
            </div>
            <div className={cloudPanelDescriptionClassName}>
              {t(
                "cloud.providers.linode.tokens_description",
                "Save multiple Linode personal access tokens, choose the active one, and verify them in bulk.",
              )}
            </div>
          </div>
          <Flex gap="2" wrap="wrap">
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
            <Button size="1" onClick={onOpenTokenImport}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t("cloud.tokens.import", "Import Tokens")}
            </Button>
          </Flex>
        </div>
      </div>

      <div className="max-h-[560px] overflow-auto overscroll-contain [scrollbar-gutter:stable]">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={allTokensSelected || (someTokensSelected && "indeterminate")}
                    onCheckedChange={(checked) => {
                      setSelectedTokenIds(checked === true ? tokenRows.map((token) => token.id) : []);
                    }}
                    aria-label={t("cloud.tokens.select_all", "Select all tokens")}
                  />
                </div>
              </TableHead>
              <TableHead>{t("cloud.tokens.table.name", "Name")}</TableHead>
              <TableHead>{t("cloud.tokens.group", "Group")}</TableHead>
              <TableHead>{t("cloud.tokens.table.token", "Token")}</TableHead>
              <TableHead>{t("cloud.tokens.table.account", "Account")}</TableHead>
              <TableHead>{t("cloud.tokens.table.status", "Status")}</TableHead>
              <TableHead>{t("cloud.tokens.table.checked_at", "Last Checked")}</TableHead>
              <TableHead className="text-right">{t("common.action", "Action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!tokenRows.length ? (
              <TableRow>
                <TableCell colSpan={8} className="p-5">
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
                    className="min-h-36 border-0 bg-slate-50/70 shadow-none dark:bg-slate-900/30"
                  />
                </TableCell>
              </TableRow>
            ) : (
              tokenRows.map((token) => (
                <TableRow key={token.id}>
                  <TableCell className="w-10">
                    <div className="flex items-center justify-center">
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
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="max-w-44 truncate">{token.name}</span>
                      {token.is_active ? (
                        <Badge color="blue">{t("cloud.tokens.active", "Active")}</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{token.group || "-"}</TableCell>
                  <TableCell className="max-w-44 truncate font-mono text-xs text-slate-600">
                    {token.masked_token || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-900 dark:text-slate-100">
                      {token.profile_email || token.profile_username || "-"}
                    </div>
                    {token.last_status === "healthy" ? (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {t("cloud.providers.linode.balance", "Balance")}
                        : {" "}
                        {formatUsdCurrency(token.account_balance)}
                      </div>
                    ) : null}
                    {isRestrictedLinodeToken(token) ? (
                      <div className="mt-1">
                        <Badge color="red">{t("cloud.providers.linode.restricted", "Restricted")}</Badge>
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge color={getTokenStatusColor(token.last_status)}>
                      {t(`cloud.tokens.status.${token.last_status}`, token.last_status || "unknown")}
                    </Badge>
                    {token.last_error ? (
                      <div
                        className="mt-1 max-w-64 truncate text-xs text-red-600"
                        title={token.last_error}
                      >
                        {getLinodeStatusSummary(token.last_error, t)}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>{formatDateTime(token.last_checked_at)}</TableCell>
                  <TableCell className="text-right">
                    <Flex justify="end" gap="2" wrap="nowrap">
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
                        {token.is_active
                          ? t("cloud.tokens.current", "Current")
                          : t("cloud.tokens.use", "Use")}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={t("common.action", "Action")}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-44">
                          <DropdownMenuItem
                            onSelect={() => {
                              void onSelectToken(token, {
                                loadResources: true,
                              });
                            }}
                          >
                            <Server className="h-4 w-4" />
                            {t("cloud.providers.linode.view_instances", "View Instances")}
                          </DropdownMenuItem>
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
                    </Flex>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
