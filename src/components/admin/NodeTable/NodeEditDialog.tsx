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
  Flex,
  IconButton,
  TextField,
} from "@/components/admin/admin-ui";

const NODE_DIALOG_CONTENT_CLASS =
  "max-h-[90vh] w-[min(96vw,720px)] overflow-y-auto overscroll-contain rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.9)] [scrollbar-gutter:stable] dark:border-slate-800 dark:bg-slate-950";
const NODE_DIALOG_SECTION_CLASS =
  "space-y-4 rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/35";
const NODE_DIALOG_FOOTER_CLASS =
  "sticky bottom-0 -mx-5 -mb-5 mt-5 flex flex-col-reverse gap-2 border-t border-slate-200/80 bg-white/95 px-5 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:flex-row sm:justify-end";
const NODE_INPUT_CLASS =
  "h-10 rounded-lg border border-slate-200/80 bg-white px-3 text-[14px] shadow-sm shadow-slate-900/5 hover:bg-white dark:border-slate-800 dark:bg-slate-950";

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
        <IconButton variant="ghost">
          <Pencil className="p-1" />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content className={NODE_DIALOG_CONTENT_CLASS}>
        <Dialog.Title>{t("admin.nodeEdit.editInfo", "Edit information")}</Dialog.Title>
        <Dialog.Description className="mt-2">
          {t("admin.nodeEdit.editDescription", "调整节点身份和备注，在管理后台中的展示会同步更新。")}
        </Dialog.Description>
        <div className="mt-4 flex flex-col gap-4">
          <div className={NODE_DIALOG_SECTION_CLASS}>
            <div>
              <div className="section-kicker">
                {t("admin.nodeEdit.identity")}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("admin.nodeEdit.identityHint")}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
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
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
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
          <div className={NODE_DIALOG_SECTION_CLASS}>
            <div>
              <div className="section-kicker">
                {t("admin.nodeEdit.notes")}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("admin.nodeEdit.notesHint")}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
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
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
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
        <Flex gap="2" align={"start"} className={NODE_DIALOG_FOOTER_CLASS}>
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
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
