import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Boxes, Home, Plug, Settings, Users } from "lucide-react";
import { MooringLogo } from "@/components/driftwatch/MooringLogo";
import { EMPTY_SETUP, OWNER_TYPES, SAMPLE_CHANGES, loadSetup, productCount, vendorScore, watchedVendors, workspaceScore, type Severity, type SetupState } from "@/lib/mooring-setup";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Home — Mooring" },
      { name: "description", content: "Your AI stack's reliability score and the vendor changes that matter this week." },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Home — Mooring" },
      { property: "og:description", content: "Your AI stack's reliability score and the vendor changes that matter this week." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppShell,
});

type Tab = "home" | "reliability" | "stack" | "team" | "integrations" | "settings";
const NAV: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "reliability", label: "Reliability", icon: Activity },
  { id: "stack", label: "Agent stack", icon: Boxes },
  { id: "team", label: "Team & routing", icon: Users },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "settings", label: "Settings", icon: Settings },
];
const SEV: Record<Severity, string> = {
  Critical: "bg-p0-soft text-p0", High: "bg-p1-soft text-p1", Medium: "bg-p2-soft text-p2", Low: "bg-p3-soft text-p3",
};

function AppShell() {
  const [s, setS] = useState<SetupState>(EMPTY_SETUP);
  const [tab, setTab] = useState<Tab>("home");
  useEffect(() => setS(loadSetup()), []);
  const vendors = watchedVendors(s);
  const changes = SAMPLE_CHANGES.filter((c) => vendors.includes(c.vendor));
  const feed = changes.length ? changes : SAMPLE_CHANGES;

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="hidden w-56 shrink-0 flex-col bg-nav p-4 text-nav-foreground md:flex">
        <MooringLogo className="text-nav-foreground" />
        <nav className="mt-8 space-y-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setTab(n.id)} className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm", tab === n.id ? "bg-nav-active text-nav-foreground" : "text-nav-muted hover:text-nav-foreground")}>
              <n.icon className="size-4" />{n.label}
              {n.id === "home" && <span className="ml-auto rounded-full bg-brand px-1.5 text-[11px] text-primary-foreground">{feed.length}</span>}
            </button>
          ))}
        </nav>
        <Link to="/setup" className="mt-auto text-xs text-nav-muted hover:text-nav-foreground">Edit stack setup</Link>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex h-14 items-center gap-3 border-b border-line bg-surface px-6">
          <h1 className="font-semibold text-ink">{NAV.find((n) => n.id === tab)?.label}</h1>
          <span className="font-mono text-xs text-ink-faint">Watching {vendors.length} vendors · {productCount(s)} products</span>
          <select value={tab} onChange={(e) => setTab(e.target.value as Tab)} className="ml-auto rounded-md border border-line bg-surface px-2 py-1 text-sm md:hidden">
            {NAV.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
          </select>
        </header>
        <div className="mx-auto max-w-5xl space-y-5 p-6">
          {tab === "home" && (
            <>
              <Card className="flex flex-wrap items-center gap-6 p-6">
                <div>
                  <p className="text-xs uppercase tracking-wider text-ink-faint">Reliability score</p>
                  <p className="mt-1 text-5xl font-semibold tabular-nums text-ink">{workspaceScore(vendors)}<span className="text-xl text-ink-faint">/100</span></p>
                </div>
                <div className="flex gap-6 font-mono text-sm">
                  <Stat n="~50" l="changes read" /><Stat n="~90%" l="noise filtered" /><Stat n={String(feed.filter((c) => c.severity === "Critical").length)} l="need action" />
                </div>
              </Card>
              {(["Critical", "High", "Medium"] as Severity[]).map((sev) => {
                const rows = feed.filter((c) => c.severity === sev);
                if (!rows.length) return null;
                return (
                  <Card key={sev}>
                    <p className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">{sev} · {rows.length}</p>
                    <ul className="divide-y divide-line">
                      {rows.map((c) => (
                        <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", SEV[c.severity])}>{c.severity}</span>
                          <span className="text-sm text-ink">{c.title}</span>
                          <span className="font-mono text-xs text-ink-faint">{c.vendor} · {c.type}</span>
                          <span className="ml-auto text-xs text-ink-faint">{c.age}</span>
                          <button className="rounded-md border border-line px-2 py-1 text-xs text-ink-dim hover:bg-canvas">Send to teammate</button>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })}
              <p className="text-xs text-ink-faint">Sample changes shown until live scanning is wired to your workspace.</p>
            </>
          )}
          {tab === "reliability" && (
            <Card>
              <table className="w-full text-sm">
                <thead className="border-b border-line text-left text-xs text-ink-faint"><tr><th className="px-5 py-3">Vendor</th><th>Score</th><th>Open changes</th><th className="pr-5">Trend</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {vendors.map((v) => {
                    const sc = vendorScore(v);
                    return (
                      <tr key={v}>
                        <td className="px-5 py-3 text-ink">{v}</td>
                        <td><div className="flex items-center gap-2"><div className="h-1.5 w-24 rounded-full bg-line"><div className="h-full rounded-full bg-brand" style={{ width: `${sc}%` }} /></div><span className="tabular-nums text-ink">{sc}</span></div></td>
                        <td className="tabular-nums text-ink-dim">{feed.filter((c) => c.vendor === v).length}</td>
                        <td className="pr-5 font-mono text-xs text-ink-faint">{sc > 80 ? "stable" : "watch"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
          {tab === "stack" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {vendors.map((v) => (
                <Card key={v} className="p-4">
                  <p className="font-medium text-ink">{v}</p>
                  <p className="mt-1 font-mono text-xs text-ink-dim">{(s.products[v]?.length ? s.products[v] : ["All products"]).join(" · ")}</p>
                </Card>
              ))}
            </div>
          )}
          {tab === "team" && (
            <Card className="divide-y divide-line">
              {OWNER_TYPES.map((o) => (
                <div key={o.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1"><p className="text-sm font-medium text-ink">{o.title}</p><p className="text-xs text-ink-dim">{o.role}</p></div>
                  <span className="font-mono text-xs text-ink-dim">{s.owners[o.id] || "Unassigned"}</span>
                </div>
              ))}
            </Card>
          )}
          {tab === "integrations" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[["Slack", "Post alerts to a channel"], ["Microsoft Teams", "Post alerts to a channel"], ["GitHub", "Scan repos for vendor SDK usage"], ["Webhook", "Signed JSON payload (HMAC-SHA256)"]].map(([n, d]) => (
                <Card key={n} className="flex items-center justify-between p-4">
                  <div><p className="font-medium text-ink">{n}</p><p className="text-sm text-ink-dim">{d}</p></div>
                  <button className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink">Connect</button>
                </Card>
              ))}
            </div>
          )}
          {tab === "settings" && (
            <Card className="space-y-3 p-5 text-sm">
              <p className="text-ink">Workspace settings arrive with backend wiring.</p>
              <Link to="/setup" className="text-brand">Edit stack setup →</Link>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-line bg-surface", className)}>{children}</div>;
}
function Stat({ n, l }: { n: string; l: string }) {
  return <div><p className="text-lg text-ink">{n}</p><p className="text-xs text-ink-faint">{l}</p></div>;
}
