import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/components/auth/AuthProvider";
import { saveStack, scanWorkspace } from "@/lib/workspace.functions";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { MooringLogo } from "@/components/driftwatch/MooringLogo";
import { Button } from "@/components/ui/button";
import { BLOCKS, EMPTY_SETUP, OWNER_TYPES, PRODUCTS, VENDORS, loadSetup, saveSetup, selectedVendors, type BlockId, type SetupState } from "@/lib/mooring-setup";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [
    { title: "Set up your stack — Mooring" },
    { name: "description", content: "Choose your AI vendors, products and owners to set up your Mooring watch plan." },
    { property: "og:type", content: "website" },
    { property: "og:title", content: "Set up your stack — Mooring" },
    { property: "og:description", content: "Choose your AI vendors, products and owners to set up your Mooring watch plan." },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Setup,
});

const TITLES = ["What does your agent run on?", "Which vendors do you use?", "Which of their products do you use?", "Who should hear about what?"];
const SUBTITLES = [
  "Every AI agent is built from the same few building blocks. Tick the ones you use. You don't need to know versions or model IDs.",
  "Tap the ones you recognise. Not listed? Type it in. You can always add more later.",
  "Tap the products you rely on, so we only flag changes to those. Leave a vendor as it is and we'll watch all of its products.",
  "We sort every relevant change by type. Tell us who owns each type, and we'll flag it straight to them. Leave any blank and it comes to you.",
];
const SCAN = ["Reading their docs and changelogs from the last 90 days", "Checking each change against the products you use", "Sorting by priority and sending to the right owner", "Computing your reliability score"];
type ScanResult = { vendorCount: number; published: number; touching: number; needAction: number; prodNow: number; score: number | null };
const OWNER_TYPE: Record<string, "Development" | "Behavior" | "Pricing"> = { breaking: "Development", behavior: "Behavior", pricing: "Pricing" };
const PRIMARY = "h-9 rounded-md bg-brand px-5 text-xs font-normal text-primary-foreground shadow-none hover:bg-brand-hover";
const CHIP = "h-auto min-h-7 rounded-full border px-2.5 py-1 text-[10px] font-normal shadow-none";
const OWNERS = OWNER_TYPES.filter((owner) => owner.id !== "security");

