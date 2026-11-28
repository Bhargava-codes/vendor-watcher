import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, Anchor, Boxes, ChevronDown, ChevronRight, ExternalLink, Home, Plug, Send, SlidersHorizontal, Users } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { BrandIcon } from "@/components/brand/BrandIcon";
import { getWorkspace, scanWorkspace, updateAlert } from "@/lib/workspace.functions";
import { PENALTY, SEVERITY_ORDER, type Severity } from "@/lib/reliability";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
];

type Workspace = Awaited<ReturnType<typeof getWorkspace>>;
type Alert = Workspace["alerts"][number];
const TYPES = ["Development", "Behavior", "Pricing"] as const;

function useWorkspace() {
  const { user } = useAuth();
  const fetchWs = useServerFn(getWorkspace);
  return useQuery({ queryKey: ["workspace", user?.id], queryFn: () => fetchWs(), enabled: !!user });
}

function ownerFor(ws: Workspace, type: string) {
  return ws.owners.find((o) => o.type === type)?.email || "you";
}

function vendorRows(ws: Workspace) {
  const latest = ws.scores[0];
  const per = latest?.per_vendor ?? {};
  const names = [...new Set(ws.stack.map((s) => s.vendor))];
  return names
    .map((name) => {
      const v = per[name];
      const alerts = ws.alerts.filter((a) => a.vendor === name);
      const worst = [...alerts].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity as Severity) - SEVERITY_ORDER.indexOf(b.severity as Severity))[0];
      const products = ws.stack.filter((s) => s.vendor === name && s.product).map((s) => s.product!);
      return { name, score: v?.score ?? null, critical: v?.critical ?? 0, high: v?.high ?? 0, medium: v?.medium ?? 0, hit: worst?.title ?? "—", products: products.length ? products.join(", ") : "All products" };
    })
    .sort((a, b) => (a.score ?? 101) - (b.score ?? 101));
}

