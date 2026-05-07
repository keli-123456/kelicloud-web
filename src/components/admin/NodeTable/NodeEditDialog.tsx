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
  "max-h-[90vh] w-[min(96vw,720px)] overflow-y-auto overscroll-contain rounded-lg border border-border bg-card p-6 shadow-xl shadow-slate-900/10 [scrollbar-gutter:stable]";
const NODE_DIALOG_SECTION_CLASS = "dialog-section space-y-4";
const NODE_DIALOG_FOOTER_CLASS =
  "mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end";
const NODE_INPUT_CLASS =
  "h-11 rounded-md border border-border bg-muted/35 px-3 text-[14px] shadow-none hover:bg-card";

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
          Adjust the node identity and remarks shown across the management console.
        </Dialog.Description>
        <div className="mt-4 flex flex-col gap-4">
          <div className={NODE_DIALOG_SECTION_CLASS}>
            <div>
              <div className="section-kicker">Identity</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep naming and notes consistent so list view, details view, and public
                labels all read as one system.
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
              <div className="section-kicker">Notes</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Private notes stay internal. Public notes travel with the node into
                user-facing surfaces.
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
              {t("common.cancel", "Cancel")}
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
              : t("admin.nodeEdit.save", "Save")}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
