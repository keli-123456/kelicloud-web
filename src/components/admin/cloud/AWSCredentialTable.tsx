import type { TFunction } from "i18next";
import {
  Eye,
  KeyRound,
  Server,
  Trash2,
} from "lucide-react";

import {
  AdminDataTable,
  AdminDataTableCell,
  AdminDataTableEmptyRow,
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
import { AWSQuotaSummary } from "@/components/admin/cloud/AWSQuotaSummary";
import {
  Badge,
  Button,
  Checkbox,
  cloudLongTextClassName,
  cloudTableCodeTextClassName,
  cloudTableEmptyStateClassName,
  cloudTablePrimaryTextClassName,
} from "@/components/admin/cloud/cloud-ui";
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
  const credentialPagination = useClientPagination(credentials, {
    initialPageSize: 10,
  });
  const visibleCredentials = credentialPagination.pageItems;

  return (
    <>
      <AdminDataTableScroll className="max-h-[560px]">
        <AdminDataTable minWidth={1040}>
          <thead>
            <AdminDataTableHeadRow>
            <AdminDataTableHead className="w-10">
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={allCredentialsSelected || (someCredentialsSelected && "indeterminate")}
                  onCheckedChange={(checked) => onSelectAll(checked === true)}
                  aria-label={t("cloud.tokens.select_all", "选择全部凭证")}
                />
              </div>
            </AdminDataTableHead>
            <AdminDataTableHead>{t("cloud.tokens.table.name", "名称")}</AdminDataTableHead>
            <AdminDataTableHead>{t("cloud.tokens.group", "分组")}</AdminDataTableHead>
            <AdminDataTableHead>{t("cloud.providers.aws.access_key", "访问密钥")}</AdminDataTableHead>
            <AdminDataTableHead>{t("cloud.providers.aws.country", "国家")}</AdminDataTableHead>
            <AdminDataTableHead>{t("cloud.providers.aws.ec2_quota", "EC2 配额")}</AdminDataTableHead>
            <AdminDataTableHead>{t("cloud.tokens.table.status", "状态")}</AdminDataTableHead>
            <AdminDataTableHead>{t("cloud.tokens.table.checked_at", "最近检测")}</AdminDataTableHead>
            <AdminDataTableHead align="right" sticky="right">
              {t("common.action", "操作")}
            </AdminDataTableHead>
          </AdminDataTableHeadRow>
        </thead>
        <tbody>
          {!credentials.length ? (
            <AdminDataTableEmptyRow colSpan={9} className="p-5">
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
                  className={cloudTableEmptyStateClassName}
                />
            </AdminDataTableEmptyRow>
          ) : (
            visibleCredentials.map((credential) => (
              <AdminDataTableRow key={credential.id}>
                <AdminDataTableCell className="w-10">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={selectedCredentialIds.includes(credential.id)}
                      onCheckedChange={(checked) => onToggleCredential(credential.id, checked === true)}
                      aria-label={t("cloud.tokens.select_one", {
                        name: credential.name,
                        defaultValue: `选择凭证 ${credential.name}`,
                      })}
                    />
                  </div>
                </AdminDataTableCell>
                <AdminDataTableCell className={cloudTablePrimaryTextClassName}>
                  <div className="flex items-center gap-2">
                    <span className="max-w-40 truncate">{credential.name}</span>
                    {credential.is_active ? (
                      <Badge color="blue">{t("cloud.tokens.active", "启用")}</Badge>
                    ) : null}
                  </div>
                </AdminDataTableCell>
                <AdminDataTableCell>{credential.group || "-"}</AdminDataTableCell>
                <AdminDataTableCell className={cloudTableCodeTextClassName}>
                  {credential.masked_access_key_id || "-"}
                </AdminDataTableCell>
                <AdminDataTableCell>
                  {getAWSCountryLabel(credential.default_region, t)}
                </AdminDataTableCell>
                <AdminDataTableCell className="min-w-48 align-top">
                  <AWSQuotaSummary quota={credential.ec2_quota} t={t} compact />
                </AdminDataTableCell>
                <AdminDataTableCell>
                  <Badge color={getCredentialStatusColor(credential.last_status)}>
                    {t(`cloud.tokens.status.${credential.last_status}`, credential.last_status || "unknown")}
                  </Badge>
                  {credential.last_error ? (
                    <div className={`mt-1 max-w-64 text-xs text-red-600 ${cloudLongTextClassName}`}>
                      {credential.last_error}
                    </div>
                  ) : null}
                </AdminDataTableCell>
                <AdminDataTableCell>{formatDateTime(credential.last_checked_at)}</AdminDataTableCell>
                <AdminDataTableCell align="right" sticky="right">
                  <AdminRowActions
                    contentClassName="min-w-44"
                    actions={[
                      {
                        label: credential.is_active
                          ? t("cloud.tokens.current", "当前")
                          : t("cloud.tokens.use", "使用"),
                        icon: <Server className="h-4 w-4" />,
                        disabled: credential.is_active,
                        onSelect: () => {
                          void onSelectCredential(credential);
                        },
                      },
                      {
                        label: t("cloud.tokens.set_group", "设置分组"),
                        onSelect: () => {
                          onOpenGroupEditor([credential]);
                        },
                      },
                      {
                        label: t("cloud.providers.aws.view_credential", "查看凭证"),
                        icon: <Eye className="h-4 w-4" />,
                        disabled: credentialSecretLoading,
                        onSelect: () => {
                          void onViewCredentialSecret(credential);
                        },
                      },
                      {
                        label: t("cloud.tokens.delete", "删除"),
                        icon: <Trash2 className="h-4 w-4" />,
                        destructive: true,
                        onSelect: () => {
                          void onDeleteCredential(credential);
                        },
                      },
                    ]}
                  />
                </AdminDataTableCell>
              </AdminDataTableRow>
            ))
          )}
        </tbody>
        </AdminDataTable>
      </AdminDataTableScroll>
      <AdminPagination
        page={credentialPagination.page}
        totalPages={credentialPagination.totalPages}
        total={credentialPagination.total}
        pageSize={credentialPagination.pageSize}
        visibleStart={credentialPagination.visibleStart}
        visibleEnd={credentialPagination.visibleEnd}
        onPageChange={credentialPagination.setPage}
        onPageSizeChange={credentialPagination.setPageSize}
        pageSizeOptions={[10, 20, 50]}
        itemLabel={t("admin.pagination.credentials", { defaultValue: "凭证" })}
        compact
      />
    </>
  );
}
