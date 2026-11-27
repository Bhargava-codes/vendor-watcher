import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Anchor, ChevronRight, MoreVertical, Send } from "lucide-react";
import { EMPTY_SETUP, loadSetup, type SetupState } from "@/lib/mooring-setup";
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
const NAV: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "reliability", label: "Reliability" },
  { id: "stack", label: "Agent stack" },
  { id: "team", label: "Team & routing" },
  { id: "integrations", label: "Integrations" },
];

type Sev = "Critical" | "High" | "Medium";
type Row = { sev: Sev; title: string; kind: string; vendor: string; product: string; when: string };
const GROUPS: { name: string; owner: string; rows: Row[] }[] = [
  { name: "Development", owner: "Priya", rows: [
    { sev: "Critical", title: "Agent run signature changed in a minor release", kind: "Breaking change", vendor: "LangChain / LangGraph", product: "LangGraph", when: "Before your next deploy" },
    { sev: "High", title: "Embedding model retirement scheduled", kind: "Retirement", vendor: "OpenAI", product: "Embeddings", when: "In 30 days" },
    { sev: "Medium", title: "API version sunset announced", kind: "API sunset", vendor: "Pinecone", product: "Serverless indexes", when: "In 90 days" },
    { sev: "Medium", title: "Legacy memory module marked deprecated", kind: "Deprecation", vendor: "LangChain / LangGraph", product: "LangChain", when: "Next major release" },
  ]},
  { name: "Behavior", owner: "You", rows: [
    { sev: "Critical", title: "Model alias now points to a newer model", kind: "Model repointed", vendor: "OpenAI", product: "Responses / Chat API", when: "Today" },
    { sev: "Critical", title: "Default output format for tool calls changed", kind: "Default changed", vendor: "Anthropic", product: "Tool use", when: "This week" },
  ]},
  { name: "Pricing", owner: "Finance", rows: [
    { sev: "High", title: "Rate limits changed on the batch tier", kind: "Rate limit change", vendor: "Anthropic", product: "Message Batches", when: "Next billing cycle" },
    { sev: "High", title: "Read-unit pricing updated for serverless", kind: "Price change", vendor: "Pinecone", product: "Serverless indexes", when: "Next billing cycle" },
    { sev: "Medium", title: "Embeddings price change takes effect next month", kind: "Price change", vendor: "OpenAI", product: "Embeddings", when: "Before next month" },
  ]},
];
const VENDOR_SCORES = [
  { name: "OpenAI", score: 74, mix: "1·1·1", hit: "Model alias now points to a newer model", products: "2 products" },
  { name: "Anthropic", score: 77, mix: "1·1·0", hit: "Default output format for tool calls changed", products: "2 products" },
  { name: "LangGraph", score: 82, mix: "1·0·1", hit: "Agent run signature changed in a minor release", products: "1 product" },
  { name: "Pinecone", score: 89, mix: "0·1·1", hit: "Read-unit pricing updated for serverless", products: "1 product" },
];
const PEOPLE = ["Priya", "You", "Finance", "Arjun"];

