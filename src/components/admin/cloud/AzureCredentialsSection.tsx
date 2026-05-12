import type { TFunction } from "i18next";
import { CheckCircle2, Eye, KeyRound, PencilLine, Trash2 } from "lucide-react";

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
import type {
  AzureCatalog,
  AzureCredentialPool,
  AzureCredentialRecord,
} from "@/lib/cloudAzure";
import { getCloudStatusLabel } from "@/lib/cloudStatus";
import {
  Badge,
  Button,
  cloudLongTextClassName,
  cloudPanelCardClassName,
  cloudPanelDescriptionClassName,
  cloudPanelHeaderClassName,
  cloudPanelTitleClassName,
  cloudTableEmptyStateClassName,
  cloudTablePrimaryTextClassName,
  cloudTableSecondaryTextClassName,
  Flex,
} from "@/components/admin/cloud/cloud-ui";
import {
  formatDateTime,
  getCredentialStatusColor,
  getLocationLabel,
} from "./azurePanelUtils";

type MaybePromise<T> = T | Promise<T>;

type AzureCredentialsSectionProps = {
  t: TFunction;
  credentialPool: AzureCredentialPool | null;
  catalog: AzureCatalog | null;
  checkingCredentialsState: boolean;
  onImportCredentials: () => void;
  onCheckCredentials: () => MaybePromise<void>;
  onSelectCredential: (credential: AzureCredentialRecord) => MaybePromise<void>;
  onOpenGroupEditor: (credential: AzureCredentialRecord) => void;
  onViewCredential: (credential: AzureCredentialRecord) => MaybePromise<void>;
  onDeleteCredential: (credential: AzureCredentialRecord) => MaybePromise<void>;
};

