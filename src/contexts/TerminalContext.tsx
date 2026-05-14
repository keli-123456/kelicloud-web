import * as React from "react";
import type { Terminal } from 'xterm';

// TerminalContext provides terminal instance and a sendCommand function to children components
export interface TerminalContextType {
  terminal: Terminal | null;
  sendCommand: (cmd: string) => void;
}

export const TerminalContext = React.createContext<TerminalContextType>({
  terminal: null,
  sendCommand: () => {},
});

export const useTerminal = (): TerminalContextType => {
  const context = React.useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminal must be used within a TerminalContext.Provider');
  }
  return context;
};