function Setup() {
  const navigate = useNavigate();
  const [s, setS] = useState<SetupState>(EMPTY_SETUP);
  const [step, setStep] = useState(0);
  const [scan, setScan] = useState(-1);
  const [custom, setCustom] = useState<Partial<Record<BlockId, string>>>({});
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const { user } = useAuth();
  const save = useServerFn(saveStack);
  const runScan = useServerFn(scanWorkspace);
  useEffect(() => setS(loadSetup()), []);
  const toggle = <T,>(arr: T[], value: T) => arr.includes(value) ? arr.filter((item) => item !== value) : [...arr, value];
  const vendors = selectedVendors(s);
  const canNext = step === 0 ? s.blocks.length > 0 : step === 1 ? vendors.length > 0 : true;
  const finish = async () => {
    const next = { ...s, completed: true };
    saveSetup(next);
    setS(next);
    if (!user) { navigate({ to: "/auth" }); return; }
    setScanError(null);
    setScan(0);
    try {
      const items = next.blocks.flatMap((block) => next.vendors[block].flatMap((vendor): { block: string; vendor: string; product: string | null }[] => {
        const chosen = next.products[vendor] ?? [];
        return chosen.length ? chosen.map((product) => ({ block, vendor, product })) : [{ block, vendor, product: null }];
      }));
      const owners = Object.entries(next.owners).filter(([id]) => OWNER_TYPE[id]).map(([id, email]) => ({ type: OWNER_TYPE[id]!, email: email.trim() || null }));
      await save({ data: { items, owners } });
      setScan(1);
      const r = await runScan();
      setResult(r);
      setScan(SCAN.length);
    } catch {
      setScanError("The scan could not finish. Your stack is saved, so you can retry or open Home.");
    }
  };
  const addVendor = (block: BlockId) => {
    const name = custom[block]?.trim();
    if (!name) return;
    setS({ ...s, vendors: { ...s.vendors, [block]: [...new Set([...s.vendors[block], name])] } });
    setCustom({ ...custom, [block]: "" });
  };
  const done = scan >= SCAN.length;

  return (
    <main className="min-h-screen bg-canvas">
      <header className="relative border-b border-line bg-surface">
        <div className="mx-auto flex h-12 max-w-[720px] items-center justify-between gap-4 px-5 sm:px-0">
          <MooringLogo className="gap-2 [&>span:first-child]:size-6 [&>span:first-child]:rounded-md [&>span:first-child>svg]:size-3.5 [&>span:nth-child(2)]:text-[10px] [&>span:nth-child(2)]:font-medium [&>span:nth-child(2)]:tracking-normal [&>span:last-child]:hidden" />
          <span className="text-right font-mono text-[9px] text-ink-faint">{scan >= 0 ? "Setup complete" : `Step ${step + 1} of 4 · about 1 minute`}</span>
        </div>
        <div className="absolute -bottom-px left-0 h-0.5 bg-brand transition-all motion-reduce:transition-none" style={{ width: `${scan >= 0 ? 100 : (step + 1) * 25}%` }} />
      </header>

      {scan >= 0 ? (
        <section className="mx-auto max-w-[480px] px-5 pt-[60px] text-center">
          <span className={cn("mx-auto flex size-10 items-center justify-center rounded-full", done ? "bg-ok/10 text-ok" : "bg-brand-soft text-brand")}><Check className="size-5" /></span>
          <h1 className="mt-4 text-2xl font-medium text-ink">{done ? "Your reliability score is ready" : "Running your first scan"}</h1>
          <p className="mx-auto mt-2 max-w-[410px] text-xs leading-5 text-ink-dim">{result ? (result.touching ? `${result.needAction} changes need your team, and ${result.prodNow} are hitting production now. Each one is sorted by priority and sent to its owner.` : "Nothing touched your stack in the last 90 days.") : `Checking ${vendors.length} vendors for changes that affect your stack, then computing your reliability score. This can take a minute.`}</p>
          <ul className="mt-6 divide-y divide-line/40 rounded-lg border border-line bg-surface px-4 text-left" aria-live="polite">
            {SCAN.map((generic, i) => { const label = result ? [`${result.published} updates published in the last 90 days`, `${result.touching} of them touch the products you use`, `${result.needAction} need action · ${result.prodNow} are hitting production now`, result.score == null ? "Not enough data yet for a score" : "Reliability score ready"][i]! : generic; return <li key={generic} className="flex min-h-8 items-center gap-2.5 py-2 text-[10px]"><Check className={cn("size-3 shrink-0", i < scan ? "text-ok" : "text-ink-faint/40")} /><span className="flex-1 text-ink">{label}</span><span className={i < scan ? "text-ok" : "text-ink-faint"}>{i < scan ? "done" : i === scan ? "checking" : "waiting"}</span></li>; })}
          </ul>
          {scanError && <p role="alert" className="mt-3 text-[11px] text-p0">{scanError} <button onClick={finish} className="text-brand underline">Retry</button></p>}
          <div className="mx-4 mt-3 h-1 overflow-hidden rounded-full bg-line"><div className="h-full bg-brand transition-all motion-reduce:transition-none" style={{ width: `${(scan / SCAN.length) * 100}%` }} /></div>
          <Button disabled={!done && !scanError} onClick={() => navigate({ to: "/app" })} className={cn(PRIMARY, "mt-6")}>{done ? "See my score" : "Checking…"}</Button>
        </section>
      ) : (
        <div className="mx-auto max-w-[720px] px-5 pb-12 pt-11 sm:px-0">
          <h1 className="text-2xl font-medium text-ink">{TITLES[step]}</h1>
          <p className="mb-5 mt-2 text-[11px] leading-5 text-ink-dim">{SUBTITLES[step]}</p>

          {step === 0 && <div className="grid gap-3 sm:grid-cols-3">{BLOCKS.map((block) => {
            const selected = s.blocks.includes(block.id);
            return <Button key={block.id} variant="ghost" aria-pressed={selected} onClick={() => setS({ ...s, blocks: toggle(s.blocks, block.id) })} className={cn("relative flex h-[136px] flex-col items-start justify-start whitespace-normal rounded-lg border p-4 text-left shadow-none", selected ? "border-brand bg-brand-soft hover:bg-brand-soft" : "border-line bg-surface hover:bg-surface")}>
              <span className="pr-7 text-[13px] font-normal text-ink">{block.title}</span>
              <span className={cn("absolute right-4 top-4 flex size-[18px] items-center justify-center rounded border", selected ? "border-brand bg-brand text-primary-foreground" : "border-ink-faint/50")}>{selected && <Check className="size-3" />}</span>
              <span className="text-[10px] font-normal leading-[15px] text-ink-dim">{block.role}</span>
              <span className="mt-auto font-mono text-[8px] font-normal leading-[13px] text-ink-faint">{block.examples}</span>
            </Button>;
          })}</div>}

          {step === 1 && <div className="space-y-3.5">{s.blocks.map((block) => {
            const options = [...VENDORS[block], ...s.vendors[block].filter((name) => !VENDORS[block].some((v) => v.name === name)).map((name) => ({ name, popular: false }))];
            return <section key={block} className="rounded-lg border border-line bg-surface p-4"><div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-medium text-ink">{BLOCKS.find((b) => b.id === block)?.title}</h2><span className="text-[9px] text-ink-faint">{s.vendors[block].length} selected</span></div><div className="flex flex-wrap gap-1.5">{options.map((v) => {
              const selected = s.vendors[block].includes(v.name);
              return <Button key={v.name} variant="ghost" aria-pressed={selected} onClick={() => setS({ ...s, vendors: { ...s.vendors, [block]: toggle(s.vendors[block], v.name) } })} className={cn(CHIP, "gap-1", selected ? "border-brand bg-brand-soft text-brand hover:bg-brand-soft" : "border-line text-ink-dim hover:bg-canvas")}>{selected && <Check className="size-3" />}{v.name}{v.popular && <span className="text-[8px] text-p1">★ Popular</span>}</Button>;
            })}</div><form onSubmit={(e) => { e.preventDefault(); addVendor(block); }} className="mt-2.5 flex gap-1.5"><input aria-label={`Another ${block} vendor`} value={custom[block] ?? ""} onChange={(e) => setCustom({ ...custom, [block]: e.target.value })} placeholder="Another vendor? Type its name" className="h-7 min-w-0 flex-1 rounded-full border border-dashed border-line bg-canvas px-2.5 text-[10px] outline-none focus:border-brand" /><Button type="submit" variant="ghost" className={cn(CHIP, "border-line text-brand")}>+ Add</Button></form></section>;
          })}<aside className="rounded-lg border border-line bg-surface p-4"><p className="text-[9px] font-medium text-p1">DID YOU KNOW?</p><p className="mt-1 text-[13px] leading-5 text-ink">Sarvam AI recently made Sarvam-105B its only supported chat model. Every app still calling the 30B model has to migrate.</p><p className="mt-1.5 text-[10px] leading-4 text-ink-faint">A one-line changelog entry, easy to miss, that can break an agent in production. <span className="text-p1">Example from the design reference; not a live finding.</span></p></aside></div>}

          {step === 2 && <div className="space-y-3">{vendors.map((vendor) => <section key={vendor} className="rounded-lg border border-line bg-surface p-4"><div className="flex justify-between gap-4"><h2 className="text-xs font-medium text-ink">{vendor}</h2><span className="text-[9px] text-ink-faint">{BLOCKS.find((b) => s.vendors[b.id].includes(vendor))?.title}</span></div><p className="mb-1.5 mt-2 text-[10px] text-ink-dim">Products you use</p><div className="flex flex-wrap gap-1.5">{(PRODUCTS[vendor] ?? ["All products"]).map((product) => {
            const current = s.products[vendor] ?? [];
            const selected = current.includes(product);
            return <Button key={product} variant="ghost" aria-pressed={selected} onClick={() => setS({ ...s, products: { ...s.products, [vendor]: toggle(current, product) } })} className={cn(CHIP, "gap-1", selected ? "border-brand bg-brand-soft font-medium text-brand hover:bg-brand-soft" : "border-line text-ink-dim hover:bg-canvas")}>{selected && <Check className="size-3" />}{product}</Button>;
          })}</div></section>)}</div>}

          {step === 3 && <div className="divide-y divide-line rounded-lg border border-line bg-surface">{OWNERS.map((owner) => <div key={owner.id} className="grid gap-3 p-4 sm:grid-cols-2"><div><p className="text-[11px] font-medium text-ink">{owner.id === "pricing" ? "Pricing & usage limits" : owner.title}</p><p className="mt-1 text-[10px] leading-4 text-ink-faint">{owner.detail}</p></div><label className="block text-[9px] text-ink-faint">{owner.role}<input type="email" value={s.owners[owner.id] ?? ""} onChange={(e) => setS({ ...s, owners: { ...s.owners, [owner.id]: e.target.value } })} placeholder="teammate@company.com" className="mt-1 h-8 w-full rounded-md border border-line bg-canvas px-2.5 text-[10px] text-ink outline-none focus:border-brand" /></label></div>)}</div>}

          <footer className="mt-5 flex items-center justify-between gap-3">
            {step === 0 ? <p className="max-w-[250px] text-[10px] text-ink-faint">{s.blocks.length} of 3 selected: {BLOCKS.filter((block) => s.blocks.includes(block.id)).map((block) => block.title).join(", ")}</p> : <Button variant="outline" onClick={() => setStep(step - 1)} className="h-9 px-3 text-xs font-normal shadow-none"><ArrowLeft className="size-3" />Back</Button>}
            <div className="flex items-center gap-3">{step === 3 && <Button variant="ghost" onClick={finish} className="text-xs font-normal text-ink-dim">Skip for now</Button>}<Button disabled={!canNext} onClick={() => step === 3 ? finish() : setStep(step + 1)} className={PRIMARY}>{step === 3 ? "Finish setup" : "Continue"}{step < 3 && <ArrowRight className="size-3" />}</Button></div>
          </footer>
        </div>
      )}
    </main>
  );
}
