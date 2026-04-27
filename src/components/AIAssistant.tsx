import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  MessageSquare,
  Send,
  Sparkles,
  X,
  Minus,
  Loader2,
  Square,
  RotateCcw,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; ts?: number };

const SUGGESTIONS_BY_ROLE: Record<string, { en: string[]; sq: string[] }> = {
  guest: {
    en: ["What programs do you offer?", "How do I apply?", "Tell me about scholarships"],
    sq: ["Çfarë programesh ofroni?", "Si mund të aplikoj?", "Më trego për bursat"],
  },
  student: {
    en: ["Explain my GPA", "Show my courses", "How is my tuition?", "When is my next exam?"],
    sq: ["Më shpjego GPA-në", "Më trego lëndët e mia", "Si është tarifa ime?", "Kur është provimi tjetër?"],
  },
  professor: {
    en: ["List my courses", "How do I enter grades?", "Generate a quiz idea", "Write an announcement"],
    sq: ["Listo lëndët e mia", "Si i fus notat?", "Sugjero një ide kuizi", "Shkruaj një njoftim"],
  },
  admin: {
    en: ["How many pending applications?", "Where do I manage students?", "Help me generate a report"],
    sq: ["Sa aplikime në pritje?", "Ku menaxhoj studentët?", "Më ndihmo të gjeneroj një raport"],
  },
};

