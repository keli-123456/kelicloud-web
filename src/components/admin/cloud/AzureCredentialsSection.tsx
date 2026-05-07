import type { TFunction } from "i18next";
import { CheckCircle2, Eye, KeyRound, MoreHorizontal, PencilLine, Trash2 } from "lucide-react";

import {
  AdminPagination,
  useClientPagination,
} from "@/components/admin/AdminPagination";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
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
  cloudTableScrollClassName,
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
              {t("cloud.providers.azure.credentials", "Credentials")}
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
            {t("cloud.providers.azure.check", "Check")}
          </Button>
        </Flex>
      </div>
      <div className="p-5">
        {!credentialRows.length ? (
          <AdminEmptyState
            icon={<KeyRound className="h-5 w-5" />}
            title={t("cloud.providers.azure.credentials_empty", "No Azure credentials saved yet")}
            description={t(
              "cloud.providers.azure.credentials_empty_description",
              "Import an Azure service principal to choose a subscription, set a default location, and manage virtual machines.",
            )}
            actions={(
              <Button size="1" onClick={onImportCredentials}>
                <KeyRound className="mr-2 h-4 w-4" />
                {t("cloud.providers.azure.import", "Import Credentials")}
              </Button>
            )}
            className={cloudTableEmptyStateClassName}
          />
        ) : (
          <div className={cloudTableScrollClassName}>
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("cloud.table.name", "Name")}</TableHead>
                  <TableHead>{t("cloud.tokens.group", "Group")}</TableHead>
                  <TableHead>{t("cloud.providers.azure.subscription", "Subscription")}</TableHead>
                  <TableHead>{t("cloud.table.region", "Region")}</TableHead>
                  <TableHead>{t("cloud.table.status", "Status")}</TableHead>
                  <TableHead>{t("cloud.providers.azure.checked_at", "Last Checked")}</TableHead>
                  <TableHead className="text-right">{t("common.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCredentialRows.map((credential) => (
                  <TableRow key={credential.id}>
                    <TableCell className="align-top">
                      <div className={`${cloudTablePrimaryTextClassName} ${cloudLongTextClassName}`}>
                        {credential.name}
                      </div>
                      <div className={`mt-1 ${cloudTableSecondaryTextClassName}`}>
                        {credential.masked_client_id || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {credential.group || "-"}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className={cloudLongTextClassName}>
                        {credential.subscription_display_name || credential.subscription_id || "-"}
                      </div>
                      {credential.subscription_display_name && credential.subscription_id ? (
                        <div className={`mt-1 ${cloudTableSecondaryTextClassName}`}>
                          {credential.subscription_id}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="align-top">
                      {getLocationLabel(catalog, credential.default_location)}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-2">
                        <Badge color={getCredentialStatusColor(credential.last_status)}>
                          {getCloudStatusLabel(credential.last_status, t)}
                        </Badge>
                        {credential.is_active ? (
                          <div>
                            <Badge color="blue">{t("cloud.active", "Active")}</Badge>
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {formatDateTime(credential.last_checked_at)}
                      {credential.last_error ? (
                        <div className={`mt-1 text-xs text-red-600 dark:text-red-400 ${cloudLongTextClassName}`}>
                          {credential.last_error}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <div className="flex justify-end gap-2">
                        {!credential.is_active ? (
                          <Button variant="outline" size="sm" onClick={() => void onSelectCredential(credential)}>
                            {t("cloud.select", "Select")}
                          </Button>
                        ) : null}
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
                            <DropdownMenuItem onSelect={() => onOpenGroupEditor(credential)}>
                              <PencilLine className="h-4 w-4" />
                              {t("cloud.tokens.set_group", "Set Group")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => void onViewCredential(credential)}>
                              <Eye className="h-4 w-4" />
                              {t("cloud.view", "View")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => void onDeleteCredential(credential)}
                            >
                              <Trash2 className="h-4 w-4" />
                              {t("cloud.delete", "Delete")}
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
