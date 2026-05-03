import type { TFunction } from "i18next";
import {
  Eye,
  KeyRound,
  MoreHorizontal,
  Server,
  Trash2,
} from "lucide-react";

import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { AWSQuotaSummary } from "@/components/admin/cloud/AWSQuotaSummary";
import {
  Badge,
  Button,
  Checkbox,
  cloudLongTextClassName,
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
import type { AWSCredentialRecord } from "@/lib/cloudAws";
import {
  getAWSCountryLabel,
} from "./awsPanelSummaries";
import {
  formatDateTime,
  getCredentialStatusColor,
} from "./awsPanelUtils";

type MaybePromise<T> = T | Promise<T>;

type AWSCredentialTableProps = {
  t: TFunction;
  credentials: AWSCredentialRecord[];
  selectedCredentialIds: string[];
  allCredentialsSelected: boolean;
  someCredentialsSelected: boolean;
  credentialSecretLoading: boolean;
  onSelectAll: (checked: boolean) => void;
  onToggleCredential: (credentialId: string, checked: boolean) => void;
  onSelectCredential: (credential: AWSCredentialRecord) => MaybePromise<void>;
  onImportCredentials: () => void;
  onOpenGroupEditor: (credentials: AWSCredentialRecord[]) => void;
  onViewCredentialSecret: (credential: AWSCredentialRecord) => MaybePromise<void>;
  onDeleteCredential: (credential: AWSCredentialRecord) => MaybePromise<void>;
};

export function AWSCredentialTable({
  t,
  credentials,
  selectedCredentialIds,
  allCredentialsSelected,
  someCredentialsSelected,
  credentialSecretLoading,
  onSelectAll,
  onToggleCredential,
  onSelectCredential,
  onImportCredentials,
  onOpenGroupEditor,
  onViewCredentialSecret,
  onDeleteCredential,
}: AWSCredentialTableProps) {
  return (
    <div className="max-h-[560px] overflow-auto overscroll-contain [scrollbar-gutter:stable]">
      <Table className="min-w-[1040px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={allCredentialsSelected || (someCredentialsSelected && "indeterminate")}
                  onCheckedChange={(checked) => onSelectAll(checked === true)}
                  aria-label={t("cloud.tokens.select_all", "Select all tokens")}
                />
              </div>
            </TableHead>
            <TableHead>{t("cloud.tokens.table.name", "Name")}</TableHead>
            <TableHead>{t("cloud.tokens.group", "Group")}</TableHead>
            <TableHead>{t("cloud.providers.aws.access_key", "Access Key")}</TableHead>
            <TableHead>{t("cloud.providers.aws.country", "Country")}</TableHead>
            <TableHead>{t("cloud.providers.aws.ec2_quota", "EC2 Quota")}</TableHead>
            <TableHead>{t("cloud.tokens.table.status", "Status")}</TableHead>
            <TableHead>{t("cloud.tokens.table.checked_at", "Last Checked")}</TableHead>
            <TableHead className="text-right">{t("common.action", "Action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!credentials.length ? (
            <TableRow>
              <TableCell colSpan={9} className="p-5">
                <AdminEmptyState
                  icon={<KeyRound className="h-5 w-5" />}
                  title={t("cloud.providers.aws.credentials_empty", "还没有保存 AWS 凭证")}
                  description={t(
                    "cloud.providers.aws.credentials_empty_description",
                    "导入 AWS Access Key 后即可选择当前账户、切换区域，并加载 EC2 或 Lightsail 资源。",
                  )}
                  actions={(
                    <Button size="1" onClick={onImportCredentials}>
                      <KeyRound className="mr-2 h-4 w-4" />
                      {t("cloud.providers.aws.import", "导入凭证")}
                    </Button>
                  )}
                  className="min-h-36 border-0 bg-slate-50/70 shadow-none dark:bg-slate-900/30"
                />
              </TableCell>
            </TableRow>
          ) : (
            credentials.map((credential) => (
              <TableRow key={credential.id}>
                <TableCell className="w-10">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={selectedCredentialIds.includes(credential.id)}
                      onCheckedChange={(checked) => onToggleCredential(credential.id, checked === true)}
                      aria-label={t("cloud.tokens.select_one", {
                        name: credential.name,
                        defaultValue: `Select token ${credential.name}`,
                      })}
                    />
                  </div>
                </TableCell>
                <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="max-w-40 truncate">{credential.name}</span>
                    {credential.is_active ? (
                      <Badge color="blue">{t("cloud.tokens.active", "Active")}</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{credential.group || "-"}</TableCell>
                <TableCell className="font-mono text-xs text-slate-600">
                  {credential.masked_access_key_id || "-"}
                </TableCell>
                <TableCell>
                  {getAWSCountryLabel(credential.default_region, t)}
                </TableCell>
                <TableCell className="min-w-48 align-top">
                  <AWSQuotaSummary quota={credential.ec2_quota} t={t} compact />
                </TableCell>
                <TableCell>
                  <Badge color={getCredentialStatusColor(credential.last_status)}>
                    {t(`cloud.tokens.status.${credential.last_status}`, credential.last_status || "unknown")}
                  </Badge>
                  {credential.last_error ? (
                    <div className={`mt-1 max-w-64 text-xs text-red-600 ${cloudLongTextClassName}`}>
                      {credential.last_error}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>{formatDateTime(credential.last_checked_at)}</TableCell>
                <TableCell className="text-right">
                  <Flex justify="end" gap="2" wrap="nowrap">
                    <Button
                      variant="soft"
                      size="1"
                      color={credential.is_active ? "blue" : undefined}
                      disabled={credential.is_active}
                      onClick={() => {
                        void onSelectCredential(credential);
                      }}
                    >
                      <Server className="mr-1 h-3.5 w-3.5" />
                      {credential.is_active
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
                            onOpenGroupEditor([credential]);
                          }}
                        >
                          {t("cloud.tokens.set_group", "Set Group")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={credentialSecretLoading}
                          onSelect={() => {
                            void onViewCredentialSecret(credential);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          {t("cloud.providers.aws.view_credential", "View Credential")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            void onDeleteCredential(credential);
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
  );
}