function pickRole(isAdmin: boolean, isProfessor: boolean, signedIn: boolean): keyof typeof SUGGESTIONS_BY_ROLE {
  if (isAdmin) return "admin";
  if (isProfessor) return "professor";
  if (signedIn) return "student";
  return "guest";
}

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AIAssistant() {
  const { i18n } = useTranslation();
  const { session, isAdmin, isProfessor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lang = (i18n.language?.startsWith("sq") ? "sq" : "en") as "en" | "sq";
  const role = pickRole(isAdmin, isProfessor, !!session);
  const suggestions = SUGGESTIONS_BY_ROLE[role][lang];

  const hidden = useMemo(() => {
    const p = location.pathname;
    return (
      p.includes("/receipt") ||
      p === "/admin/login" ||
      p === "/portal/login" ||
      p === "/portal/register"
    );
  }, [location.pathname]);

  // Autoscroll on new content
  useEffect(() => {
    if (open && !minimized) {
      requestAnimationFrame(() => {
        const el = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
        (el ?? scrollRef.current)?.scrollTo({ top: 1e9, behavior: "smooth" });
      });
    }
  }, [messages, loading, open, minimized]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [input]);

  const greeting = useMemo<Msg>(() => {
    const text =
      lang === "sq"
        ? `Përshëndetje! 👋 Unë jam **WBU Assistant**. Mund të të ndihmoj me **${role === "admin" ? "administrim" : role === "professor" ? "lëndët dhe notat" : role === "student" ? "lëndët, notat, tarifat dhe provimet" : "informacion mbi universitetin"}**. Si mund të të ndihmoj sot?`
        : `Hi! 👋 I'm **WBU Assistant**. I can help with **${role === "admin" ? "admin tasks" : role === "professor" ? "courses & grading" : role === "student" ? "your courses, grades, tuition & exams" : "information about the university"}**. How can I help today?`;
    return { role: "assistant", content: text, ts: Date.now() };
  }, [lang, role]);

  const visibleMessages = messages.length === 0 ? [greeting] : messages;

  async function send(text: string, replaceLastAssistant = false) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");

    let next: Msg[];
    if (replaceLastAssistant) {
      // strip trailing assistant if present, keep messages up to the last user
      const arr = [...messages];
      while (arr.length && arr[arr.length - 1].role === "assistant") arr.pop();
      next = arr;
    } else {
      next = [...messages, { role: "user", content: trimmed, ts: Date.now() }];
    }
    setMessages(next);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          context: { path: location.pathname, language: lang },
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error(lang === "sq" ? "Shumë kërkesa, provo më vonë." : "Rate limit reached, try again shortly.");
        else if (resp.status === 402) toast.error(lang === "sq" ? "Krediti i AI-së mbaroi." : "AI credits exhausted.");
        else toast.error(lang === "sq" ? "Gabim në asistent." : "Assistant error.");
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let done = false;

      setMessages((prev) => [...prev, { role: "assistant", content: "", ts: Date.now() }]);

      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              acc += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: acc, ts: copy[copy.length - 1].ts };
                return copy;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error(e);
        toast.error(lang === "sq" ? "Gabim rrjeti." : "Network error.");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function regenerate() {
    // find last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        send(messages[i].content, true);
        return;
      }
    }
  }

  function clearChat() {
    if (loading) return;
    setMessages([]);
  }

  async function copyMessage(text: string, idx: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      toast.error(lang === "sq" ? "Kopjimi dështoi." : "Copy failed.");
    }
  }

  // Intercept link clicks → router for internal, confirm for external
  function onMessageClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const a = target.closest("a") as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute("href") ?? "";
    if (!href || href.startsWith("#")) return;
    if (href.startsWith("/")) {
      e.preventDefault();
      navigate(href);
      setMinimized(true);
      return;
    }
    if (/^(mailto:|tel:)/i.test(href)) return;
    if (/^https?:\/\//i.test(href)) {
      e.preventDefault();
      try {
        const url = new URL(href);
        if (url.origin === window.location.origin) {
          navigate(url.pathname + url.search + url.hash);
          setMinimized(true);
          return;
        }
        const msg =
          lang === "sq"
            ? `Po largohesh nga faqja për të vizituar:\n\n${url.hostname}\n\nVazhdo?`
            : `You are about to leave this site to visit:\n\n${url.hostname}\n\nContinue?`;
        if (window.confirm(msg)) window.open(href, "_blank", "noopener,noreferrer");
      } catch {
        toast.error(lang === "sq" ? "Lidhje e pavlefshme." : "Invalid link.");
      }
    }
  }

  function renderAnchor({ href = "", children, ...rest }: any) {
    const isInternal = href.startsWith("/");
    const isExternal = /^https?:\/\//i.test(href) && !isInternal;
    let title: string | undefined;
    if (isInternal) title = lang === "sq" ? `Hap brenda faqes: ${href}` : `Open in app: ${href}`;
    else if (isExternal) {
      try {
        title = lang === "sq" ? `Lidhje e jashtme: ${new URL(href).hostname}` : `External link: ${new URL(href).hostname}`;
      } catch {
        title = lang === "sq" ? "Lidhje e jashtme" : "External link";
      }
    }
    return (
      <a
        {...rest}
        href={href}
        title={title}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className={cn(
          "underline underline-offset-2",
          isExternal && "after:content-['_↗'] after:text-[0.85em] after:opacity-70",
        )}
      >
        {children}
      </a>
    );
  }

  if (hidden) return null;

  const lastIsAssistantStreaming =
    loading && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.content;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => {
            setOpen(true);
            setMinimized(false);
          }}
          aria-label="Open AI assistant"
          className="fixed bottom-5 right-5 z-50 group flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all px-4 py-3 hover:scale-105"
        >
          <div className="relative">
            <Sparkles className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent animate-pulse" />
          </div>
          <span className="hidden sm:inline text-sm font-medium">
            {lang === "sq" ? "Asistenti AI" : "AI Assistant"}
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            "fixed z-50 flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden transition-all",
            minimized
              ? "bottom-5 right-5 h-14 w-72"
              : "bottom-5 right-5 w-[min(92vw,420px)] h-[min(85vh,640px)]",
          )}
          role="dialog"
          aria-label="AI assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-accent ring-2 ring-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight truncate">
                  {lang === "sq" ? "Asistenti WBU" : "WBU Assistant"}
                </div>
                <div className="text-[11px] opacity-80 capitalize truncate">
                  {loading ? (lang === "sq" ? "duke shkruar…" : "typing…") : (lang === "sq" ? "online" : "online")} • {role}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && !minimized && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
                  onClick={clearChat}
                  disabled={loading}
                  aria-label={lang === "sq" ? "Pastro bisedën" : "Clear chat"}
                  title={lang === "sq" ? "Pastro bisedën" : "Clear chat"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setMinimized((m) => !m)}
                aria-label={minimized ? "Expand" : "Minimize"}
              >
                {minimized ? <MessageSquare className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => {
                  abortRef.current?.abort();
                  setOpen(false);
                }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <ScrollArea className="flex-1" ref={scrollRef as any}>
                <div className="p-4 space-y-3" onClick={onMessageClick}>
                  {visibleMessages.map((m, i) => {
                    const isUser = m.role === "user";
                    const showActions = !isUser && m.content && !(loading && i === visibleMessages.length - 1);
                    return (
                      <div key={i} className={cn("group flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                            isUser
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted text-foreground rounded-bl-sm",
                          )}
                        >
                          {isUser ? (
                            <span className="whitespace-pre-wrap">{m.content}</span>
                          ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_a]:text-primary">
                              {m.content ? (
                                <ReactMarkdown components={{ a: renderAnchor }}>{m.content}</ReactMarkdown>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                  <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                                  <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                                  <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce" />
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={cn("flex items-center gap-2 px-1 text-[10px] text-muted-foreground", isUser ? "flex-row-reverse" : "")}>
                          <span>{formatTime(m.ts)}</span>
                          {showActions && (
                            <button
                              onClick={() => copyMessage(m.content, i)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground inline-flex items-center gap-1"
                              aria-label={lang === "sq" ? "Kopjo" : "Copy"}
                              title={lang === "sq" ? "Kopjo" : "Copy"}
                            >
                              {copiedIdx === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Suggestions / regenerate row */}
              {messages.length === 0 ? (
                <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground px-3 py-1.5 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                !loading &&
                messages[messages.length - 1]?.role === "assistant" && (
                  <div className="px-3 pb-2 flex justify-center">
                    <button
                      onClick={regenerate}
                      className="text-xs rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground px-3 py-1.5 transition-colors inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {lang === "sq" ? "Rigjenero" : "Regenerate"}
                    </button>
                  </div>
                )
              )}

              {/* Composer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="p-3 border-t border-border flex items-end gap-2 bg-background"
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  placeholder={lang === "sq" ? "Pyet diçka… (Shift+Enter për rresht të ri)" : "Ask anything… (Shift+Enter for new line)"}
                  disabled={loading}
                  className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-ring max-h-[140px]"
                />
                {loading ? (
                  <Button type="button" size="icon" variant="destructive" onClick={stop} aria-label="Stop">
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
