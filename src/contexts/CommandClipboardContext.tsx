import React from "react";

export type CommandClipboard = {
  id: number;
  text: string;
  name: string;
  remark: string;
  weight: number;
  created_at: string;
  updated_at: string;
};

interface CommandClipboardContextType {
  commands: CommandClipboard[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addCommand: (
    name: string,
    text: string,
    remark: string,
    weight: number,
  ) => Promise<void>;
  updateCommand: (
    id: number,
    name: string,
    text: string,
    remark: string,
    weight: number,
  ) => Promise<void>;
  deleteCommand: (id: number) => Promise<void>;
}

const CommandClipboardContext = React.createContext<
  CommandClipboardContextType | undefined
>(undefined);

const toError = (error: unknown, fallback: string) =>
  error instanceof Error ? error : new Error(fallback);

export const CommandClipboardProvider: React.FC<{
  children: React.ReactNode;
  autoLoad?: boolean;
  refreshAfterMutations?: boolean;
}> = ({
  children,
  autoLoad = true,
  refreshAfterMutations = true,
}) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [commands, setCommands] = React.useState<CommandClipboard[]>([]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/clipboard");
      if (!response.ok) {
        throw new Error("Failed to fetch commands");
      }
      const resp = await response.json();
      if (resp && Array.isArray(resp.data)) {
        setCommands(resp.data);
      } else {
        setCommands([]);
      }
    } catch (err) {
      const nextError = toError(err, "Failed to fetch commands");
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  const addCommand = React.useCallback(async (
    name: string,
    text: string,
    remark: string,
    weight: number,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/clipboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, text, remark, weight }),
      });
      if (!response.ok) {
        throw new Error("Failed to add command");
      }
      if (refreshAfterMutations) {
        await refresh();
      }
    } catch (err) {
      const nextError = toError(err, "Failed to add command");
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [refresh, refreshAfterMutations]);

  const updateCommand = React.useCallback(async (
    id: number,
    name: string,
    text: string,
    remark: string,
    weight: number,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/clipboard/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, text, remark, weight }),
      });
      if (!response.ok) {
        throw new Error("Failed to update command");
      }
      if (refreshAfterMutations) {
        await refresh();
      }
    } catch (err) {
      const nextError = toError(err, "Failed to update command");
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [refresh, refreshAfterMutations]);

  const deleteCommand = React.useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/clipboard/${id}/remove`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to delete command");
      }
      if (refreshAfterMutations) {
        await refresh();
      }
    } catch (err) {
      const nextError = toError(err, "Failed to delete command");
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [refresh, refreshAfterMutations]);

  React.useEffect(() => {
    if (!autoLoad) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [autoLoad, refresh]);

  const value = React.useMemo(
    () => ({
      commands,
      loading,
      error,
      refresh,
      addCommand,
      updateCommand,
      deleteCommand,
    }),
    [
      commands,
      loading,
      error,
      refresh,
      addCommand,
      updateCommand,
      deleteCommand,
    ],
  );

  return (
    <CommandClipboardContext.Provider value={value}>
      {children}
    </CommandClipboardContext.Provider>
  );
};

export const useCommandClipboard = (): CommandClipboardContextType => {
  const context = React.useContext(CommandClipboardContext);
  if (!context) {
    throw new Error(
      "useCommandClipboard must be used within a CommandClipboardProvider"
    );
  }
  return context;
};
