/**
 * SSH Terminal modal — connects via WebSocket to /api/ws/ssh and renders
 * an interactive PTY session using xterm.js.
 */
import { useEffect, useRef, useState } from "react";
import { X, Terminal, Wifi, WifiOff, Loader2, AlertTriangle, Key, Lock } from "lucide-react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface SshTerminalProps {
  server: {
    id: number;
    name: string;
    host: string;
    sshPort: number;
    sshUsername: string;
    sshAuthMethod?: string | null;
  };
  orgId: number;
  token: string;
  onClose: () => void;
}

type ConnState = "idle" | "connecting" | "connected" | "error" | "disconnected";

export function SshTerminal({ server, orgId, token, onClose }: SshTerminalProps) {
  const termRef   = useRef<HTMLDivElement>(null);
  const xtermRef  = useRef<XTerm | null>(null);
  const fitRef    = useRef<FitAddon | null>(null);
  const wsRef     = useRef<WebSocket | null>(null);
  const [connState, setConnState] = useState<ConnState>("idle");
  const [error, setError]         = useState<string | null>(null);
  const [password, setPassword]   = useState("");
  const [askPw, setAskPw]         = useState(false);

  const needsPassword = !server.sshAuthMethod || server.sshAuthMethod === "password";

  // Determine WebSocket base URL  ──────────────────────────────────────────────
  function getWsBase() {
    const loc = window.location;
    const proto = loc.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${loc.host}`;
  }

  // Open terminal ──────────────────────────────────────────────────────────────
  function openTerminal() {
    if (!termRef.current) return;
    if (xtermRef.current) { xtermRef.current.dispose(); }

    const term = new XTerm({
      theme: {
        background: "#0d1117",
        foreground: "#c9d1d9",
        cursor: "#58a6ff",
        selectionBackground: "#264f78",
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 13,
      cursorBlink: true,
      allowProposedApi: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(termRef.current);
    fit.fit();
    xtermRef.current = term;
    fitRef.current   = fit;

    // Resize observer
    const ro = new ResizeObserver(() => fit.fit());
    ro.observe(termRef.current);
    return () => ro.disconnect();
  }

  // Connect over WebSocket ─────────────────────────────────────────────────────
  function connect(pw?: string) {
    setConnState("connecting");
    setError(null);

    const params = new URLSearchParams({
      token,
      serverId: String(server.id),
      orgId:    String(orgId),
      ...(pw ? { password: pw } : {}),
    });
    const url = `${getWsBase()}/api/ws/ssh?${params.toString()}`;
    const ws  = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => { /* wait for "connected" message */ };

    ws.onmessage = (evt) => {
      const data = evt.data as string;
      try {
        const msg = JSON.parse(data) as { type: string; message?: string };
        if (msg.type === "connected") {
          setConnState("connected");
          openTerminal();
          return;
        }
        if (msg.type === "disconnected") {
          setConnState("disconnected");
          xtermRef.current?.writeln("\r\n\x1b[33m[Connection closed]\x1b[0m");
          return;
        }
        if (msg.type === "error") {
          setConnState("error");
          setError(msg.message ?? "Unknown error");
          ws.close();
          return;
        }
      } catch {
        // Raw terminal output
      }
      xtermRef.current?.write(data);
    };

    ws.onerror = () => {
      setConnState("error");
      setError("WebSocket connection failed — check the server is reachable");
    };
    ws.onclose = (e) => {
      if (connState !== "connected") return;
      setConnState("disconnected");
      if (e.code !== 1000) {
        xtermRef.current?.writeln("\r\n\x1b[31m[Disconnected]\x1b[0m");
      }
    };

    // Terminal → WebSocket
    setTimeout(() => {
      xtermRef.current?.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(data);
      });
    }, 500);
  }

  // Handle resize ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      fitRef.current?.fit();
      const { cols, rows } = xtermRef.current ?? { cols: 80, rows: 24 };
      wsRef.current?.send(JSON.stringify({ type: "resize", cols, rows }));
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Cleanup ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      xtermRef.current?.dispose();
    };
  }, []);

  const handleConnect = () => {
    if (needsPassword && !password) { setAskPw(true); return; }
    connect(needsPassword ? password : undefined);
  };

  const stateIcon = {
    idle:         <Terminal className="w-4 h-4" />,
    connecting:   <Loader2 className="w-4 h-4 animate-spin" />,
    connected:    <Wifi className="w-4 h-4 text-emerald-400" />,
    error:        <AlertTriangle className="w-4 h-4 text-red-400" />,
    disconnected: <WifiOff className="w-4 h-4 text-yellow-400" />,
  }[connState];

  const stateLabel = {
    idle:         "Not connected",
    connecting:   "Connecting…",
    connected:    `Connected to ${server.host}`,
    error:        "Connection failed",
    disconnected: "Disconnected",
  }[connState];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl h-[80vh] flex flex-col rounded-2xl border border-border bg-[#0d1117] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/60">
          <div className="flex items-center gap-2.5">
            {stateIcon}
            <div>
              <p className="text-sm font-semibold text-foreground">{server.name}</p>
              <p className="text-[11px] text-muted-foreground font-mono">{server.sshUsername}@{server.host}:{server.sshPort}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{stateLabel}</span>
            <button onClick={onClose} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 relative overflow-hidden">
          {/* Terminal viewport */}
          <div ref={termRef} className="absolute inset-0 p-1" style={{ display: connState === "connected" ? "block" : "none" }} />

          {/* Pre-connect screen */}
          {connState !== "connected" && (
            <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
              {connState === "idle" && (
                <>
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Terminal className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Connect to {server.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 font-mono">{server.sshUsername}@{server.host}:{server.sshPort}</p>
                    </div>
                  </div>

                  {/* Password field (if needed + not pre-stored) */}
                  {needsPassword && (
                    <div className="w-full max-w-sm space-y-2">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Lock className="w-3 h-3" /> SSH Password
                      </label>
                      <input
                        type="password"
                        placeholder="Enter SSH password…"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && connect(password)}
                        className="w-full h-9 rounded-md border border-border bg-background text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        autoFocus
                      />
                    </div>
                  )}

                  {server.sshAuthMethod === "key" && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">
                      <Key className="w-3.5 h-3.5" /> Using stored SSH key
                    </div>
                  )}

                  <button
                    onClick={handleConnect}
                    className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Connect
                  </button>
                </>
              )}

              {connState === "connecting" && (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm">Establishing SSH connection…</p>
                  <p className="text-xs font-mono">{server.host}:{server.sshPort}</p>
                </div>
              )}

              {(connState === "error" || connState === "disconnected") && (
                <div className="flex flex-col items-center gap-4 text-center max-w-md">
                  {connState === "error"
                    ? <AlertTriangle className="w-10 h-10 text-red-400" />
                    : <WifiOff className="w-10 h-10 text-yellow-400" />}
                  <div>
                    <p className="font-medium text-foreground">{connState === "error" ? "Connection Failed" : "Disconnected"}</p>
                    {error && <p className="text-sm text-muted-foreground mt-1">{error}</p>}
                  </div>
                  <button
                    onClick={() => { setConnState("idle"); setError(null); setPassword(""); }}
                    className="px-5 py-2 rounded-lg bg-card border border-border text-sm hover:bg-muted transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
