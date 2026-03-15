import CommandLibraryManager from "@/components/admin/scripts/CommandLibraryManager";
import { CommandClipboardProvider } from "@/contexts/CommandClipboardContext";

export default function ScriptsPage() {
  return (
    <CommandClipboardProvider>
      <CommandLibraryManager />
    </CommandClipboardProvider>
  );
}
