import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, Users, Newspaper, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { isAdmin, isProfessor } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const term = query.trim();

  const { data: courses = [] } = useQuery({
    queryKey: ["search-courses", term],
    queryFn: async () => {
      if (!term) return [];
      const { data } = await supabase
        .from("courses")
        .select("id, name, code, program")
        .or(`name.ilike.%${term}%,code.ilike.%${term}%`)
        .limit(6);
      return data ?? [];
    },
    enabled: open && term.length > 0,
  });

  const { data: news = [] } = useQuery({
    queryKey: ["search-news", term],
    queryFn: async () => {
      if (!term) return [];
      const { data } = await supabase
        .from("news_articles")
        .select("id, title, slug, category")
        .ilike("title", `%${term}%`)
        .limit(6);
      return data ?? [];
    },
    enabled: open && term.length > 0,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["search-programs", term],
    queryFn: async () => {
      if (!term) return [];
      const { data } = await supabase
        .from("programs")
        .select("id, title, slug, degree")
        .ilike("title", `%${term}%`)
        .limit(6);
      return data ?? [];
    },
    enabled: open && term.length > 0,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["search-students", term, isAdmin],
    queryFn: async () => {
      if (!term || !isAdmin) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, student_id, program")
        .or(
          `full_name.ilike.%${term}%,email.ilike.%${term}%,student_id.ilike.%${term}%`
        )
        .limit(6);
      return data ?? [];
    },
    enabled: open && term.length > 0 && isAdmin,
  });

  const go = (path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  const empty =
    term.length > 0 &&
    !courses.length &&
    !news.length &&
    !programs.length &&
    !students.length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="relative h-9 w-9 px-0 sm:w-56 sm:px-3 sm:justify-start text-muted-foreground"
        aria-label="Search"
      >
        <Search className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline text-sm">Search...</span>
        <kbd className="ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search courses, programs, news..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {!term && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Start typing to search
            </div>
          )}
          {empty && <CommandEmpty>No results found.</CommandEmpty>}

          {courses.length > 0 && (
            <CommandGroup heading="Courses">
              {courses.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`course-${c.id}-${c.name}`}
                  onSelect={() =>
                    go(isProfessor ? `/professor/courses/${c.id}` : isAdmin ? `/admin/courses` : `/portal/courses/${c.id}`)
                  }
                >
                  <BookOpen className="mr-2 h-4 w-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.code} · {c.program}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {programs.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Programs">
                {programs.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`prog-${p.id}-${p.title}`}
                    onSelect={() => go(`/programs/${p.slug}`)}
                  >
                    <GraduationCap className="mr-2 h-4 w-4 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.degree}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {students.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Students">
                {students.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={`student-${s.id}-${s.full_name}`}
                    onSelect={() => go(`/admin/students`)}
                  >
                    <Users className="mr-2 h-4 w-4 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{s.full_name || s.email}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.student_id ? `${s.student_id} · ` : ""}
                        {s.email}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {news.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="News">
                {news.map((n) => (
                  <CommandItem
                    key={n.id}
                    value={`news-${n.id}-${n.title}`}
                    onSelect={() => go(`/news/${n.slug}`)}
                  >
                    <Newspaper className="mr-2 h-4 w-4 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.category}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default GlobalSearch;
