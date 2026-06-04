import * as React from "react";
import { z } from "zod";
import {
  schema,
  type ClientFormData,
} from "@/components/admin/NodeTable/schema/node";
import { DataTableRefreshContext } from "@/components/admin/NodeTable/schema/DataTableRefreshContext";
import { Pencil } from "lucide-react";
import { t } from "i18next";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  IconButton,
  TextField,
} from "@/components/admin/admin-ui";
import {
  ADMIN_FORM_BODY_CLASS,
  ADMIN_FORM_DIALOG_CHROME_CLASS,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_FOOTER_CLASS,
  ADMIN_FORM_HEADER_CLASS,
  ADMIN_FORM_HEADER_INSET_CLASS,
  ADMIN_FORM_HELP_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_SECTION_CLASS,
} from "@/components/admin/AdminFormStyles";
import { cn } from "@/lib/utils";

const NODE_DIALOG_CONTENT_CLASS =
  cn(
    "flex max-h-[min(90vh,calc(100dvh-1.5rem))] w-[calc(100vw-1.5rem)] max-w-[720px] flex-col overflow-hidden",
    ADMIN_FORM_DIALOG_CHROME_CLASS,
  );
const NODE_INPUT_CLASS =
  "h-10 rounded-md border border-input bg-[var(--surface)] px-3 text-[14px] shadow-none hover:bg-[var(--surface-hover)]";

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
  const editLabel = t("admin.nodeEdit.editInfo", "Edit information");

  function saveClientData(
    uuid: string,
    formData: ClientFormData,
    setLoadingCallback: (b: boolean) => void,
    onSuccess?: () => void
  ) {
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
  }
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton
          variant="ghost"
          title={editLabel}
          aria-label={editLabel}
          onClick={(event) => event.stopPropagation()}
        >
          <Pencil className="p-1" />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content className={NODE_DIALOG_CONTENT_CLASS}>
        <div className={ADMIN_FORM_HEADER_CLASS}>
          <div className={ADMIN_FORM_HEADER_INSET_CLASS}>
            <Dialog.Title>{editLabel}</Dialog.Title>
            <Dialog.Description>
              {t("admin.nodeEdit.editDescription", "调整节点身份和备注，在管理后台中的展示会同步更新。")}
            </Dialog.Description>
          </div>
        </div>
        <div className={cn(ADMIN_FORM_BODY_CLASS, "space-y-4")}>
          <div className={cn(ADMIN_FORM_SECTION_CLASS, "space-y-4")}>
            <div>
              <div className="section-kicker">
                {t("admin.nodeEdit.identity")}
              </div>
              <p className={cn("mt-1", ADMIN_FORM_HELP_CLASS)}>
                {t("admin.nodeEdit.identityHint")}
              </p>
            </div>
            <div className={ADMIN_FORM_FIELD_CLASS}>
              <label className={ADMIN_FORM_LABEL_CLASS}>
              {t("admin.nodeEdit.name", "Name")}
              </label>
              <TextField.Root
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("admin.nodeEdit.namePlaceholder", "Please enter a name")}
                disabled={loading}
                className={NODE_INPUT_CLASS}
              />
            </div>
            <div className={ADMIN_FORM_FIELD_CLASS}>
              <label className={ADMIN_FORM_LABEL_CLASS}>
              {t("admin.nodeEdit.token", "Token")}
              </label>
              <TextField.Root
                value={form.token}
                onChange={(e) =>
                  setForm((f) => ({ ...f, token: e.target.value }))
                }
                placeholder={t("admin.nodeEdit.tokenPlaceholder", "Please enter Token")}
                disabled={loading}
                readOnly
                className={`${NODE_INPUT_CLASS} bg-slate-100 dark:bg-slate-900`}
              />
            </div>
          </div>
          <div className={cn(ADMIN_FORM_SECTION_CLASS, "space-y-4")}>
            <div>
              <div className="section-kicker">
                {t("admin.nodeEdit.notes")}
              </div>
              <p className={cn("mt-1", ADMIN_FORM_HELP_CLASS)}>
                {t("admin.nodeEdit.notesHint")}
              </p>
            </div>
            <div className={ADMIN_FORM_FIELD_CLASS}>
              <label className={ADMIN_FORM_LABEL_CLASS}>
              {t("admin.nodeEdit.remark", "Private Notes")}
              </label>
              <TextField.Root
                value={form.remark}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remark: e.target.value }))
                }
                placeholder={t(
                  "admin.nodeEdit.remarkPlaceholder",
                  "Please enter private notes"
                )}
                disabled={loading}
                className={NODE_INPUT_CLASS}
              />
            </div>
            <div className={ADMIN_FORM_FIELD_CLASS}>
              <label className={ADMIN_FORM_LABEL_CLASS}>
              {t("admin.nodeEdit.publicRemark", "Public Notes")}
              </label>
              <TextField.Root
                value={form.public_remark}
                onChange={(e) =>
                  setForm((f) => ({ ...f, public_remark: e.target.value }))
                }
                placeholder={t(
                  "admin.nodeEdit.publicRemarkPlaceholder",
                  "Please enter public notes"
                )}
                disabled={loading}
                className={NODE_INPUT_CLASS}
              />
            </div>
          </div>
        </div>
        <div className={ADMIN_FORM_FOOTER_CLASS}>
          <Dialog.Close>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={loading}
            >
              {t("common.cancel", "取消")}
            </Button>
          </Dialog.Close>
          <Button
            type="submit"
            className="w-full sm:w-auto"
            onClick={() => {
              const payload: ClientFormData = {
                name: form.name,
                token: form.token,
                remark: form.remark,
                public_remark: form.public_remark,
              };
              saveClientData(item.uuid, payload, setLoading, () =>
                setOpen(false)
              );
            }}
            disabled={loading}
          >
            {loading
              ? t("admin.nodeEdit.waiting", "Wait...")
              : t("admin.nodeEdit.save", "保存")}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
