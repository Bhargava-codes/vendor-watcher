import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { MooringLogo } from "@/components/driftwatch/MooringLogo";
import { BLOCKS, EMPTY_SETUP, OWNER_TYPES, PRODUCTS, VENDORS, loadSetup, saveSetup, selectedVendors, type BlockId, type SetupState } from "@/lib/mooring-setup";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Set up your stack — Mooring" },
      { name: "description", content: "Tell Mooring which AI vendors and products you depend on, and who owns each kind of change." },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Set up your stack — Mooring" },
      { property: "og:description", content: "Tell Mooring which AI vendors and products you depend on, and who owns each kind of change." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Setup,
});

const STEPS = ["Building blocks", "Vendors", "Products", "Owners"];
const SCAN = ["Reading vendor changelogs", "Diffing docs & pricing pages", "Scoring impact on your stack", "Computing reliability score"];

function Setup() {
  const navigate = useNavigate();
  const [s, setS] = useState<SetupState>(EMPTY_SETUP);
  const [step, setStep] = useState(0);
  const [scan, setScan] = useState(-1);
  useEffect(() => setS(loadSetup()), []);
  useEffect(() => {
    if (scan < 0 || scan >= SCAN.length) return;
    const t = setTimeout(() => setScan(scan + 1), 900);
    return () => clearTimeout(t);
  }, [scan]);

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const vendors = selectedVendors(s);
  const canNext = step === 0 ? s.blocks.length > 0 : step === 1 ? vendors.length > 0 : true;

  const finish = () => { const n = { ...s, completed: true }; saveSetup(n); setS(n); setScan(0); };

  if (scan >= 0) {
    const done = scan >= SCAN.length;
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-md rounded-xl border border-line bg-surface p-8">
          <MooringLogo />
          <h1 className="mt-6 text-xl font-semibold text-ink">First scan</h1>
          <p className="mt-1 text-sm text-ink-dim">Watching {vendors.length} vendors across your stack.</p>
          <ul className="mt-6 space-y-3">
            {SCAN.map((l, i) => (
              <li key={l} className="flex items-center gap-3 text-sm">
                <span className={cn("flex size-5 items-center justify-center rounded-full border", i < scan ? "border-brand bg-brand text-primary-foreground" : i === scan ? "animate-pulse border-brand" : "border-line")}>
                  {i < scan && <Check className="size-3" />}
                </span>
                <span className={i <= scan ? "text-ink" : "text-ink-faint"}>{l}</span>
              </li>
            ))}
          </ul>
          <button disabled={!done} onClick={() => navigate({ to: "/app" })} className="mt-8 h-10 w-full rounded-lg bg-brand text-sm font-medium text-primary-foreground disabled:opacity-50">
            {done ? "See my score" : "Scanning…"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas">
      <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-6">
        <MooringLogo />
        <span className="font-mono text-xs text-ink-faint">Step {step + 1} of 4</span>
      </header>
      <div className="mx-auto max-w-3xl p-6">
        <ol className="mb-8 grid grid-cols-4 gap-2">
          {STEPS.map((t, i) => (
            <li key={t}>
              <div className={cn("h-1 rounded-full", i <= step ? "bg-brand" : "bg-line")} />
              <p className={cn("mt-2 text-xs", i === step ? "font-medium text-ink" : "text-ink-faint")}>{t}</p>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <Section title="What is your agent built from?" sub="Pick every layer you ship. You can change this later.">
            <div className="grid gap-3 sm:grid-cols-3">
              {BLOCKS.map((b) => {
                const on = s.blocks.includes(b.id);
                return (
                  <button key={b.id} onClick={() => setS({ ...s, blocks: toggle(s.blocks, b.id) })} className={cn("rounded-xl border p-4 text-left transition-colors", on ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-ink-faint")}>
                    <p className="font-medium text-ink">{b.title}</p>
                    <p className="mt-1 text-sm text-ink-dim">{b.role}</p>
                    <p className="mt-3 font-mono text-[11px] text-ink-faint">{b.examples}</p>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {step === 1 && (
          <Section title="Which vendors do you call?" sub="Popular picks are marked.">
            {s.blocks.map((b: BlockId) => (
              <div key={b} className="mb-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-faint">{BLOCKS.find((x) => x.id === b)?.title}</p>
                <div className="flex flex-wrap gap-2">
                  {VENDORS[b].map((v) => {
                    const on = s.vendors[b].includes(v.name);
                    return (
                      <button key={v.name} onClick={() => setS({ ...s, vendors: { ...s.vendors, [b]: toggle(s.vendors[b], v.name) } })} className={cn("rounded-full border px-3 py-1.5 text-sm", on ? "border-brand bg-brand text-primary-foreground" : "border-line bg-surface text-ink hover:border-ink-faint")}>
                        {v.name}{v.popular && !on && <span className="ml-1 text-ink-faint">·</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </Section>
        )}

        {step === 2 && (
          <Section title="Which products exactly?" sub="We only alert on what you use. Leave blank to watch everything.">
            <div className="space-y-3">
              {vendors.map((v) => (
                <div key={v} className="rounded-xl border border-line bg-surface p-4">
                  <p className="font-medium text-ink">{v}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(PRODUCTS[v] ?? ["All products"]).map((p) => {
                      const cur = s.products[v] ?? [];
                      const on = cur.includes(p);
                      return (
                        <button key={p} onClick={() => setS({ ...s, products: { ...s.products, [v]: toggle(cur, p) } })} className={cn("rounded-md border px-2.5 py-1 font-mono text-xs", on ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-dim")}>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section title="Who owns each kind of change?" sub="Mooring routes each alert to one person. Optional.">
            <div className="space-y-3">
              {OWNER_TYPES.map((o) => (
                <div key={o.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <p className="font-medium text-ink">{o.title}</p>
                    <p className="text-sm text-ink-dim">{o.detail}</p>
                  </div>
                  <input value={s.owners[o.id] ?? ""} onChange={(e) => setS({ ...s, owners: { ...s.owners, [o.id]: e.target.value } })} placeholder={o.role + " email"} className="h-9 rounded-lg border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-brand sm:w-60" />
                </div>
              ))}
            </div>
          </Section>
        )}

        <div className="mt-8 flex justify-between">
          <button onClick={() => setStep(step - 1)} disabled={step === 0} className="h-10 rounded-lg border border-line px-4 text-sm text-ink disabled:opacity-40">Back</button>
          <button disabled={!canNext} onClick={() => (step === 3 ? finish() : setStep(step + 1))} className="h-10 rounded-lg bg-brand px-5 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {step === 3 ? "Run first scan" : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
}

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <p className="mb-6 mt-1 text-sm text-ink-dim">{sub}</p>
      {children}
    </section>
  );
}
