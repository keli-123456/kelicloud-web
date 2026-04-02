import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Cross1Icon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import throttle from "lodash/throttle";
import { useTranslation } from "react-i18next";
import type { Terminal as XTermTerminal } from "xterm";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { TerminalContext } from "@/contexts/TerminalContext";

import { TablerAlertTriangleFilled } from "../../components/Icones/Tabler";

import "./Terminal.css";

const CommandClipboardPanel = lazy(() => import("@/pages/terminal/CommandClipboard"));

interface TerminalAreaProps {
  terminalRef: React.RefObject<HTMLDivElement | null>;
  toggleClipboard: () => void;
  width: number | string;
  isOpen: boolean;
}

const TerminalArea: React.FC<TerminalAreaProps> = ({
  terminalRef,
  toggleClipboard,
  width,
  isOpen,
}) => (
  <div
    className="relative flex h-full min-w-128 flex-col justify-center bg-black md:bg-accent-3"
    style={{ width }}
  >
    <div className="m-0 h-full w-full bg-black p-0 md:p-4">
      <div ref={terminalRef} className="h-full w-full" />
    </div>
    <div
      className="absolute right-0 top-1/2 z-20 flex h-12 w-6 -translate-y-1/2 transform cursor-pointer items-center justify-center rounded-l-full bg-accent-4 text-white hover:bg-accent-6"
      onClick={toggleClipboard}
    >
      {isOpen ? ">" : "<"}
    </div>
  </div>
);

const Divider: React.FC<{
  onMouseDown: (e: React.MouseEvent | React.TouchEvent) => void;
}> = ({ onMouseDown }) => (
  <div
    className="h-full cursor-col-resize bg-accent-2 hover:bg-accent-4"
    style={{ width: 8 }}
    onMouseDown={onMouseDown}
    onTouchStart={onMouseDown}
  />
);

const ClipboardPanel: React.FC = () => (
  <div className="h-screen min-w-64 p-2" style={{ flex: 1 }}>
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <CommandClipboardPanel className="h-full w-full" />
    </Suspense>
  </div>
);

