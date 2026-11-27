import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, Mail } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { loadSetup } from "@/lib/mooring-setup";

type Mode = "signup" | "signin";

export const Route = createFileRoute("/auth")({
  validateSearch: (s): { mode?: Mode } => (s["mode"] === "signin" ? { mode: "signin" } : {}),
  head: () => ({
    meta: [
      { title: "Start watching your stack — Mooring" },
      { name: "description", content: "Create your free Mooring account with email, Google or Microsoft. No credit card required." },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Start watching your stack — Mooring" },
      { property: "og:description", content: "Create your free Mooring account with email, Google or Microsoft. No credit card required." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const FUNNEL = [
  { n: "~50", strong: "vendor changes a week, read for you.", rest: "Docs, changelogs and release notes across your whole stack.", hot: false },
  { n: "~90%", strong: "filtered out as not relevant to you.", rest: "Each change is checked against your exact models and tools.", hot: false },
  { n: "~2", strong: "that matter get a priority tag and a ticket.", rest: "Flagged to the teammate who owns the fix, with the exact before and after.", hot: true },
];

function ProviderIcon({ p }: { p: "google" | "microsoft" | "github" }) {
  if (p === "google")
    return (
      <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
        <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
      </svg>
    );
  if (p === "microsoft")
    return (
      <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 24 24">
        <path fill="#F25022" d="M1 1h10.5v10.5H1z" /><path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
        <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" /><path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
      </svg>
    );
  return (
    <svg aria-hidden="true" className="size-[18px] text-ink" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5z" />
    </svg>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Signed in: returning users go to Home, new users go to setup.
  useEffect(() => {
    if (loading || !user) return;
    void navigate({ to: loadSetup().completed ? "/app" : "/setup", replace: true });
  }, [user, loading, navigate]);

  const oauth = async (provider: "google" | "microsoft" | "github") => {
    setError(null);
    setNotice(null);
    if (provider === "github") {
      setNotice("GitHub sign-in isn't available yet. Use Google, Microsoft or email for now.");
      return;
    }
    setPending(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
      if (result.error) setError(result.error.message.includes("cancel") ? "Sign-in was cancelled. Pick a method to try again." : result.error.message);
    } catch {
      setError("Sign-in didn't complete. Try again.");
    } finally {
      setPending(null);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < 8) return setError("Password needs at least 8 characters.");
    setPending("email");
    const res =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/setup" } })
        : await supabase.auth.signInWithPassword({ email, password });
    setPending(null);
    if (res.error) return setError(res.error.message);
    if (mode === "signup" && !res.data.session) setNotice(`Check ${email} for a confirmation link, then come back to finish setup.`);
  };

  const isSignup = mode === "signup";

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-nav p-10 text-nav-foreground lg:flex xl:p-12">
        <span className="inline-flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand">
            <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="6.5" r="3.5" /><path d="M12 10v10" /><path d="M6 15a6 6 0 0 0 12 0" /><path d="M9 13h6" /></svg>
          </span>
          <span className="text-sm font-semibold">Mooring</span>
        </span>
        <div className="max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Your agent is live. Your vendors keep shipping.</h2>
          <p className="mt-5 text-base leading-7 text-nav-muted">We read their changelogs so you don't have to, and tell you only about the changes that touch your stack.</p>
          <dl className="mt-10 space-y-6">
            {FUNNEL.map((f) => (
              <div key={f.n} className="grid grid-cols-[4.5rem_1fr] gap-4">
                <dt className={`text-3xl font-semibold tracking-tight ${f.hot ? "text-p0" : ""}`}>{f.n}</dt>
                <dd className="text-sm leading-6 text-nav-muted"><span className="font-medium text-nav-foreground">{f.strong}</span> {f.rest}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="text-xs text-nav-muted">Beta · Built for teams shipping AI agents</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[28px] font-semibold tracking-tight text-ink">{isSignup ? "Start watching your stack" : "Welcome back"}</h1>
          <p className="mt-2 text-sm text-ink-dim">{isSignup ? "Create your free account. No credit card required." : "Sign in to see what changed since your last visit."}</p>

          <p className="mt-8 text-xs font-medium text-ink">Continue with</p>
          <div className="mt-2 grid grid-cols-3 gap-2.5">
            {(["google", "microsoft", "github"] as const).map((p) => (
              <button key={p} type="button" onClick={() => void oauth(p)} disabled={!!pending}
                className="flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-lg border border-line bg-surface text-sm font-medium capitalize text-ink transition-colors hover:bg-canvas disabled:opacity-60">
                {pending === p ? <Loader2 className="size-[18px] animate-spin" /> : <ProviderIcon p={p} />}
                {p === "github" ? "GitHub" : p}
              </button>
            ))}
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-ink-faint"><span className="h-px flex-1 bg-line" />or with email<span className="h-px flex-1 bg-line" /></div>

          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-ink">Work email</span>
              <span className="mt-1.5 flex h-11 items-center gap-2.5 rounded-lg border border-line px-3 focus-within:border-brand">
                <Mail className="size-4 text-ink-faint" />
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" />
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink">Password</span>
              <span className="mt-1.5 flex h-11 items-center gap-2.5 rounded-lg border border-line px-3 focus-within:border-brand">
                <Lock className="size-4 text-ink-faint" />
                <input type="password" required minLength={8} autoComplete={isSignup ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" />
              </span>
            </label>
            {error && <p role="alert" className="rounded-md bg-p0-soft px-3 py-2 text-xs text-p0">{error}</p>}
            {notice && <p role="status" className="rounded-md bg-brand-soft px-3 py-2 text-xs text-brand">{notice}</p>}
            <button type="submit" disabled={!!pending} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-medium text-primary-foreground hover:bg-brand-hover disabled:opacity-70">
              {pending === "email" && <Loader2 className="size-4 animate-spin" />}
              {isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-xs text-ink-faint">By continuing, you agree to our <span className="text-brand underline">Terms</span> and <span className="text-brand underline">Privacy Policy</span>.</p>
          <div className="mt-6 border-t border-line pt-6 text-sm text-ink-dim">
            {isSignup ? "Already have an account? " : "New to Mooring? "}
            <button type="button" onClick={() => { setMode(isSignup ? "signin" : "signup"); setError(null); setNotice(null); }} className="font-medium text-brand hover:underline">
              {isSignup ? "Sign in" : "Create an account"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
