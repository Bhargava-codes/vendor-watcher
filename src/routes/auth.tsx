import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { MooringLogo } from "@/components/driftwatch/MooringLogo";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/components/auth/AuthProvider";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Mooring" },
      {
        name: "description",
        content: "Sign in to Mooring with Google or Microsoft to save your AI dependency watchlist.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Sign in — Mooring" },
      {
        property: "og:description",
        content: "Sign in to Mooring with Google or Microsoft to save your AI dependency watchlist.",
      },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="size-[18px] shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg aria-hidden="true" className="size-[18px] shrink-0" viewBox="0 0 24 24">
      <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
      <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
      <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
      <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
    </svg>
  );
}

function AuthPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [pending, setPending] = useState<"google" | "microsoft" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (provider: "google" | "microsoft") => {
    setPending(provider);
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError(result.error.message || "Sign-in did not complete. Please try again.");
      }
    } catch {
      setError("Sign-in did not complete. Please try again.");
    } finally {
      if (!user) setPending(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-line bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" aria-label="Mooring home">
            <MooringLogo />
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-dim hover:text-ink">
            <ArrowLeft className="size-3.5" /> Back to stack builder
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-line bg-surface p-6 sm:p-8">
            {loading ? (
              <div className="flex min-h-64 items-center justify-center" aria-label="Checking account session">
                <Loader2 className="size-5 animate-spin text-brand" />
              </div>
            ) : user ? (
              <div className="text-center">
                <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-p2-soft text-ok">
                  <CheckCircle2 className="size-5" />
                </span>
                <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">You’re signed in.</h1>
                <p className="mt-2 text-sm font-medium text-ink">{profile?.display_name ?? "Developer"}</p>
                <p className="mt-1 break-all text-sm text-ink-dim">{user.email}</p>
                <p className="mt-4 text-sm leading-6 text-ink-dim">Your account is ready. Open the console to inspect the working monitor and demo workspace.</p>
                <Link
                  to="/"
                  search={{ view: "console" }}
                  className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-primary-foreground hover:bg-brand-hover"
                >
                  Continue to console <ArrowRight className="size-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="mt-3 h-9 text-xs font-medium text-ink-dim hover:text-ink"
                >
                  Use a different account
                </button>
              </div>
            ) : (
              <>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand">Your dependencies, watched</p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">One account. Fewer surprise breakages.</h1>
                <p className="mt-3 text-sm leading-6 text-ink-dim">Sign in to save your AI stack and keep your dependency watchlist attached to you—not this browser.</p>

                <div className="mt-7 space-y-3">
                  <button
                    type="button"
                    onClick={() => void signIn("google")}
                    disabled={pending !== null}
                    className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-google-border bg-surface px-3 text-sm font-medium text-google outline-none transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending === "google" ? <Loader2 className="size-[18px] animate-spin" /> : <GoogleLogo />}
                    Continue with Google
                  </button>
                  <button
                    type="button"
                    onClick={() => void signIn("microsoft")}
                    disabled={pending !== null}
                    className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink outline-none transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending === "microsoft" ? <Loader2 className="size-[18px] animate-spin" /> : <MicrosoftLogo />}
                    Continue with Microsoft
                  </button>
                </div>

                {error && (
                  <p role="alert" className="mt-4 rounded-lg border border-p0/20 bg-p0-soft px-3 py-2 text-xs leading-5 text-p0">
                    {error}
                  </p>
                )}

                <p className="mt-6 text-center text-[11px] leading-5 text-ink-faint">By continuing, you agree to use Mooring for your own development workspace. New accounts are created automatically on first sign-in.</p>
              </>
            )}
          </div>
          <p className="mt-5 text-center font-mono text-[10px] text-ink-faint">OAuth secured · No password stored by Mooring</p>
        </div>
      </main>
    </div>
  );
}
