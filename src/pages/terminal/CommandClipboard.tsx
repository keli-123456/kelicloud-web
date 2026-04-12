import React from "react";
import { Edit2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import LanguageSwitch from "@/components/Language";
import Loading from "@/components/loading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FormActions,
  FormErrorText,
  FormField,
  FormSection,
  FormShell,
} from "@/components/ui/form-shell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CommandClipboardProvider,
  useCommandClipboard,
  type CommandClipboard,
} from "@/contexts/CommandClipboardContext";
import { useTerminal } from "@/contexts/TerminalContext";

const CommandClipboardPanel = ({ ...props }: { [key: string]: any }) => {
  const InnerLayout = () => {
    const { t } = useTranslation();
    const { commands, loading, error } = useCommandClipboard();
    if (loading) {
      return <Loading />;
    }
    if (error) {
      return <div>Error loading commands: {error.message}</div>;
    }
    return (
      <div
        {...props}
        style={{ height: "100%" }}
        className="command-clipboard-container flex flex-col gap-2 overflow-x-clip overflow-y-scroll"
      >
        <div>
          <label className="text-lg font-semibold">
            {t("command_clipboard.title")}
          </label>
        </div>
        <div className="mr-2 flex items-center justify-between">
          <AddButton />
          <LanguageSwitch />
        </div>

        {commands
          .sort((a, b) => b.weight - a.weight)
          .map((item) => (
            <CommandCard key={item.id} {...item} />
          ))}
      </div>
    );
  };
  return (
    <CommandClipboardProvider>
      <InnerLayout />
    </CommandClipboardProvider>
  );
};

type CommandFormErrors = Partial<{
  name: string;
  text: string;
  weight: string;
  form: string;
}>;

