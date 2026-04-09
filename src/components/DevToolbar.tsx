import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bug, ChevronDown, ChevronUp, LogIn } from "lucide-react";

const TEST_ACCOUNTS = [
  { label: "Admin", email: "admin@akademia.edu", password: "admin123", path: "/admin", color: "bg-red-500" },
  { label: "Prof. Ergys", email: "ergys@wbu.edu.al", password: "prof123", path: "/professor", color: "bg-blue-500" },
  { label: "Prof. Kleo", email: "kleo@wbu.edu.al", password: "prof123", path: "/professor", color: "bg-blue-400" },
  { label: "Student Alvio", email: "alvio@wbu.edu.al", password: "student123", path: "/portal", color: "bg-green-500" },
  { label: "Student Glen", email: "glen@wbu.edu.al", password: "student123", path: "/portal", color: "bg-green-400" },
];

const DevToolbar = () => {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const navigate = useNavigate();

  const switchTo = async (account: typeof TEST_ACCOUNTS[0]) => {
    setSwitching(account.email);
    try {
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });
      if (error) {
        console.error("Dev switch failed:", error.message);
        alert(`Login failed for ${account.email}: ${error.message}`);
      } else {
        navigate(account.path, { replace: true });
      }
    } finally {
      setSwitching(null);
    }
  };

  const openInNewTab = (account: typeof TEST_ACCOUNTS[0]) => {
    // Open login page in new tab — user must log in manually there
    // Different browsers get isolated sessions automatically
    const url = account.path === "/admin" ? "/admin/login" : "/portal/login";
    window.open(url, "_blank");
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {open && (
        <div className="mb-2 w-64 rounded-lg border border-border bg-card p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Switch (same tab)</p>
          <div className="space-y-1.5">
            {TEST_ACCOUNTS.map((acc) => (
              <div key={acc.email} className="flex items-center gap-1.5">
                <button
                  onClick={() => switchTo(acc)}
                  disabled={switching !== null}
                  className="flex flex-1 items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  <span className={`h-2 w-2 rounded-full ${acc.color}`} />
                  {switching === acc.email ? "Switching..." : acc.label}
                </button>
                <button
                  onClick={() => openInNewTab(acc)}
                  title="Open login in new tab"
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <LogIn className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground leading-tight">
            💡 For parallel sessions, use different browsers or incognito windows. Each gets its own auth state.
          </p>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
      >
        <Bug className="h-3.5 w-3.5" />
        Dev
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>
    </div>
  );
};

export default DevToolbar;
