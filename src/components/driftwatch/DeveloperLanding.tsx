import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Braces,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Eye,
  FileDiff,
  Radar,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  PIPELINE_PRESETS,
  VENDOR_LABEL,
  pipelineFromPreset,
  type DeveloperPipeline,
} from "@/lib/pipeline-data";
import { PipelineCanvas } from "./PipelineCanvas";
import { DiffInspector } from "./DiffInspector";
import { cn } from "@/lib/utils";

export function DeveloperLanding({ onOpenConsole }: { onOpenConsole: () => void }) {
  const { user, profile, signOut } = useAuth();
  const [pipeline, setPipeline] = useState<DeveloperPipeline>(() =>
    pipelineFromPreset("pipecat-voice"),
  );
  const [activePresetId, setActivePresetId] = useState("pipecat-voice");
  const [selectedComponentId, setSelectedComponentId] = useState(
    pipeline.components[0]?.id ?? null,
  );
  const activePreset = PIPELINE_PRESETS.find((preset) => preset.id === activePresetId);
  const selectedComponent =
    pipeline.components.find((component) => component.id === selectedComponentId) ??
    pipeline.components[0];
  const uniqueVendors = useMemo(
    () => Array.from(new Set(pipeline.components.map((component) => component.vendorId))),
    [pipeline.components],
  );

  const choosePreset = (presetId: string) => {
    const next = pipelineFromPreset(presetId);
    setPipeline(next);
    setActivePresetId(presetId);
    setSelectedComponentId(next.components[0]?.id ?? null);
  };

  const updatePipeline = (next: DeveloperPipeline) => {
    setPipeline(next);
    setActivePresetId("custom");
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-2.5" aria-label="DriftWatch home">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-primary-foreground">
              <Radar className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">DriftWatch</span>
            <span className="hidden rounded-md border border-line px-1.5 py-0.5 font-mono text-[9px] text-ink-faint sm:inline">
              BETA
            </span>
          </a>
          <nav className="ml-auto hidden items-center gap-6 text-xs font-medium text-ink-dim md:flex" aria-label="Main navigation">
            <a href="#stack-builder" className="transition-colors hover:text-ink">Stack builder</a>
            <a href="#sample-diff" className="transition-colors hover:text-ink">Sample diff</a>
            <button type="button" onClick={onOpenConsole} className="transition-colors hover:text-ink">
              Live console
            </button>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {user ? (
              <>
                <span className="hidden max-w-40 truncate text-xs text-ink-dim sm:block">{profile?.display_name ?? user.email}</span>
                <button
                  type="button"
                  onClick={() => {
                    void signOut().then(
                      () => toast.success("Signed out."),
                      () => toast.error("Could not sign out. Try again."),
                    );
                  }}
                  className="h-9 rounded-lg px-3 text-xs font-medium text-ink-dim hover:bg-canvas"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="hidden h-9 items-center rounded-lg px-3 text-xs font-medium text-ink-dim hover:bg-canvas sm:inline-flex"
              >
                Sign in
              </Link>
            )}
            <button
              type="button"
              onClick={onOpenConsole}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-brand-hover sm:px-4"
            >
              Open console <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="border-b border-line bg-surface">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:px-8">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-ink-dim">
                <span className="size-1.5 rounded-full bg-ok" />
                Dependency drift monitoring for AI builders
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl lg:text-[56px] lg:leading-[1.05]">
                Ship your agent.
                <span className="block text-brand">We’ll watch the dependencies.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-ink-dim sm:text-lg">
                Stop discovering vendor breaking changes from angry users in production. Tell us your STT, LLM, and TTS stack—we diff the docs, changelogs, and model aliases before they break your bot.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#stack-builder"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-hover"
                >
                  Build your watchlist <ArrowRight className="size-4" />
                </a>
                <button
                  type="button"
                  onClick={onOpenConsole}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-5 text-sm font-medium text-ink transition-colors hover:bg-canvas"
                >
                  <Eye className="size-4" /> Explore live console
                </button>
              </div>
              <p className="mt-4 font-mono text-[10px] text-ink-faint">No credit card · Inspect the demo without an account</p>
            </div>

            <aside className="rounded-2xl border border-line bg-canvas p-4 shadow-[0_20px_60px_-45px_var(--nav)] sm:p-5" aria-label="Current watch plan">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Your watch plan</p>
                <span className="rounded-full bg-p2-soft px-2 py-0.5 font-mono text-[9px] text-p2">LIVE CONFIG</span>
              </div>
              <div className="space-y-2.5 py-4">
                {pipeline.components.slice(0, 4).map((component) => (
                  <div key={component.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
                    <CheckCircle2 className="size-4 shrink-0 text-ok" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink">{VENDOR_LABEL[component.vendorId]}</p>
                      <p className="truncate font-mono text-[10px] text-ink-faint">{component.modelId ?? component.layer}</p>
                    </div>
                    <span className="font-mono text-[9px] uppercase text-ink-faint">{component.modelTracking}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-nav px-3.5 py-3 font-mono text-[10px] leading-5 text-nav-muted">
                <p><span className="text-nav-foreground">if</span> content_hash_changed:</p>
                <p className="pl-3">extract_diff()</p>
                <p className="pl-3">score_stack_impact()</p>
                <p><span className="text-nav-foreground">else</span>: <span className="text-diff-add">skip_llm_call()</span></p>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-ink-faint">Hash-gated checks mean unchanged pages never trigger a paid classification.</p>
            </aside>
          </div>
        </section>

        <section className="border-b border-line bg-canvas px-4 py-5 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs font-medium text-ink-faint lg:justify-between">
            <span className="font-mono text-[9px] uppercase tracking-widest">Built for modern AI stacks</span>
            {["Deepgram", "OpenAI", "ElevenLabs", "Cartesia", "Vapi", "Retell", "Supabase"].map((vendor) => (
              <span key={vendor}>{vendor}</span>
            ))}
          </div>
        </section>

        <section id="stack-builder" className="scroll-mt-20 px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand">01 · Configure your runtime</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Your stack, not a survey.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-dim">Start from a working preset, then edit providers, exact model IDs, and tracking modes inline.</p>
              </div>
              <p className="font-mono text-[10px] text-ink-faint">Changes update the preview instantly</p>
            </div>

            <div className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Starter pipeline presets">
              {PIPELINE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => choosePreset(preset.id)}
                  className={cn(
                    "shrink-0 rounded-lg border px-3 py-2 text-left transition-colors",
                    activePresetId === preset.id
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-line bg-surface text-ink-dim hover:border-brand/50",
                  )}
                >
                  <span className="block text-xs font-medium">{preset.label}</span>
                  <span className="mt-0.5 block font-mono text-[9px] uppercase opacity-75">{preset.archetype}</span>
                </button>
              ))}
              {activePresetId === "custom" && (
                <span className="flex shrink-0 items-center rounded-lg border border-brand bg-brand-soft px-3 py-2 text-xs font-medium text-brand">Custom pipeline</span>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-surface p-3 shadow-[0_16px_50px_-42px_var(--nav)] sm:p-5">
              <PipelineCanvas
                pipeline={pipeline}
                selectedComponentId={selectedComponentId}
                onSelectComponent={setSelectedComponentId}
                onChange={updatePipeline}
              />
            </div>

            {activePreset && (
              <div className="mt-3 flex flex-col gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-[11px] leading-5 text-ink-dim sm:flex-row sm:items-center">
                <p className="flex-1"><span className="font-medium text-ink">Preset note: </span>{activePreset.setupNote}</p>
                <div className="flex shrink-0 gap-3">
                  {activePreset.sourceReferences.slice(0, 1).map((source) => (
                    <a key={source} href={source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
                      Source docs <ExternalLink className="size-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section id="sample-diff" className="scroll-mt-20 border-y border-line bg-surface px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.65fr_1.35fr] lg:items-center">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand">02 · Inspect the signal</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">See the patch, not just the announcement.</h2>
              <p className="mt-4 text-sm leading-6 text-ink-dim">Select any component above to inspect its layer-specific example. Every alert keeps the raw before/after evidence beside the impact analysis.</p>
              <ul className="mt-6 space-y-3 text-sm text-ink-dim">
                <li className="flex items-center gap-2.5"><FileDiff className="size-4 text-brand" /> Exact before and after evidence</li>
                <li className="flex items-center gap-2.5"><ShieldCheck className="size-4 text-brand" /> Priority tied to your actual stack</li>
                <li className="flex items-center gap-2.5"><Braces className="size-4 text-brand" /> Copyable, machine-readable output</li>
              </ul>
              <p className="mt-6 rounded-lg border border-p1/20 bg-p1-soft px-3 py-2 text-[11px] leading-5 text-p1">This inspector uses synthetic examples so it never presents demo content as a current vendor announcement.</p>
            </div>
            {selectedComponent && <DiffInspector component={selectedComponent} />}
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-2xl bg-nav px-6 py-8 text-nav-foreground sm:px-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-nav-muted">Your dependencies already have a changelog</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Catch the two changes that matter. Skip the other 48.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-nav-muted">Create an account to save your setup, or explore the working monitor with the included demo workspace.</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
              {user ? (
                <button type="button" onClick={onOpenConsole} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-primary-foreground hover:bg-brand-hover">
                  Continue to console <ChevronRight className="size-4" />
                </button>
              ) : (
                <Link to="/auth" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-primary-foreground hover:bg-brand-hover">
                  Create free account <ChevronRight className="size-4" />
                </Link>
              )}
              <button type="button" onClick={onOpenConsole} className="inline-flex h-10 items-center justify-center rounded-lg border border-nav-line px-4 text-sm font-medium text-nav-foreground hover:bg-nav-active">
                View demo
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-[11px] text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>DriftWatch · Vendor change monitoring for voice and agentic AI</p>
          <p className="font-mono">diff → classify → route</p>
        </div>
      </footer>
    </div>
  );
}
