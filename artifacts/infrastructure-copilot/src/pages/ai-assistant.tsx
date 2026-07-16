import { useState, useRef, useEffect } from "react";
import { Bot, Send, Plus, Trash2, Loader2, Code2, Terminal, Copy } from "lucide-react";
import { useAiChat, useListAiConversations, useDeleteAiConversation, getListAiConversationsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: number;
}

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
                <button
                  onClick={() => navigator.clipboard.writeText(part.content)}
                  className="p-1 rounded hover:bg-border transition-colors"
                  title="Copy"
                >
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
              if (line.startsWith("**") && line.endsWith("**")) {
                return <p key={j} className="font-semibold mt-2 first:mt-0">{line.slice(2, -2)}</p>;
              }
              if (line.startsWith("- ") || line.startsWith("* ")) {
                return <p key={j} className="flex gap-2 ml-2"><span className="text-primary mt-1 shrink-0">•</span><span>{line.slice(2)}</span></p>;
              }
              if (/^\d+\./.test(line)) {
                return <p key={j} className="ml-2">{line}</p>;
              }
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
  "How do I install Nginx with SSL on Ubuntu 24.04?",
  "What's the best practice for securing a PostgreSQL installation?",
  "Help me troubleshoot high CPU usage on my web server",
  "Create a deployment plan for installing Docker CE",
];

export default function AiAssistantPage() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  let nextId = useRef(1);

  const { data: conversations, isLoading: convsLoading } = useListAiConversations(orgId, { query: { queryKey: getListAiConversationsQueryKey(orgId) } });
  const chat = useAiChat({ mutation: {} });
  const deleteConv = useDeleteAiConversation({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListAiConversationsQueryKey(orgId) }) } });

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
      const res = await chat.mutateAsync({ orgId, data: { message: msg, conversationId } } as any);
      const aiRes = res as any;
      if (aiRes.conversationId && !conversationId) {
        setConversationId(aiRes.conversationId);
        qc.invalidateQueries({ queryKey: getListAiConversationsQueryKey(orgId) });
      }
      setMessages(prev => [...prev, { role: "assistant", content: aiRes.message, id: nextId.current++ }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "I encountered an issue processing your request. Please try again.", id: nextId.current++ }]);
    }
  };

  const newConversation = () => {
    setMessages([]);
    setConversationId(null);
    setActiveConvId(null);
  };

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
                onClick={() => setActiveConvId(conv.id)}
                data-testid={`conv-${conv.id}`}>
                <Bot className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <p className="text-xs flex-1 truncate">{conv.title}</p>
                <button onClick={e => { e.stopPropagation(); deleteConv.mutate({ orgId, conversationId: conv.id }); }}
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
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Infrastructure AI Assistant</h2>
            <p className="text-muted-foreground max-w-md mb-8">Your senior infrastructure engineer on demand. Ask me about deployments, troubleshooting, best practices, and more.</p>
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
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-2xl rounded-xl px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground ml-12" : "bg-card border border-border"}`}>
                  <MessageContent content={msg.content} role={msg.role} />
                </div>
              </div>
            ))}
            {chat.isPending && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Analyzing your infrastructure...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="relative max-w-3xl mx-auto">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask about deployments, troubleshooting, configuration... (Enter to send, Shift+Enter for newline)"
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
  );
}