const AddButton = () => {
  const { t } = useTranslation();
  const [isOpen, setOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [errors, setErrors] = React.useState<CommandFormErrors>({});
  const { addCommand } = useCommandClipboard();

  const handleAddCommand = async (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const name = String(formData.get("name") || "");
    const text = String(formData.get("text") || "");
    const remark = formData.get("remark") as string;
    const weight = String(formData.get("weight") || "");
    const nextErrors: CommandFormErrors = {};
    if (!name.trim()) {
      nextErrors.name = t("common.name_required", { defaultValue: "Name is required." });
    }
    if (!text.trim()) {
      nextErrors.text = t("common.content_required", { defaultValue: "Content is required." });
    }
    const parsedWeight = Number.parseInt(weight, 10);
    if (weight.trim() && !Number.isFinite(parsedWeight)) {
      nextErrors.weight = t("common.weight_invalid", {
        defaultValue: "Weight must be an integer.",
      });
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setAdding(true);
      await addCommand(name, text, remark, weight ? parsedWeight : 0);
      setOpen(false);
      setErrors({});
      toast.success(t("common.added_successfully"));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        form: error instanceof Error ? error.message : t("common.operation_failed", "Operation failed"),
      }));
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) {
          setErrors({});
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="icon" aria-label="Add Command">
          <PlusIcon size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t("common.add")}</DialogTitle>
        <form onSubmit={handleAddCommand} className="space-y-4">
          <FormShell>
            <FormSection>
              <FormField
                label={t("common.name")}
                htmlFor="command-add-name"
                required
                error={errors.name}
              >
                <Input
                  id="command-add-name"
                  name="name"
                  defaultValue={Math.random().toString(36).substring(7)}
                />
              </FormField>
              <FormField
                label={t("common.content")}
                htmlFor="command-add-text"
                required
                error={errors.text}
              >
                <Textarea id="command-add-text" name="text" className="min-h-28" />
              </FormField>
            </FormSection>

            <FormSection
              advanced
              title={t("common.advanced", { defaultValue: "Advanced" })}
              toggleLabel={t("common.advanced", { defaultValue: "Advanced" })}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t("common.remark")} htmlFor="command-add-remark">
                  <Input id="command-add-remark" name="remark" />
                </FormField>
                <FormField
                  label={t("common.weight")}
                  htmlFor="command-add-weight"
                  error={errors.weight}
                  description={t("command_clipboard.weight_hint", {
                    defaultValue: "Larger numbers appear first in the list.",
                  })}
                >
                  <Input defaultValue={0} type="number" id="command-add-weight" name="weight" />
                </FormField>
              </div>
            </FormSection>
          </FormShell>

          {errors.form ? <FormErrorText>{errors.form}</FormErrorText> : null}

          <FormActions>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={adding}>
              {adding ? t("loading") : t("common.add")}
            </Button>
          </FormActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const DeleteButton = ({ id }: { id: number }) => {
  const { t } = useTranslation();
  const { deleteCommand } = useCommandClipboard();
  const [isOpen, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteCommand(id);
      toast.success(t("common.deleted_successfully"));
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          aria-label="Delete Command"
        >
          <Trash2Icon size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t("common.delete")}</DialogTitle>
        <DialogDescription>{t("common.confirm_delete")}</DialogDescription>
        <div className="mt-4 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">{t("common.cancel")}</Button>
          </DialogClose>
          <Button onClick={handleDelete} disabled={deleting} variant="destructive">
            {t("common.delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EditButton = ({ id, name, text, remark, weight }: CommandClipboard) => {
  const { t } = useTranslation();
  const { updateCommand } = useCommandClipboard();
  const [isOpen, setOpen] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [errors, setErrors] = React.useState<CommandFormErrors>({});

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const newName = String(formData.get("name") || "");
    const newText = String(formData.get("text") || "");
    const newRemark = formData.get("remark") as string;
    const nextWeight = String(formData.get("weight") || "");
    const nextErrors: CommandFormErrors = {};
    if (!newName.trim()) {
      nextErrors.name = t("common.name_required", { defaultValue: "Name is required." });
    }
    if (!newText.trim()) {
      nextErrors.text = t("common.content_required", { defaultValue: "Content is required." });
    }
    const parsedWeight = Number.parseInt(nextWeight, 10);
    if (nextWeight.trim() && !Number.isFinite(parsedWeight)) {
      nextErrors.weight = t("common.weight_invalid", {
        defaultValue: "Weight must be an integer.",
      });
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    try {
      setUpdating(true);
      await updateCommand(
        id,
        newName,
        newText,
        newRemark,
        nextWeight ? parsedWeight : 0,
      );
      setOpen(false);
      setErrors({});
      toast.success(t("common.updated_successfully"));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        form: error instanceof Error ? error.message : t("common.operation_failed", "Operation failed"),
      }));
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) {
          setErrors({});
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="icon" aria-label="Edit Command">
          <Edit2Icon size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t("common.edit")}</DialogTitle>
        <form onSubmit={handleUpdate} className="space-y-4">
          <FormShell>
            <FormSection>
              <FormField
                label={t("common.name")}
                htmlFor={`command-edit-name-${id}`}
                required
                error={errors.name}
              >
                <Input id={`command-edit-name-${id}`} name="name" defaultValue={name} />
              </FormField>
              <FormField
                label={t("common.content")}
                htmlFor={`command-edit-text-${id}`}
                required
                error={errors.text}
              >
                <Textarea
                  id={`command-edit-text-${id}`}
                  name="text"
                  defaultValue={text}
                  className="min-h-28"
                />
              </FormField>
            </FormSection>

            <FormSection
              advanced
              title={t("common.advanced", { defaultValue: "Advanced" })}
              toggleLabel={t("common.advanced", { defaultValue: "Advanced" })}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t("common.remark")} htmlFor={`command-edit-remark-${id}`}>
                  <Input id={`command-edit-remark-${id}`} name="remark" defaultValue={remark} />
                </FormField>
                <FormField
                  label={t("common.weight")}
                  htmlFor={`command-edit-weight-${id}`}
                  error={errors.weight}
                  description={t("command_clipboard.weight_hint", {
                    defaultValue: "Larger numbers appear first in the list.",
                  })}
                >
                  <Input
                    type="number"
                    id={`command-edit-weight-${id}`}
                    name="weight"
                    defaultValue={weight}
                  />
                </FormField>
              </div>
            </FormSection>
          </FormShell>

          {errors.form ? <FormErrorText>{errors.form}</FormErrorText> : null}

          <FormActions>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={updating}>
              {updating ? t("loading") : t("common.update")}
            </Button>
          </FormActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const CommandCard = (item: CommandClipboard) => {
  const { t } = useTranslation();
  const { sendCommand } = useTerminal();
  return (
    <div>
      <Card className="gap-0 px-4 py-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-lg font-semibold">{item.name}</label>
            <Button onClick={() => sendCommand(item.text)}>
              {t("common.execute")}
            </Button>
          </div>
          <pre
            className="command-text overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-sm"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {item.text.length > 300
              ? item.text.substring(0, 300) +
                `\n...(${t("common.have_been_omitted", {
                  count: item.text.length - 300,
                })})`
              : item.text}
          </pre>
          <label className="text-sm text-gray-500">{item.remark}</label>
          <div className="flex justify-end gap-2">
            <EditButton {...item} />
            <DeleteButton id={item.id} />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CommandClipboardPanel;