const TerminalPage = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<XTermTerminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const params = new URLSearchParams(window.location.search);
  const uuid = params.get("uuid");
  const [callout, setCallout] = useState(false);
  const [t] = useTranslation();
  const firstBinary = useRef(false);
  const [isClipboardOpen, setIsClipboardOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState<number>(window.innerWidth * 0.7);
  const draggingRef = useRef(false);
  const fitAddonRef = useRef<{ fit: () => void } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const resizeTerminal = useCallback(() => {
    fitAddonRef.current?.fit();
    const term = terminalInstance.current;
    const ws = wsRef.current;
    if (term && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "resize",
          cols: term.cols,
          rows: term.rows,
        }),
      );
    }
  }, []);

  const startDragging = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.userSelect = "none";
  }, []);

  const stopDragging = useCallback(() => {
    if (draggingRef.current) {
      draggingRef.current = false;
      document.body.style.userSelect = "";
      resizeTerminal();
    }
  }, [resizeTerminal]);

  const onMouseMove = useMemo(
    () => throttle((e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const clientX =
        e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;

      const newLeftWidth = clientX - containerRect.left;
      const minWidth = 300;
      const maxWidth = containerRect.width - 300;

      if (newLeftWidth >= minWidth && newLeftWidth <= maxWidth) {
        setLeftWidth(newLeftWidth);
      }
    }, 1000 / 60),
    [],
  );

  useEffect(() => {
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", stopDragging);
    document.addEventListener("touchmove", onMouseMove);
    document.addEventListener("touchend", stopDragging);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", stopDragging);
      document.removeEventListener("touchmove", onMouseMove);
      document.removeEventListener("touchend", stopDragging);
      onMouseMove.cancel();
    };
  }, [onMouseMove, stopDragging]);

  useEffect(() => {
    if (uuid === null) {
      window.location.href = "/";
    }
    fetch("./api/admin/client/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.length === 0) {
          alert(t("terminal.no_active_connection"));
        }
        const client = data.find((item: { uuid: string }) => item.uuid === uuid);
        document.title = `${t("terminal.title")} - ${
          client?.name || t("terminal.title")
        }`;
      });
  }, [t, uuid]);

  useEffect(() => {
    setCallout(window.location.protocol !== "https:");
    if (!terminalRef.current) return;

    let disposed = false;
    let term: XTermTerminal | null = null;
    let ws: WebSocket | null = null;
    let searchAddon: { findNext: (value: string) => boolean } | null = null;
    let handleResize: (() => void) | null = null;
    let handleKeyDown: ((e: KeyboardEvent) => void) | null = null;
    let handleContextMenu: ((e: MouseEvent) => void) | null = null;

    const stopHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    const startHeartbeat = () => {
      if (!ws) {
        return;
      }
      heartbeatIntervalRef.current = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "heartbeat",
              timestamp: new Date().toISOString(),
            }),
          );
        }
      }, 10000);
    };

    void (async () => {
      const [
        { Terminal },
        { FitAddon },
        { WebLinksAddon },
        { SearchAddon },
      ] = await Promise.all([
        import("xterm"),
        import("xterm-addon-fit"),
        import("xterm-addon-web-links"),
        import("xterm-addon-search"),
        import("xterm/css/xterm.css"),
      ]);

      if (disposed || !terminalRef.current) {
        return;
      }

      term = new Terminal({
        cursorBlink: true,
        macOptionIsMeta: true,
        scrollback: 5000,
        convertEol: true,
        fontFamily: "'Cascadia Mono', 'Noto Sans SC', monospace",
        fontSize: 16,
      });

      const fitAddon = new FitAddon();
      fitAddonRef.current = fitAddon;
      const webLinksAddon = new WebLinksAddon();
      const searchAddonInstance = new SearchAddon();
      searchAddon = searchAddonInstance;

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.loadAddon(searchAddonInstance);

      term.open(terminalRef.current);
      terminalInstance.current = term;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const baseUrl = `${protocol}//${host}`;
      ws = new WebSocket(`${baseUrl}/api/admin/client/${uuid}/terminal`);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        resizeTerminal();
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        if (!term) {
          return;
        }

        if (event.data instanceof ArrayBuffer) {
          const uint8Array = new Uint8Array(event.data);
          term.write(uint8Array);
        } else {
          term.write(event.data);
        }
        if (!firstBinary.current && event.data instanceof ArrayBuffer) {
          firstBinary.current = true;
          setTimeout(() => {
            const currentTerm = terminalInstance.current;
            if (currentTerm) {
              currentTerm.resize(currentTerm.cols - 1, currentTerm.rows);
            }
            resizeTerminal();
          }, 200);
        }
      };

      ws.onclose = () => {
        stopHeartbeat();
        term?.write(`\n ${t("terminal.disconnect")}`);
      };

      term.onData((data) => {
        if (ws?.readyState === WebSocket.OPEN) {
          const encoder = new TextEncoder();
          const uint8Array = encoder.encode(data);
          ws.send(uint8Array);
        }
      });

      handleResize = () => {
        resizeTerminal();
      };
      window.addEventListener("resize", handleResize);

      handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && (e.key === "f" || e.key === "d")) {
          searchAddon?.findNext("");
          e.preventDefault();
        }
      };
      document.addEventListener("keydown", handleKeyDown);

      handleContextMenu = (e: MouseEvent) => {
        if (e.ctrlKey || ws?.readyState !== WebSocket.OPEN || !term) {
          return;
        }
        const selection = window.getSelection();
        const hasSelection = selection && selection.toString().length > 0;
        if (hasSelection) {
          e.preventDefault();
          const selectedText = selection.toString();
          navigator.clipboard.writeText(selectedText).finally(() => {
            term?.focus();
            term?.clearSelection();
          });
        } else {
          e.preventDefault();
          term.focus();
          navigator.clipboard.readText().then((text) => {
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(text.replace(/\r?\n/g, "\r"));
            ws?.send(uint8Array);
          });
        }
      };

      document.addEventListener("contextmenu", handleContextMenu);
    })().catch((error) => {
      console.error("Failed to initialize terminal runtime:", error);
    });

    return () => {
      disposed = true;
      stopHeartbeat();
      fitAddonRef.current = null;
      terminalInstance.current = null;
      term?.dispose();
      if (
        ws?.readyState === WebSocket.OPEN ||
        ws?.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
      if (handleResize) {
        window.removeEventListener("resize", handleResize);
      }
      if (handleKeyDown) {
        document.removeEventListener("keydown", handleKeyDown);
      }
      if (handleContextMenu) {
        document.removeEventListener("contextmenu", handleContextMenu);
      }
    };
  }, [t, uuid, resizeTerminal]);

  useEffect(() => {
    if (!fitAddonRef.current) return;
    const debouncedResize = setTimeout(() => {
      resizeTerminal();
    }, 100);
    return () => clearTimeout(debouncedResize);
  }, [isClipboardOpen, resizeTerminal]);

  const sendCommand = useCallback((cmd: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const encoder = new TextEncoder();
      ws.send(encoder.encode(cmd + "\r"));
    }
  }, []);

  return (
    <TerminalContext.Provider
      value={{ terminal: terminalInstance.current, sendCommand }}
    >
      <div className="dark">
        <Toaster theme="dark" />
        <div className="absolute inset-x-0 top-4 z-30 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            hidden={!callout}
          >
            <Alert
              variant="destructive"
              className="rounded-lg border-2 border-red-800 bg-red-50 backdrop-blur-sm"
            >
              <TablerAlertTriangleFilled className="text-red-700" />
              <AlertDescription className="flex items-center justify-between gap-3 font-medium text-red-700">
                <span>{t("warn_https")}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-700 hover:bg-red-200/50 hover:text-red-800"
                  onClick={() => setCallout(false)}
                >
                  <Cross1Icon />
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        </div>
        <div className="flex h-screen w-screen flex-row" ref={containerRef}>
          <TerminalArea
            terminalRef={terminalRef}
            toggleClipboard={() => setIsClipboardOpen(!isClipboardOpen)}
            width={isClipboardOpen ? `${leftWidth}px` : "100%"}
            isOpen={isClipboardOpen}
          />
          {isClipboardOpen && <Divider onMouseDown={startDragging} />}
          {isClipboardOpen && <ClipboardPanel />}
        </div>
      </div>
    </TerminalContext.Provider>
  );
};

export default TerminalPage;
