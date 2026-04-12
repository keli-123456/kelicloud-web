import * as React from "react";
import { z } from "zod";
import { Pencil } from "lucide-react";
import { t } from "i18next";
import { toast } from "sonner";

import {
  schema,
  type ClientFormData,
} from "@/components/admin/NodeTable/schema/node";
import { DataTableRefreshContext } from "@/components/admin/NodeTable/schema/DataTableRefreshContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormActions,
  FormField,
  FormSection,
  FormShell,
} from "@/components/ui/form-shell";
import { EditDialogShell } from "@/components/ui/modal-shell";

const NODE_INPUT_CLASS =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-[14px] shadow-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export function EditDialog({ item }: { item: z.infer<typeof schema> }) {
  const [form, setForm] = React.useState<ClientFormData & { weight: number }>({
    name: item.name || "",
    token: item.token || "",
    remark: item.remark || "",
    public_remark: item.public_remark || "",
    weight: item.weight || 0,
  });
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const refreshTable = React.useContext(DataTableRefreshContext);

  const saveClientData = (
    uuid: string,
    formData: ClientFormData,
    setLoadingCallback: (b: boolean) => void,
    onSuccess?: () => void,
  ) => {
    setLoadingCallback(true);
    fetch(`/api/admin/client/${uuid}/edit`, {
      method: "POST",
      body: JSON.stringify(formData),
    })
      .then(async (res) => {
        if (onSuccess) onSuccess();
        if (res.status === 200) {
          if (refreshTable) refreshTable();
          toast.success(t("admin.nodeEdit.saveSuccess", "Save Successful"));
        } else {
          toast.error(t("admin.nodeEdit.saveError", "Save Failed"));
        }
      })
      .catch(() => {
        toast.error(t("admin.nodeEdit.saveError", "Save Failed"));
      })
      .finally(() => setLoadingCallback(false));
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("admin.nodeEdit.editInfo", "Edit information")}
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-4" />
      </Button>

      <EditDialogShell
        open={open}
        onOpenChange={setOpen}
        size="lg"
        title={t("admin.nodeEdit.editInfo", "Edit information")}
        description={t(
          "admin.nodeEdit.description",
          "Adjust node identity and notes used across list, detail, and public views.",
        )}
        footer={(
          <FormActions>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={loading}
              onClick={() => setOpen(false)}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={loading}
              onClick={() => {
                const payload: ClientFormData = {
                  name: form.name,
                  token: form.token,
                  remark: form.remark,
                  public_remark: form.public_remark,
                };
                saveClientData(item.uuid, payload, setLoading, () => setOpen(false));
              }}
            >
              {loading
                ? t("admin.nodeEdit.waiting", "Wait...")
                : t("admin.nodeEdit.save", "Save")}
            </Button>
          </FormActions>
        )}
      >
        <FormShell>
          <FormSection
            title={t("admin.nodeEdit.identity", "Identity")}
            description={t(
              "admin.nodeEdit.identity_description",
              "Keep name and notes consistent for list/detail/public displays.",
            )}
          >
            <FormField
              label={t("admin.nodeEdit.name", "Name")}
              htmlFor={`node-edit-name-${item.uuid}`}
            >
              <Input
                id={`node-edit-name-${item.uuid}`}
                className={NODE_INPUT_CLASS}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder={t("admin.nodeEdit.namePlaceholder", "Please enter a name")}
                disabled={loading}
              />
            </FormField>
          </FormSection>

          <FormSection
            advanced
            title={t("admin.nodeEdit.token", "Token")}
            toggleLabel={t("admin.nodeEdit.advanced", "Advanced")}
          >
            <FormField
              label={t("admin.nodeEdit.token", "Token")}
              htmlFor={`node-edit-token-${item.uuid}`}
              description={t(
                "admin.nodeEdit.token_readonly",
                "Token is read-only in this panel.",
              )}
            >
              <Input
                id={`node-edit-token-${item.uuid}`}
                className={`${NODE_INPUT_CLASS} bg-slate-100 dark:bg-slate-900`}
                value={form.token}
                readOnly
                disabled={loading}
              />
            </FormField>
          </FormSection>

          <FormSection
            title={t("admin.nodeEdit.notes", "Notes")}
            description={t(
              "admin.nodeEdit.notes_description",
              "Private notes stay internal. Public notes are visible in user-facing context.",
            )}
          >
            <FormField
              label={t("admin.nodeEdit.remark", "Private Notes")}
              htmlFor={`node-edit-remark-${item.uuid}`}
            >
              <Input
                id={`node-edit-remark-${item.uuid}`}
                className={NODE_INPUT_CLASS}
                value={form.remark}
                onChange={(event) =>
                  setForm((current) => ({ ...current, remark: event.target.value }))
                }
                placeholder={t(
                  "admin.nodeEdit.remarkPlaceholder",
                  "Please enter private notes",
                )}
                disabled={loading}
              />
            </FormField>
            <FormField
              label={t("admin.nodeEdit.publicRemark", "Public Notes")}
              htmlFor={`node-edit-public-remark-${item.uuid}`}
            >
              <Input
                id={`node-edit-public-remark-${item.uuid}`}
                className={NODE_INPUT_CLASS}
                value={form.public_remark}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    public_remark: event.target.value,
                  }))
                }
                placeholder={t(
                  "admin.nodeEdit.publicRemarkPlaceholder",
                  "Please enter public notes",
                )}
                disabled={loading}
              />
            </FormField>
          </FormSection>
        </FormShell>
      </EditDialogShell>
    </>
  );
}
