import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/portal/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error: err } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (err) {
        setError(err.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const { data, error: err } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  };

  const clientName = details?.client?.name ?? "this app";

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg">
        {error ? (
          <>
            <h1 className="font-display text-xl font-bold text-foreground">Authorization failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </>
        ) : !details ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <h1 className="font-display text-xl font-bold text-foreground">
              Connect {clientName} to your WBU account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {clientName} will be able to read your WBU portal data as you — your profile, courses,
              tuition balance and announcements. You can revoke access at any time.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                disabled={busy}
                onClick={() => decide(true)}
                className="flex-1 rounded-md bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy ? "Working…" : "Approve"}
              </button>
              <button
                disabled={busy}
                onClick={() => decide(false)}
                className="flex-1 rounded-md border border-border py-2.5 font-semibold text-foreground disabled:opacity-60"
              >
                Deny
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default OAuthConsent;