function AppShell() {
  const [tab, setTab] = useState<Tab>("home");
  const { user, loading } = useAuth();
  const ws = useWorkspace();
  const data = ws.data;
  const openCount = data?.alerts.filter((a) => a.status === "open" && a.severity !== "Low").length ?? 0;
  const vendorCount = new Set(data?.stack.map((s) => s.vendor)).size;
  const productCount = data?.stack.filter((s) => s.product).length ?? 0;
  const lastCheck = data?.scores[0]?.computed_at;

  const navBtn = (id: Tab, label: string, Icon: typeof Home) => (
    <Button variant="ghost" key={id} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)} className={cn("flex h-9 w-full justify-start gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-normal hover:bg-nav-active hover:text-nav-foreground", tab === id ? "bg-nav-active font-medium text-nav-foreground" : "text-nav-muted")}>
      <Icon className="size-4 shrink-0" strokeWidth={1.6} /><span>{label}</span>
      {id === "home" && openCount > 0 && <span className="ml-auto flex size-[18px] items-center justify-center rounded-full bg-brand text-[10px] text-primary-foreground">{openCount}</span>}
    </Button>
  );

  let content: React.ReactNode;
  if (!loading && !user) content = <Simple title="Sign in to see your stack" sub="Your reliability score is private to your account."><Link to="/auth" className="text-sm text-brand">Sign in →</Link></Simple>;
  else if (ws.isError) content = <Simple title="Could not load your workspace" sub="Please try again in a moment."><button onClick={() => ws.refetch()} className="text-sm text-brand">Retry</button></Simple>;
  else if (!data) content = <p className="text-sm text-ink-dim">Loading your workspace…</p>;
  else if (!data.stack.length) content = <Simple title="Set up your agent stack" sub="Pick the vendors and products you use, and Mooring scores them for you."><Link to="/setup" className="text-sm text-brand">Start setup →</Link></Simple>;
  else content = (
    <>
      {tab === "home" && <HomeView ws={data} onVendor={() => setTab("reliability")} />}
      {tab === "reliability" && <ReliabilityView ws={data} />}
      {tab === "integrations" && <IntegrationsView />}
      {tab === "stack" && <Simple title="Agent stack" sub="The vendors and products Mooring watches for you."><div className="grid gap-3 sm:grid-cols-2">{vendorRows(data).map((v) => <div key={v.name} className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4"><BrandIcon name={v.name} /><div className="min-w-0"><p className="font-medium text-ink">{v.name}</p><p className="mt-1 text-sm text-ink-dim">{v.products}</p></div></div>)}</div><Link to="/setup" className="mt-4 inline-block text-sm text-brand">Edit stack →</Link></Simple>}
      {tab === "team" && <Simple title="Team & routing" sub="Each kind of change goes to one owner. Blank goes to you."><div className="divide-y divide-line rounded-lg border border-line bg-surface">{TYPES.map((t) => <div key={t} className="flex justify-between px-5 py-3.5 text-sm"><span className="font-medium text-ink">{t}</span><span className="text-ink-dim">{ownerFor(data, t)}</span></div>)}</div></Simple>}
      {tab === "settings" && <Simple title="Settings" sub="Workspace and account."><Link to="/setup" className="text-sm text-brand">Edit stack setup →</Link></Simple>}
    </>
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col bg-nav px-3 pb-4 pt-4 text-nav-foreground md:flex">
        <div className="flex items-center gap-2.5 px-2">
          <span className="flex size-[30px] items-center justify-center rounded-lg bg-brand text-primary-foreground"><Anchor className="size-4" /></span>
          <span className="text-[15px] font-medium">Mooring</span>
        </div>
        <nav className="mt-7 space-y-1">{NAV.map((n) => navBtn(n.id, n.label, n.icon))}</nav>
        <div className="mt-auto">
          {navBtn("settings", "Settings", SlidersHorizontal)}
          <div className="mt-3 border-t border-nav-foreground/10 px-3.5 pt-3 text-xs leading-5 text-nav-muted">
            Watching {vendorCount} vendors · {productCount} products<br />Last check: {lastCheck ? `${Math.max(0, Math.round((Date.now() - new Date(lastCheck).getTime()) / 60000))} min ago` : "not yet"}
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-6 py-8 md:px-8">
        <select value={tab} onChange={(e) => setTab(e.target.value as Tab)} className="mb-4 rounded-md border border-line bg-surface px-2 py-1 text-sm md:hidden">
          {[...NAV, { id: "settings" as Tab, label: "Settings" }].map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
        </select>
        {content}
      </main>
    </div>
  );
}

function SevPill({ sev }: { sev: string }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", sev === "Critical" ? "bg-p0 text-primary-foreground" : "bg-p3-soft text-ink-dim")}>{sev}</span>;
}

function HowCalculated() {
  return (
    <div className="mt-3 max-w-xl rounded-lg border border-line bg-surface p-4 text-[13px] leading-5 text-ink-dim">
      Each dependency starts at 100 and loses points for changes in the last 30 days: Critical −{PENALTY.Critical}, High −{PENALTY.High}, Medium −{PENALTY.Medium}, Low 0, plus −10 for a deprecation with under 30 days' notice. Your score is the average of dependency scores, weighted by how many of each vendor's products you use. Vendors with fewer than 3 changes are not scored. Resolving a change does not raise the score.
    </div>
  );
}

function HomeView({ ws, onVendor }: { ws: Workspace; onVendor: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const update = useServerFn(updateAlert);
  const rescan = useServerFn(scanWorkspace);
  const mutate = useMutation({ mutationFn: update, onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace", user?.id] }) });
  const scan = useMutation({ mutationFn: () => rescan(), onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace", user?.id] }) });
  const [menu, setMenu] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [how, setHow] = useState(false);
  const [showLow, setShowLow] = useState(false);
  const latest = ws.scores[0];
  const vendors = vendorRows(ws).filter((v) => v.score != null);
  const critical = ws.alerts.filter((a) => a.severity === "Critical").length;
  const people = [...new Set(["you", ...ws.owners.map((o) => o.email).filter((e): e is string => !!e)])];
  const lows = ws.alerts.filter((a) => a.severity === "Low");

  const row = (r: Alert, owner: string) => (
    <div key={r.id} className={cn("relative", r.status === "resolved" && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-3.5 sm:flex-nowrap sm:gap-4">
        <div className="w-[80px] shrink-0"><SevPill sev={r.severity} /></div>
        <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="min-w-0 flex-[1_1_180px] text-left">
          <p className="text-[15px] font-normal text-ink">{r.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-dim"><BrandIcon name={r.vendor} className="size-4 rounded border-0" /><span className="text-ink">{r.kind}</span> · {r.vendor}{r.product ? ` · ${r.product}` : ""}</p>
        </button>
        <p className="hidden w-28 text-right text-[13px] leading-tight text-ink-dim sm:block">{r.deadline}</p>
        <button onClick={() => setMenu(menu === r.id ? null : r.id)} className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-canvas">
          <Send className="size-3.5" />{r.sent_to ? `Assigned to ${r.sent_to}` : "Send"}
        </button>
        <button aria-label="Details" onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="p-1 text-ink-dim"><ChevronDown className={cn("size-4 transition-transform", expanded === r.id && "rotate-180")} /></button>
      </div>
      {menu === r.id && (
        <div className="absolute right-10 top-12 z-10 w-56 rounded-lg border border-line bg-surface p-1 shadow-lg">
          {people.map((p) => (
            <button key={p} onClick={() => { mutate.mutate({ data: { id: r.id, sent_to: p } }); setMenu(null); }} className={cn("block w-full truncate rounded-md px-3 py-1.5 text-left text-sm hover:bg-canvas", p === owner ? "font-medium text-brand" : "text-ink")}>{p}{p === owner && " · Suggested"}</button>
          ))}
        </div>
      )}
      {expanded === r.id && (
        <div className="space-y-2 border-t border-line bg-canvas/50 px-5 py-4 text-sm">
          {r.why && <p className="text-ink"><span className="text-ink-dim">Why it matters: </span>{r.why}</p>}
          {r.action && <p className="text-ink"><span className="text-ink-dim">Do this: </span>{r.action}</p>}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <button onClick={() => mutate.mutate({ data: { id: r.id, status: r.status === "resolved" ? "open" : "resolved" } })} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-canvas">{r.status === "resolved" ? "Undo resolve" : "Mark resolved"}</button>
            {r.source_url && <a href={r.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand">Source <ExternalLink className="size-3" /></a>}
            {r.published_at && <span className="text-xs text-ink-faint">Published {r.published_at}</span>}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-ink-dim">Your agent's reliability</p>
        <button onClick={() => scan.mutate()} disabled={scan.isPending} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink hover:bg-canvas disabled:opacity-60">{scan.isPending ? "Checking…" : "Check again"}</button>
      </div>
      <div className="mt-2 flex flex-wrap items-start gap-x-10 gap-y-3">
        <p className="leading-none text-ink">{latest?.total != null ? <><span className="text-[64px] font-normal">{latest.total}</span><span className="ml-1 text-xl text-ink-faint">/ 100</span></> : <span className="text-[28px] font-normal text-ink-dim">Not enough data yet</span>}</p>
        <div>
          <div className="flex flex-wrap gap-2">
            {vendors.map((v) => (
              <button key={v.name} onClick={onVendor} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink hover:bg-canvas">
                <BrandIcon name={v.name} className="size-5 rounded border-0" />{v.name} <span className="font-medium tabular-nums">{v.score}</span><ChevronRight className="size-3 text-ink-faint" />
              </button>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-ink-dim">Based on {ws.alerts.length} changes to your stack in the last 30 days · <button onClick={() => setHow(!how)} className="text-brand">How it's calculated</button></p>
        </div>
      </div>
      {how && <HowCalculated />}
      <p className="mt-3 text-[15px] text-ink"><b className="font-medium">{latest?.published_count ?? 0}</b> updates from your vendors <span className="text-ink-faint">→</span> <b className="font-medium">{ws.alerts.length}</b> touch the products you use <span className="text-ink-faint">→</span> <b className={cn("font-medium", critical > 0 && "text-p0")}>{critical}</b> hitting production now</p>

      {ws.alerts.length === 0 && <p className="mt-9 rounded-lg border border-line bg-surface px-5 py-6 text-sm text-ink-dim">Nothing touched your stack in the last 30 days.</p>}
      {TYPES.map((t) => {
        const owner = ownerFor(ws, t);
        const rows = ws.alerts.filter((a) => a.type === t && a.severity !== "Low").sort((a, b) => SEVERITY_ORDER.indexOf(a.severity as Severity) - SEVERITY_ORDER.indexOf(b.severity as Severity));
        if (!rows.length) return null;
        return (
          <section key={t} className="mt-9">
            <p className="mb-2.5 text-[15px]"><span className="font-medium text-ink">{t}</span> <span className="ml-1.5 text-ink-faint">{rows.length}</span> <span className="text-ink-dim">· sent to {owner}</span></p>
            <div className="divide-y divide-line rounded-lg border border-line bg-surface">{rows.map((r) => row(r, owner))}</div>
          </section>
        );
      })}
      {lows.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowLow(!showLow)} className="px-4 text-[13px] text-ink-dim hover:text-ink">+ {lows.length} low, no action needed</button>
          {showLow && <div className="mt-2 divide-y divide-line rounded-lg border border-line bg-surface">{lows.map((r) => row(r, ownerFor(ws, r.type)))}</div>}
        </div>
      )}
    </div>
  );
}

function ReliabilityView({ ws }: { ws: Workspace }) {
  const [how, setHow] = useState(false);
  const latest = ws.scores[0];
  const history = [...ws.scores].reverse().filter((s) => s.total != null);
  const pts = history.map((s) => s.total as number);
  const path = pts.length > 1 ? pts.map((p, i) => `${(i / (pts.length - 1)) * 300},${(100 - p) * 0.8 + 10}`).join(" L") : "";
  const vendors = vendorRows(ws);
  const perType = latest?.per_type ?? {};
  return (
    <div>
      <h1 className="text-[28px] font-medium text-ink">Reliability</h1>
      <p className="mt-1 text-[15px] text-ink-dim">How dependable your agent stack is, scored from vendor changes to the products you use.</p>
      <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_2fr_1fr]">
        <div className="rounded-lg border border-line bg-surface p-5">
          <p className="text-sm text-ink-dim">Agent reliability</p>
          <p className="mt-2 leading-none text-ink">{latest?.total != null ? <><span className="text-[56px] font-normal">{latest.total}</span><span className="ml-1 text-xl text-ink-faint">/ 100</span></> : <span className="text-xl text-ink-dim">Not enough data yet</span>}</p>
          <p className="mt-4 text-sm text-ink-dim">Based on {ws.alerts.length} changes · last 30 days</p>
          <button onClick={() => setHow(!how)} className="mt-1 text-sm text-brand">How it's calculated</button>
        </div>
        <div className="rounded-lg border border-line bg-surface p-5">
          <p className="text-sm text-ink-dim">Score over your checks</p>
          {path ? (
            <svg viewBox="0 0 300 100" className="mt-3 h-24 w-full" preserveAspectRatio="none">
              <path d="M0,10 H300 M0,50 H300 M0,90 H300" className="stroke-line" strokeWidth="0.5" />
              <path d={`M${path}`} fill="none" className="stroke-ink" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            </svg>
          ) : <p className="mt-6 text-sm text-ink-dim">The trend appears after your next check.</p>}
          <div className="mt-1 flex justify-between text-xs text-ink-faint"><span>{history[0] ? `First check · ${history[0].total}` : ""}</span><span>{latest?.total != null ? `Latest · ${latest.total}` : ""}</span></div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-5">
          <p className="text-sm text-ink-dim">Where the points went</p>
          <div className="mt-2 divide-y divide-line">
            {TYPES.map((t) => (
              <div key={t} className="flex justify-between py-2.5"><div><p className="text-[15px] text-ink">{t}</p><p className="text-xs text-ink-dim">sent to {ownerFor(ws, t)}</p></div><span className="text-[15px] font-medium text-ink">−{perType[t] ?? 0}</span></div>
            ))}
          </div>
        </div>
      </div>
      {how && <HowCalculated />}
      <h2 className="mb-3 mt-8 text-[17px] font-medium text-ink">Dependencies · riskiest first</h2>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="border-b border-line text-left text-[11px] font-medium uppercase tracking-normal text-ink-faint">
            <th className="px-5 py-3 font-medium">Dependency</th><th className="font-medium">Score</th><th className="font-medium">Crit · High · Med</th><th className="font-medium">Biggest hit</th><th className="font-medium">Products</th>
          </tr></thead>
          <tbody className="divide-y divide-line">
            {vendors.map((v) => (
              <tr key={v.name}>
                <td className="px-5 py-3.5"><div className="flex items-center gap-3"><BrandIcon name={v.name} /><span className="text-[15px] text-ink">{v.name}</span></div></td>
                <td>{v.score != null ? <div className="flex items-center gap-3"><span className="w-6 text-[15px] tabular-nums text-ink">{v.score}</span><div className="h-1.5 w-28 rounded-full bg-canvas"><div className="h-full rounded-full bg-ink-dim" style={{ width: `${v.score}%` }} /></div></div> : <span className="text-ink-faint">Not scored</span>}</td>
                <td className="text-ink-dim">{v.critical}·{v.high}·{v.medium}</td>
                <td className="max-w-[280px] truncate pr-4 text-ink-dim">{v.hit}</td>
                <td className="pr-5 text-ink-dim">{v.products}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const INTEG: { title: string; sub: string; items: [string, string, string | null][] }[] = [
  { title: "Turn changes into work", sub: "tickets from a change, closed here when closed there", items: [["Jira", "Push changes as issues. Two-way close.", "Connect"], ["Azure DevOps", "Push changes as work items.", "Connect"], ["Linear", "Push changes as issues.", "Connect"], ["GitHub Issues", "Open an issue in the repo.", null]] },
  { title: "Get told", sub: "mirrors Team & routing", items: [["Slack", "A channel per change type.", "Connect"], ["MS Teams", "A channel per change type.", "Connect"], ["Email digest", "A summary of what changed, sent to each owner.", "Digest: Daily"], ["PagerDuty", "Critical only, opt-in.", null]] },
  { title: "In your dev workflow", sub: "strongest for developers", items: [["GitHub repo", "Read your dependency files and build your agent stack for you.", "Connect"], ["CI check", "Warn on a PR when a pinned dependency has a Critical change.", "Needs GitHub"], ["GitLab", "Same as GitHub.", null], ["Bitbucket", "Same as GitHub.", null]] },
  { title: "Data out", sub: "for builders", items: [["Webhook", "POST every change to your endpoint.", "Add URL"], ["REST API", "Pull changes and scores.", "Get key"], ["MCP server", "Let your agent ask whether anything in its stack is about to break.", null], ["Observability", "Datadog, Langfuse. Adds runtime signal to the score.", null]] },
];

function IntegrationsView() {
  return (
    <div>
      <h1 className="text-[28px] font-medium text-ink">Integrations</h1>
      <p className="mt-1 text-[15px] text-ink-dim">0 connected · where alerts go and where tickets land</p>
      {INTEG.map((sec) => (
        <section key={sec.title} className="mt-7">
          <p className="mb-3"><span className="text-[17px] font-medium text-ink">{sec.title}</span> <span className="text-sm text-ink-dim">· {sec.sub}</span></p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {sec.items.map(([n, d, cta]) => (
              <div key={n} className={cn("flex flex-col rounded-lg border border-line bg-surface p-4", !cta && "opacity-60")}>
                <div className="flex items-center gap-3"><BrandIcon name={n} /><span className="text-[15px] font-medium text-ink">{n}</span></div>
                <p className="mt-3 flex-1 text-sm text-ink-dim">{d}</p>
                {cta ? <button className="mt-3 self-start rounded-lg border border-line px-3.5 py-1.5 text-sm font-medium text-ink hover:bg-canvas">{cta}</button> : <p className="mt-4 text-xs text-ink-faint">Coming soon</p>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Simple({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return <div className="max-w-3xl"><h1 className="text-[28px] font-medium text-ink">{title}</h1><p className="mb-6 mt-1 text-[15px] text-ink-dim">{sub}</p>{children}</div>;
}
