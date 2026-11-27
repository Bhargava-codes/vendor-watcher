import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Set up your stack — Mooring" },
      { name: "description", content: "Mooring workspace: watch your AI stack's vendors and route the changes that matter." },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Set up your stack — Mooring" },
      { property: "og:description", content: "Mooring workspace: watch your AI stack's vendors and route the changes that matter." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-6 text-center">
      <h1 className="text-2xl font-semibold text-ink">This screen is coming next</h1>
      <p className="max-w-sm text-sm text-ink-dim">You're signed in. Until this screen is built, open the working demo console.</p>
      <Link to="/" search={{ view: "console" }} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-primary-foreground">Open console</Link>
    </main>
  );
}