export function AzureCredentialsSection({
  t,
  credentialPool,
  catalog,
  checkingCredentialsState,
  onImportCredentials,
  onCheckCredentials,
  onSelectCredential,
  onOpenGroupEditor,
  onViewCredential,
  onDeleteCredential,
}: AzureCredentialsSectionProps) {
  const credentialRows = credentialPool?.credentials ?? [];
  const credentialPagination = useClientPagination(credentialRows, {
    initialPageSize: 10,
  });
  const visibleCredentialRows = credentialPagination.pageItems;

  return (
    <section className={cloudPanelCardClassName}>
      <div className={cloudPanelHeaderClassName}>
        <Flex justify="between" align="center" wrap="wrap" gap="2">
          <div>
            <div className={cloudPanelTitleClassName}>
              {t("cloud.providers.azure.credentials", "凭证")}
            </div>
            <div className={cloudPanelDescriptionClassName}>
              {t(
                "cloud.providers.azure.credentials_description",
                "Save multiple Azure app credentials, choose the active subscription, and bulk-check whether they can still call the Azure Resource Manager API.",
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => void onCheckCredentials()}
            disabled={!credentialPool?.credentials.length || checkingCredentialsState}
          >
            <CheckCircle2 className={`mr-2 h-4 w-4${checkingCredentialsState ? " animate-spin" : ""}`} />
            {t("cloud.providers.azure.check", "检查")}
          </Button>
        </Flex>
      </div>
      <div className="p-5">
        {!credentialRows.length ? (
          <AdminEmptyState
            icon={<KeyRound className="h-5 w-5" />}
            title={t("cloud.providers.azure.credentials_empty", "尚未保存 Azure 凭证")}
            description={t(
              "cloud.providers.azure.credentials_empty_description",
              "Import an Azure service principal to choose a subscription, set a default location, and manage virtual machines.",
            )}
            actions={(
              <Button size="1" onClick={onImportCredentials}>
                <KeyRound className="mr-2 h-4 w-4" />
                {t("cloud.providers.azure.import", "导入凭证")}
              </Button>
            )}
            className={cloudTableEmptyStateClassName}
          />
        ) : (
          <AdminDataTableScroll>
            <AdminDataTable minWidth={980}>
              <thead>
                <AdminDataTableHeadRow>
                  <AdminDataTableHead>{t("cloud.table.name", "名称")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.tokens.group", "分组")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.providers.azure.subscription", "订阅")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.table.region", "地区")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.table.status", "状态")}</AdminDataTableHead>
                  <AdminDataTableHead>{t("cloud.providers.azure.checked_at", "最后检查")}</AdminDataTableHead>
                  <AdminDataTableHead align="right" sticky="right">{t("common.actions", "操作")}</AdminDataTableHead>
                </AdminDataTableHeadRow>
              </thead>
              <tbody>
                {visibleCredentialRows.map((credential) => (
                  <AdminDataTableRow key={credential.id}>
                    <AdminDataTableCell className="align-top">
                      <div className={`${cloudTablePrimaryTextClassName} ${cloudLongTextClassName}`}>
                        {credential.name}
                      </div>
                      <div className={`mt-1 ${cloudTableSecondaryTextClassName}`}>
                        {credential.masked_client_id || "-"}
                      </div>
                    </AdminDataTableCell>
                    <AdminDataTableCell className="align-top">
                      {credential.group || "-"}
                    </AdminDataTableCell>
                    <AdminDataTableCell className="align-top">
                      <div className={cloudLongTextClassName}>
                        {credential.subscription_display_name || credential.subscription_id || "-"}
                      </div>
                      {credential.subscription_display_name && credential.subscription_id ? (
                        <div className={`mt-1 ${cloudTableSecondaryTextClassName}`}>
                          {credential.subscription_id}
                        </div>
                      ) : null}
                    </AdminDataTableCell>
                    <AdminDataTableCell className="align-top">
                      {getLocationLabel(catalog, credential.default_location)}
                    </AdminDataTableCell>
                    <AdminDataTableCell className="align-top">
                      <div className="space-y-2">
                        <Badge color={getCredentialStatusColor(credential.last_status)}>
                          {getCloudStatusLabel(credential.last_status, t)}
                        </Badge>
                        {credential.is_active ? (
                          <div>
                            <Badge color="blue">{t("cloud.active", "已激活")}</Badge>
                          </div>
                        ) : null}
                      </div>
                    </AdminDataTableCell>
                    <AdminDataTableCell className="align-top">
                      {formatDateTime(credential.last_checked_at)}
                      {credential.last_error ? (
                        <div className={`mt-1 text-xs text-red-600 dark:text-red-400 ${cloudLongTextClassName}`}>
                          {credential.last_error}
                        </div>
                      ) : null}
                    </AdminDataTableCell>
                    <AdminDataTableCell className="align-top" align="right" sticky="right">
                      <AdminRowActions
                        label={t("common.action", "操作")}
                        actions={[
                          {
                            label: t("cloud.select", "选择"),
                            icon: <CheckCircle2 className="h-4 w-4" />,
                            hidden: credential.is_active,
                            onSelect: () => void onSelectCredential(credential),
                          },
                          {
                            label: t("cloud.tokens.set_group", "设置分组"),
                            icon: <PencilLine className="h-4 w-4" />,
                            onSelect: () => onOpenGroupEditor(credential),
                          },
                          {
                            label: t("cloud.view", "查看"),
                            icon: <Eye className="h-4 w-4" />,
                            onSelect: () => void onViewCredential(credential),
                          },
                          {
                            label: t("cloud.delete", "删除"),
                            icon: <Trash2 className="h-4 w-4" />,
                            destructive: true,
                            onSelect: () => void onDeleteCredential(credential),
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
        page={credentialPagination.page}
        totalPages={credentialPagination.totalPages}
        total={credentialPagination.total}
        pageSize={credentialPagination.pageSize}
        visibleStart={credentialPagination.visibleStart}
        visibleEnd={credentialPagination.visibleEnd}
        onPageChange={credentialPagination.setPage}
        onPageSizeChange={credentialPagination.setPageSize}
        pageSizeOptions={[10, 20, 50]}
        itemLabel={t("admin.pagination.credentials", { defaultValue: "credentials" })}
        compact
      />
    </section>
  );
}
