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

const AddButton = () => {
  const { t } = useTranslation();
  const [isOpen, setOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const { addCommand } = useCommandClipboard();

  const handleAddCommand = async (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const name = formData.get("name") as string;
    const text = formData.get("text") as string;
    const remark = formData.get("remark") as string;
    const weight = formData.get("weight") as string;

    try {
      setAdding(true);
      await addCommand(name, text, remark, weight ? parseInt(weight) : 0);
      setOpen(false);
      toast.success(t("common.added_successfully"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="icon" aria-label="Add Command">
          <PlusIcon size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t("common.add")}</DialogTitle>
        <form onSubmit={handleAddCommand}>
          <div className="flex flex-col gap-2">
            <label htmlFor="name">{t("common.name")}</label>
            <Input
              id="name"
              name="name"
              defaultValue={Math.random().toString(36).substring(7)}
            />
            <label htmlFor="text">{t("common.content")}</label>
            <Textarea id="text" name="text" />
            <label htmlFor="remark">{t("common.remark")}</label>
            <Input id="remark" name="remark" />
            <label htmlFor="weight">{t("common.weight")}</label>
            <Input defaultValue={0} type="number" id="weight" name="weight" />
            <Button type="submit" disabled={adding}>
              {t("common.add")}
            </Button>
          </div>
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

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const newName = formData.get("name") as string;
    const newText = formData.get("text") as string;
    const newRemark = formData.get("remark") as string;
    const nextWeight = formData.get("weight") as string;
    try {
      setUpdating(true);
      await updateCommand(
        id,
        newName,
        newText,
        newRemark,
        nextWeight ? parseInt(nextWeight) : 0,
      );
      setOpen(false);
      toast.success(t("common.updated_successfully"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="icon" aria-label="Edit Command">
          <Edit2Icon size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t("common.edit")}</DialogTitle>
        <form onSubmit={handleUpdate}>
          <div className="flex flex-col gap-2">
            <label htmlFor="name">{t("common.name")}</label>
            <Input id="name" name="name" defaultValue={name} />
            <label htmlFor="text">{t("common.content")}</label>
            <Textarea id="text" name="text" defaultValue={text} />
            <label htmlFor="remark">{t("common.remark")}</label>
            <Input id="remark" name="remark" defaultValue={remark} />
            <label htmlFor="weight">{t("common.weight")}</label>
            <Input type="number" id="weight" name="weight" defaultValue={weight} />
            <div className="mt-4 flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">{t("common.cancel")}</Button>
              </DialogClose>
              <Button type="submit" disabled={updating}>
                {t("common.update")}
              </Button>
            </div>
          </div>
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
