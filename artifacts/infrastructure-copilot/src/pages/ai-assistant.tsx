import { useState, useRef, useEffect } from "react";
import { Bot, Send, Plus, Trash2, Loader2, Terminal, Copy } from "lucide-react";
import {
  useAiChat, useListAiConversations, useDeleteAiConversation,
  useGetAiConversation, getListAiConversationsQueryKey, getGetAiConversationQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: number;
  provider?: string;
}

// ── AI Providers ──────────────────────────────────────────────────────────────
const PROVIDERS = [
  {
    id: "gemini",
    label: "Gemini",
    sublabel: "Google",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#4285F4"/>
        <path d="M12 4.5c.83 0 1.5.67 1.5 1.5S12.83 7.5 12 7.5 10.5 6.83 10.5 6s.67-1.5 1.5-1.5z" fill="white"/>
        <path d="M12 8c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4z" fill="white"/>
      </svg>
    ),
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400",
    activeColor: "bg-blue-500 text-white border-blue-500",
    dot: "bg-blue-500",
  },
  {
    id: "openai",
    label: "ChatGPT",
    sublabel: "OpenAI",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.843-3.369 2.02-1.168a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.402-.681zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
      </svg>
    ),
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
    activeColor: "bg-emerald-600 text-white border-emerald-600",
    dot: "bg-emerald-500",
  },
  {
    id: "claude",
    label: "Claude",
    sublabel: "Anthropic",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M13.827 3.52h3.603L24 20.32h-3.603l-6.57-16.8zm-8.047 0h3.603l6.57 16.8H12.35l-1.285-3.36H4.656l-1.285 3.36H0L5.78 3.52zm-.76 10.48h4.377L7.158 7.83l-2.138 6.17z"/>
      </svg>
    ),
    color: "bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400",
    activeColor: "bg-orange-500 text-white border-orange-500",
    dot: "bg-orange-500",
  },
] as const;

type ProviderId = typeof PROVIDERS[number]["id"];

// ── Markdown-aware message renderer ──────────────────────────────────────────
function parseCodeBlocks(content: string): Array<{ type: "text" | "code"; content: string; lang?: string }> {
  const parts: Array<{ type: "text" | "code"; content: string; lang?: string }> = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > last) parts.push({ type: "text", content: content.slice(last, match.index) });
    parts.push({ type: "code", content: match[2]?.trim() ?? "", lang: match[1] || "bash" });
    last = match.index + match[0].length;
  }
  if (last < content.length) parts.push({ type: "text", content: content.slice(last) });
  return parts;
}

