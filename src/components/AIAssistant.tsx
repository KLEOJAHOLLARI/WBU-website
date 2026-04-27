import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { Bot, MessageSquare, Send, Sparkles, X, Minus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

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

export default function AIAssistant() {
  const { t, i18n } = useTranslation();
  const { session, isAdmin, isProfessor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lang = (i18n.language?.startsWith("sq") ? "sq" : "en") as "en" | "sq";
  const role = pickRole(isAdmin, isProfessor, !!session);
  const suggestions = SUGGESTIONS_BY_ROLE[role][lang];

  // Hide on print / login pages where chat would be noise
  const hidden = useMemo(() => {
    const p = location.pathname;
    return (
      p.includes("/receipt") ||
      p === "/admin/login" ||
      p === "/portal/login" ||
      p === "/portal/register"
    );
  }, [location.pathname]);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    }
  }, [messages, open, minimized]);

  const greeting = useMemo<Msg>(() => {
    const text =
      lang === "sq"
        ? `Përshëndetje! Unë jam asistenti i WBU. Mund të të ndihmoj me **${role === "admin" ? "administrim" : role === "professor" ? "lëndët dhe notat" : role === "student" ? "lëndët, notat, tarifat dhe provimet" : "informacion mbi universitetin"}**. Si mund të të ndihmoj sot?`
        : `Hi! I'm the WBU assistant. I can help you with **${role === "admin" ? "admin tasks" : role === "professor" ? "courses & grading" : role === "student" ? "your courses, grades, tuition & exams" : "information about the university"}**. How can I help today?`;
    return { role: "assistant", content: text };
  }, [lang, role]);

  const visibleMessages = messages.length === 0 ? [greeting] : messages;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
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
          messages: next,
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

      // push placeholder assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
                copy[copy.length - 1] = { role: "assistant", content: acc };
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

  // Intercept link clicks inside messages → use react-router for internal paths
  function onMessageClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const a = target.closest("a") as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute("href") ?? "";
    if (href.startsWith("/")) {
      e.preventDefault();
      navigate(href);
      setMinimized(true);
    }
  }

  if (hidden) return null;

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
              : "bottom-5 right-5 w-[min(92vw,400px)] h-[min(85vh,620px)]",
          )}
          role="dialog"
          aria-label="AI assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight truncate">
                  {lang === "sq" ? "Asistenti WBU" : "WBU Assistant"}
                </div>
                <div className="text-[11px] opacity-80 capitalize truncate">{role}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
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
                  {visibleMessages.map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-2",
                        m.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm",
                        )}
                      >
                        {m.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_a]:text-primary [&_a]:underline">
                            <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                          </div>
                        ) : (
                          <span className="whitespace-pre-wrap">{m.content}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && messages[messages.length - 1]?.role === "user" && (
                    <div className="flex gap-2 justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Suggestions */}
              {messages.length === 0 && (
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
              )}

              {/* Composer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="p-3 border-t border-border flex items-center gap-2 bg-background"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={lang === "sq" ? "Pyet diçka…" : "Ask anything…"}
                  disabled={loading}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Send">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