function AppShell() {
  const [s, setS] = useState<SetupState>(EMPTY_SETUP);
  const [tab, setTab] = useState<Tab>("home");
  useEffect(() => setS(loadSetup()), []);
  void s;

  const navBtn = (id: Tab, label: string) => (
    <button key={id} onClick={() => setTab(id)} className={cn("flex w-full items-center rounded-lg px-3.5 py-2.5 text-[15px]", tab === id ? "bg-nav-active font-medium text-nav-foreground" : "text-nav-foreground/85 hover:text-nav-foreground")}>
      {label}
      {id === "home" && <span className="ml-auto flex size-[18px] items-center justify-center rounded-full bg-brand text-[10px] text-primary-foreground">9</span>}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col bg-nav px-3 pb-4 pt-4 text-nav-foreground md:flex">
        <div className="flex items-center gap-2.5 px-2">
          <span className="flex size-[30px] items-center justify-center rounded-lg bg-brand text-primary-foreground"><Anchor className="size-4" /></span>
          <span className="text-[15px] font-medium">Mooring</span>
        </div>
        <nav className="mt-7 space-y-1">{NAV.map((n) => navBtn(n.id, n.label))}</nav>
        <div className="mt-auto">
          {navBtn("settings", "Settings")}
          <div className="mt-3 border-t border-nav-foreground/10 px-3.5 pt-3 text-xs leading-5 text-nav-muted">
            Watching 4 vendors · 6 products<br />Last check: 12 min ago
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-6 py-8 md:px-8">
        <select value={tab} onChange={(e) => setTab(e.target.value as Tab)} className="mb-4 rounded-md border border-line bg-surface px-2 py-1 text-sm md:hidden">
          {[...NAV, { id: "settings" as Tab, label: "Settings" }].map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
        </select>
        {tab === "home" && <HomeView />}
        {tab === "reliability" && <ReliabilityView />}
        {tab === "integrations" && <IntegrationsView />}
        {tab === "stack" && <Simple title="Agent stack" sub="The vendors and products Mooring watches for you."><div className="grid gap-3 sm:grid-cols-2">{VENDOR_SCORES.map((v) => <div key={v.name} className="rounded-xl border border-line bg-surface p-4"><p className="font-medium text-ink">{v.name}</p><p className="mt-1 text-sm text-ink-dim">{v.products}</p></div>)}</div></Simple>}
        {tab === "team" && <Simple title="Team & routing" sub="Each kind of change goes to one owner."><div className="divide-y divide-line rounded-xl border border-line bg-surface">{GROUPS.map((g) => <div key={g.name} className="flex justify-between px-5 py-3.5 text-sm"><span className="font-medium text-ink">{g.name}</span><span className="text-ink-dim">{g.owner}</span></div>)}</div></Simple>}
        {tab === "settings" && <Simple title="Settings" sub="Workspace and account."><Link to="/setup" className="text-sm text-brand">Edit stack setup →</Link></Simple>}
      </main>
    </div>
  );
}

function SevPill({ sev }: { sev: Sev }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", sev === "Critical" ? "bg-p0 text-primary-foreground" : "bg-p3-soft text-ink-dim")}>{sev}</span>;
}

function HomeView() {
  const [sent, setSent] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div>
      <p className="text-[15px] text-ink-dim">Your agent's reliability</p>
      <div className="mt-2 flex flex-wrap items-start gap-x-10 gap-y-3">
        <p className="leading-none text-ink"><span className="text-[64px] font-semibold tracking-tight">79</span><span className="ml-1 text-xl text-ink-faint">/ 100</span></p>
        <div>
          <div className="flex flex-wrap gap-2">
            {VENDOR_SCORES.map((v) => (
              <button key={v.name} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink">
                {v.name} <span className="font-semibold tabular-nums">{v.score}</span><ChevronRight className="size-3 text-ink-faint" />
              </button>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-ink-dim">Based on 11 changes to your stack in the last 30 days · <button className="text-brand">How it's calculated</button></p>
        </div>
      </div>
      <p className="mt-3 text-[15px] text-ink"><b className="font-medium">214</b> updates from your vendors <span className="text-ink-faint">→</span> <b className="font-medium">11</b> touch the products you use <span className="text-ink-faint">→</span> <b className="font-medium text-p0">3</b> hitting production now</p>

      {GROUPS.map((g) => (
        <section key={g.name} className="mt-9">
          <p className="mb-2.5 text-[15px]"><span className="font-semibold text-ink">{g.name}</span> <span className="ml-1.5 text-ink-faint">{g.rows.length}</span> <span className="text-ink-dim">· sent to {g.owner}</span></p>
          <div className="divide-y divide-line rounded-xl border border-line bg-surface">
            {g.rows.map((r) => {
              const id = r.title;
              return (
                <div key={id} className="relative flex items-center gap-4 px-3 py-3.5">
                  <div className="w-[80px] shrink-0"><SevPill sev={r.sev} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-ink">{r.title}</p>
                    <p className="mt-0.5 text-[13px] text-ink-dim"><span className="font-medium text-ink">{r.kind}</span> · {r.vendor} · {r.product}</p>
                  </div>
                  <p className="hidden w-28 text-right text-[13px] leading-tight text-ink-dim sm:block">{r.when}</p>
                  <button onClick={() => setOpen(open === id ? null : id)} className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-canvas">
                    <Send className="size-3.5" />{sent[id] ? `Sent · ${sent[id]}` : "Send"}
                  </button>
                  <button aria-label="More" className="p-1 text-ink-dim"><MoreVertical className="size-4" /></button>
                  {open === id && (
                    <div className="absolute right-10 top-full z-10 mt-1 w-44 rounded-lg border border-line bg-surface p-1 shadow-lg">
                      {PEOPLE.map((p) => (
                        <button key={p} onClick={() => { setSent({ ...sent, [id]: p }); setOpen(null); }} className={cn("block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-canvas", p === g.owner ? "font-medium text-brand" : "text-ink")}>{p}{p === g.owner && " · owner"}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <p className="mt-6 px-4 text-[13px] text-ink-dim">+ 2 low, no action needed</p>
    </div>
  );
}

function ReliabilityView() {
  const pts = [100, 100, 99, 99, 99, 98, 98, 98, 92, 92, 91, 91, 91, 89, 88, 86, 79];
  const path = pts.map((p, i) => `${(i / (pts.length - 1)) * 300},${(100 - p) * 4 + 10}`).join(" L");
  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-ink">Reliability</h1>
      <p className="mt-1 text-[15px] text-ink-dim">How dependable your agent stack is, scored from vendor changes to the products you use.</p>
      <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_2fr_1fr]">
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-sm text-ink-dim">Agent reliability</p>
          <p className="mt-2 leading-none text-ink"><span className="text-[56px] font-semibold tracking-tight">79</span><span className="ml-1 text-xl text-ink-faint">/ 100</span></p>
          <p className="mt-4 text-sm text-ink-dim">Based on 11 changes · last 30 days</p>
          <button className="mt-1 text-sm text-brand">How it's calculated</button>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-sm text-ink-dim">Score over the last 30 days</p>
          <svg viewBox="0 0 300 100" className="mt-3 h-24 w-full" preserveAspectRatio="none">
            <path d="M0,10 H300 M0,50 H300 M0,90 H300" className="stroke-line" strokeWidth="0.5" />
            <path d={`M${path}`} fill="none" className="stroke-ink" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            <circle cx={(8 / 16) * 300} cy={42} r="2.5" className="fill-p0" />
            <circle cx="299" cy={(100 - 79) * 4 + 10} r="2.5" className="fill-p0" />
          </svg>
          <div className="mt-1 flex justify-between text-xs text-ink-faint"><span>30 days ago · 100</span><span>Today · 79</span></div>
          <p className="mt-2 flex items-center gap-2 text-[13px] text-ink"><span className="size-2 rounded-full bg-p0" />Critical changes · biggest drop: Model alias now points to a newer model (OpenAI)</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-sm text-ink-dim">Where the points went</p>
          <div className="mt-2 divide-y divide-line">
            {[["Development", "Priya", 29], ["Behavior", "You", 30], ["Pricing", "Finance", 19]].map(([n, o, v]) => (
              <div key={n} className="flex justify-between py-2.5"><div><p className="text-[15px] text-ink">{n}</p><p className="text-xs text-ink-dim">sent to {o}</p></div><span className="text-[15px] font-medium text-ink">−{v}</span></div>
            ))}
          </div>
        </div>
      </div>
      <h2 className="mb-3 mt-8 text-[17px] font-semibold text-ink">Dependencies · riskiest first</h2>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="border-b border-line text-left text-[11px] font-medium uppercase tracking-wider text-ink-faint">
            <th className="px-5 py-3 font-medium">Dependency</th><th className="font-medium">Score</th><th className="font-medium">Crit · High · Med</th><th className="font-medium">Biggest hit</th><th className="font-medium">Products</th><th />
          </tr></thead>
          <tbody className="divide-y divide-line">
            {VENDOR_SCORES.map((v) => (
              <tr key={v.name}>
                <td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className="size-7 rounded-md border border-dashed border-line" /><span className="text-[15px] text-ink">{v.name}</span></div></td>
                <td><div className="flex items-center gap-3"><span className="w-6 text-[15px] tabular-nums text-ink">{v.score}</span><div className="h-1.5 w-28 rounded-full bg-canvas"><div className="h-full rounded-full bg-ink-dim" style={{ width: `${v.score}%` }} /></div></div></td>
                <td className="text-ink-dim">{v.mix}</td>
                <td className="text-ink-dim">{v.hit}</td>
                <td className="text-ink-dim">{v.products}</td>
                <td className="pr-5 text-ink-faint"><ChevronRight className="size-3.5" /></td>
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
      <h1 className="text-[28px] font-semibold tracking-tight text-ink">Integrations</h1>
      <p className="mt-1 text-[15px] text-ink-dim">0 connected · where alerts go and where tickets land</p>
      {INTEG.map((sec) => (
        <section key={sec.title} className="mt-7">
          <p className="mb-3"><span className="text-[17px] font-semibold text-ink">{sec.title}</span> <span className="text-sm text-ink-dim">· {sec.sub}</span></p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {sec.items.map(([n, d, cta]) => (
              <div key={n} className={cn("flex flex-col rounded-xl border border-line bg-surface p-4", !cta && "opacity-60")}>
                <div className="flex items-center gap-3"><span className="size-7 rounded-md border border-dashed border-line" /><span className="text-[15px] font-medium text-ink">{n}</span></div>
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
  return <div className="max-w-3xl"><h1 className="text-[28px] font-semibold tracking-tight text-ink">{title}</h1><p className="mb-6 mt-1 text-[15px] text-ink-dim">{sub}</p>{children}</div>;
}