function MessageContent({ content, role }: { content: string; role: "user" | "assistant" }) {
  if (role === "user") return <p className="text-sm whitespace-pre-wrap">{content}</p>;
  const parts = parseCodeBlocks(content);
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.type === "code") {
          return (
            <div key={i} className="rounded-lg overflow-hidden border border-border">
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted border-b border-border">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-mono">{part.lang}</span>
                </div>
                <button onClick={() => navigator.clipboard.writeText(part.content)} className="p-1 rounded hover:bg-border transition-colors" title="Copy">
                  <Copy className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              <pre className="px-4 py-3 text-xs font-mono text-foreground bg-sidebar overflow-x-auto scrollbar-thin">
                <code>{part.content}</code>
              </pre>
            </div>
          );
        }
        return (
          <div key={i} className="text-sm text-foreground">
            {part.content.split("\n").map((line, j) => {
              if (line.startsWith("**") && line.endsWith("**")) return <p key={j} className="font-semibold mt-2 first:mt-0">{line.slice(2, -2)}</p>;
              if (line.startsWith("## ")) return <p key={j} className="font-semibold text-foreground mt-3 first:mt-0">{line.slice(3)}</p>;
              if (line.startsWith("### ")) return <p key={j} className="font-medium text-foreground mt-2 first:mt-0">{line.slice(4)}</p>;
              if (line.startsWith("- ") || line.startsWith("* ")) return <p key={j} className="flex gap-2 ml-2"><span className="text-primary mt-1 shrink-0">•</span><span>{line.slice(2)}</span></p>;
              if (/^\d+\./.test(line)) return <p key={j} className="ml-2">{line}</p>;
              if (line.trim() === "") return <br key={j} />;
              return <p key={j}>{line}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

const STARTER_PROMPTS = [
  "How do I harden an Ubuntu 24.04 server for production?",
  "What's the best practice for zero-downtime Nginx deployments?",
  "Help me troubleshoot high CPU usage on my web server",
  "Create a bash script to monitor disk space and send alerts",
];

// ── Provider pill selector ────────────────────────────────────────────────────
function ProviderSelector({ selected, onSelect }: { selected: ProviderId; onSelect: (id: ProviderId) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {PROVIDERS.map(p => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150
            ${selected === p.id ? p.activeColor + " shadow-sm" : p.color + " hover:opacity-80"}`}
        >
          {p.icon}
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Provider avatar for messages ──────────────────────────────────────────────
function ProviderAvatar({ providerId }: { providerId?: string }) {
  const p = PROVIDERS.find(x => x.id === providerId) ?? PROVIDERS[0]!;
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${p.color}`}>
      {p.icon}
    </div>
  );
}

export default function AiAssistantPage() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("gemini");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  const { data: conversations, isLoading: convsLoading } = useListAiConversations(orgId, { query: { queryKey: getListAiConversationsQueryKey(orgId) } });
  const chat = useAiChat({ mutation: {} });
  const deleteConv = useDeleteAiConversation({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListAiConversationsQueryKey(orgId) }) } });

  const { data: convDetail } = useGetAiConversation(orgId, activeConvId ?? 0, {
    query: {
      queryKey: getGetAiConversationQueryKey(orgId, activeConvId ?? 0),
      enabled: activeConvId !== null && activeConvId > 0,
    },
  });

  useEffect(() => {
    if (!convDetail || activeConvId === null) return;
    const loaded: Message[] = (convDetail as any).messages?.map((m: any, idx: number) => ({
      id: idx + 1,
      role: m.role as "user" | "assistant",
      content: m.content,
    })) ?? [];
    nextId.current = loaded.length + 1;
    setMessages(loaded);
    setConversationId(activeConvId);
    setLoadingConv(false);
  }, [convDetail, activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || chat.isPending) return;
    setInput("");
    const userMsg: Message = { role: "user", content: msg, id: nextId.current++ };
    setMessages(prev => [...prev, userMsg]);
    try {
      const res = await chat.mutateAsync({
        orgId,
        data: { message: msg, conversationId, provider: selectedProvider },
      } as any);
      const aiRes = res as any;
      if (aiRes.conversationId && !conversationId) {
        setConversationId(aiRes.conversationId);
        qc.invalidateQueries({ queryKey: getListAiConversationsQueryKey(orgId) });
      }
      setMessages(prev => [...prev, {
        role: "assistant",
        content: aiRes.message,
        id: nextId.current++,
        provider: aiRes.provider ?? selectedProvider,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Failed to reach the AI service. Please try again.", id: nextId.current++ }]);
    }
  };

  const newConversation = () => {
    setMessages([]);
    setConversationId(null);
    setActiveConvId(null);
    nextId.current = 1;
  };

  const selectConversation = (id: number) => {
    if (id === activeConvId) return;
    setMessages([]);
    setLoadingConv(true);
    setActiveConvId(id);
  };

  const provider = PROVIDERS.find(p => p.id === selectedProvider) ?? PROVIDERS[0]!;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-60 shrink-0 border-r border-border flex flex-col bg-sidebar overflow-hidden">
        <div className="p-3 border-b border-border">
          <Button size="sm" className="w-full" onClick={newConversation} data-testid="btn-new-conversation">
            <Plus className="w-3.5 h-3.5 mr-2" />New Conversation
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
          {convsLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />) :
            (conversations ?? []).map((conv: any) => (
              <div key={conv.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${activeConvId === conv.id ? "bg-accent text-accent-foreground" : "hover:bg-sidebar-accent text-sidebar-foreground"}`}
                onClick={() => selectConversation(conv.id)}
                data-testid={`conv-${conv.id}`}>
                <Bot className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <p className="text-xs flex-1 truncate">{conv.title}</p>
                <button
                  onClick={e => { e.stopPropagation(); deleteConv.mutate({ orgId, conversationId: conv.id }); if (activeConvId === conv.id) newConversation(); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive transition-colors"
                  data-testid={`btn-delete-conv-${conv.id}`}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          {(conversations ?? []).length === 0 && !convsLoading && (
            <p className="text-xs text-muted-foreground text-center py-4">No conversations yet</p>
          )}
        </div>

        {/* Provider legend in sidebar */}
        <div className="p-3 border-t border-border space-y-1">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-2">Available Models</p>
          {PROVIDERS.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
              <span className="text-xs text-muted-foreground">{p.label} <span className="opacity-60">· {p.sublabel}</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {loadingConv ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading conversation…</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border-2 ${provider.color}`}>
              <span className="scale-[2]">{provider.icon}</span>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">GuideX AI Assistant</h2>
            <p className="text-muted-foreground max-w-md mb-2 text-sm">
              Your infrastructure copilot. Ask anything about servers, deployments, security, and DevOps.
            </p>
            <p className="text-xs text-muted-foreground mb-8">
              Currently using <span className="font-semibold text-foreground">{provider.label}</span> by {provider.sublabel}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {STARTER_PROMPTS.map(prompt => (
                <button key={prompt} onClick={() => sendMessage(prompt)}
                  className="text-left p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted transition-all text-sm text-foreground"
                  data-testid="btn-starter-prompt">
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && <ProviderAvatar providerId={msg.provider} />}
                <div className={`max-w-2xl rounded-xl px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground ml-12" : "bg-card border border-border"}`}>
                  <MessageContent content={msg.content} role={msg.role} />
                </div>
              </div>
            ))}
            {chat.isPending && (
              <div className="flex gap-4">
                <ProviderAvatar providerId={selectedProvider} />
                <div className="bg-card border border-border rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">{provider.label} is thinking…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input bar */}
        <div className="border-t border-border p-4">
          <div className="relative max-w-3xl mx-auto space-y-2">
            <div className="flex items-center gap-3">
              <ProviderSelector selected={selectedProvider} onSelect={setSelectedProvider} />
              <span className="text-xs text-muted-foreground hidden sm:block">Switch model anytime — context is preserved</span>
            </div>
            <div className="relative">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={`Ask ${provider.label}… (Enter to send, Shift+Enter for newline)`}
                className="pr-12 resize-none min-h-[80px] max-h-[200px] font-sans"
                data-testid="input-chat-message"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || chat.isPending}
                className="absolute right-3 bottom-3 p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                data-testid="btn-send-message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
