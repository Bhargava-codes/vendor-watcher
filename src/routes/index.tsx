import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChangeCard, priorityColor } from "@/components/drift/ChangeCard";
import {
  FEED_LINES,
  LIVE_FEED_LINES,
  PRIORITY_ORDER,
  SAMPLE_DIFF,
  SEED_CHANGES,
  type Change,
  type Priority,
} from "@/lib/drift-data";
import { listWatches, resetMockBaseline, runWatch, type RunWatchResult, type WatchRow } from "@/lib/capture.functions";

const watchesQueryOptions = queryOptions({
  queryKey: ["watches"],
  queryFn: () => listWatches(),
});


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dependency Drift Monitor — Vendor watch for voice-AI stacks" },
      {
        name: "description",
        content:
          "Watch STT, LLM, TTS and noise-cancellation vendor pages, classify every change by type and severity against your usage manifest, and get a ranked, routed change report.",
      },
      { property: "og:title", content: "Dependency Drift Monitor — Vendor watch" },
      {
        property: "og:description",
        content:
          "Ranked, routed vendor change reports for voice-AI platforms: deprecations, breaking changes, silent behaviour drift and pricing moves.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DriftMonitor,
  loader: ({ context }) => context.queryClient.ensureQueryData(watchesQueryOptions),
});

function sortChanges(changes: Change[]) {
  const radius = (c: Change) => (typeof c.blast_radius === "number" ? c.blast_radius : 0);
  return [...changes].sort((a, b) => {
    const pa = PRIORITY_ORDER.indexOf(a.priority);
    const pb = PRIORITY_ORDER.indexOf(b.priority);
    if (pa !== pb) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    return radius(b) - radius(a);
  });
}

function DriftMonitor() {
  const { data: watches } = useSuspenseQuery(watchesQueryOptions);
  const runWatchFn = useServerFn(runWatch);
  const [feed, setFeed] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [flagged, setFlagged] = useState<number[]>([]);
  const [trail, setTrail] = useState<string[]>([]);
  const [diff, setDiff] = useState(SAMPLE_DIFF);
  const [error, setError] = useState<string | null>(null);
  const [activeWatchId, setActiveWatchId] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const streamFeed = useCallback((lines: string[], onDone: () => void) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setFeed([]);
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setFeed(lines);
      onDone();
      return;
    }
    lines.forEach((line, i) => {
      timers.current.push(
        setTimeout(() => {
          setFeed((prev) => [...prev, line]);
          if (i === lines.length - 1) onDone();
        }, 380 * (i + 1)),
      );
    });
  }, []);

  const runSeedReport = () => {
    setRunning(true);
    setError(null);
    setChanges(null);
    setFlagged([]);
    setActiveWatchId(null);
    streamFeed(FEED_LINES, () => {
      setChanges(sortChanges(SEED_CHANGES));
      setRunning(false);
      setTrail((t) => [`seed report · ${SEED_CHANGES.length} changes classified`, ...t]);
    });
  };

  const runLiveClassify = async () => {
    if (diff.trim().length < 10) {
      setError("Paste a diff first — at least a couple of changed lines.");
      return;
    }
    setRunning(true);
    setError(null);
    setChanges(null);
    setFlagged([]);
    setActiveWatchId(null);
    streamFeed(LIVE_FEED_LINES, () => {});
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diff }),
      });
      const data = (await res.json()) as { changes?: Change[]; error?: string };
      if (!res.ok || !data.changes) {
        setError(data.error ?? "The classifier could not process that diff.");
        setFeed((f) => [...f, "classify failed"]);
      } else {
        const sorted = sortChanges(data.changes);
        setChanges(sorted);
        setFeed((f) => [...f, `done, ${sorted.filter((c) => c.priority === "P0").length} at P0`]);
        setTrail((t) => [`live classify · ${sorted.length} changes returned`, ...t]);
      }
    } catch {
      setError("Network error reaching the classifier.");
    } finally {
      setRunning(false);
    }
  };

  const runWatchById = async (watch: WatchRow) => {
    setRunning(true);
    setError(null);
    setChanges(null);
    setFlagged([]);
    setActiveWatchId(watch.id);
    setFeed([]);
    try {
      const result = await runWatchFn({ data: { watch_id: watch.id } });
      streamFeed(result.feed, () => {});
      if (result.status === "changed") {
        const sorted = sortChanges(result.changes);
        setChanges(sorted);
        setTrail((t) => [
          `${watch.vendor} watch · ${sorted.length} changes classified`,
          ...t,
        ]);
      } else if (result.status === "error") {
        setError(result.error);
      } else {
        setTrail((t) => [
          `${watch.vendor} watch · ${result.status.replace("_", " ")}`,
          ...t,
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Watch run failed.");
    } finally {
      setRunning(false);
    }
  };

  const runAllWatches = async () => {
    setRunning(true);
    setError(null);
    setChanges(null);
    setFlagged([]);
    setActiveWatchId(null);
    setFeed(["starting multi-vendor run", `fetching ${watches.length} vendor pages`]);
    const results: { watch: WatchRow; result: RunWatchResult }[] = [];
    for (const watch of watches) {
      try {
        const result = await runWatchFn({ data: { watch_id: watch.id } });
        results.push({ watch, result });
        setFeed((f) => [...f, `${watch.vendor}: ${result.status.replace("_", " ")}`]);
      } catch (err) {
        setFeed((f) => [...f, `${watch.vendor}: error`]);
      }
    }
    setFeed((f) => [...f, "done"]);
    const changed = results.filter((r) => r.result.status === "changed");
    if (changed.length > 0) {
      const allChanges = changed.flatMap((r) => r.result.changes ?? []);
      const sorted = sortChanges(allChanges);
      setChanges(sorted);
      setTrail((t) => [
        `run all · ${changed.length} changed, ${sorted.length} changes classified`,
        ...t,
      ]);
    } else {
      setTrail((t) => ["run all · no changes detected", ...t]);
    }
    setRunning(false);
  };

  const tallies: { p: Priority; n: number }[] = (["P0", "P1", "P2", "P3", "noise"] as Priority[])
    .map((p) => ({ p, n: (changes ?? []).filter((c) => c.priority === p).length }))
    .filter((t) => t.n > 0 || t.p !== "P3");

  return (
    <main className="min-h-screen bg-[var(--base)] px-4 py-10 text-[var(--ink)] sm:px-6">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] tracking-[0.22em] text-[var(--beacon)]">
              DEPENDENCY DRIFT MONITOR
            </p>
            <h1 className="mt-2 font-display text-[34px] leading-none font-bold text-[var(--ink)]">
              Vendor watch
            </h1>
            <p className="mt-2 max-w-[52ch] text-[13.5px] text-[var(--ink-dim)]">
              Every vendor page your voice stack depends on, diffed and triaged against your own
              usage — before a change lands in a live call.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runSeedReport}
              disabled={running}
              className="rounded-md border border-[var(--beacon)] px-4 py-2 font-mono text-[12px] font-bold tracking-wide text-[var(--beacon)] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--beacon)] disabled:opacity-50"
            >
              {running ? "running…" : "Run seed report"}
            </button>
            <button
              type="button"
              onClick={runAllWatches}
              disabled={running}
              className="rounded-md bg-[var(--beacon)] px-4 py-2 font-mono text-[12px] font-bold tracking-wide text-[var(--base)] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--beacon)] disabled:opacity-50"
            >
              {running ? "running…" : "Run all watches"}
            </button>
          </div>
        </header>

        <section aria-label="Watched vendors" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-mono text-[11px] tracking-[0.18em] text-[var(--ink-faint)]">
              WATCHES
            </h2>
            <span className="font-mono text-[10px] text-[var(--ink-faint)]">
              {watches.length} watches · server-side fetch · hash cost gate
            </span>
          </div>
          <div className="grid gap-2">
            {watches.map((watch) => (
              <div
                key={watch.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 ${
                  activeWatchId === watch.id ? "ring-1 ring-[var(--beacon)]" : ""
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[14px] font-medium text-[var(--ink)]">
                      {watch.vendor}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--ink-dim)]">
                      {watch.dependency_position}
                    </span>
                    {watch.last_status && (
                      <span
                        className="rounded px-1.5 py-[2px] font-mono text-[9px] tracking-wide"
                        style={{
                          backgroundColor: `var(--${statusColor(watch.last_status)})`,
                          color: "var(--base)",
                        }}
                      >
                        {watch.last_status.replace("_", " ")}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-[var(--ink-faint)]">{watch.url}</span>
                </div>
                <div className="flex items-center gap-2">
                  {watch.last_checked_at && (
                    <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                      {new Date(watch.last_checked_at).toLocaleString()}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => runWatchById(watch)}
                    disabled={running}
                    className="rounded border border-[var(--line)] px-2.5 py-1 font-mono text-[10px] text-[var(--ink-dim)] transition-colors hover:border-[var(--beacon)] hover:text-[var(--beacon)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--beacon)] disabled:opacity-50"
                  >
                    Run watch
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Status feed" className="min-h-[132px] rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-4 font-mono text-[12px] leading-6">
          {feed.length === 0 && (
            <p className="text-[var(--ink-faint)]">
              idle — hit Run watch or Run seed report<span className="drift-cursor">▊</span>
            </p>
          )}
          {feed.map((line, i) => (
            <p key={`${line}-${i}`} className="text-[var(--ink-dim)]">
              <span className="mr-2 text-[var(--beacon)]">›</span>
              {line}
              {i === feed.length - 1 && <span className="drift-cursor ml-1">▊</span>}
            </p>
          ))}
        </section>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-[var(--p0)] bg-[color-mix(in_oklab,var(--p0)_12%,transparent)] p-3 font-mono text-[12px] text-[var(--p0)]"
          >
            {error}
          </p>
        )}

        {changes && (
          <>
            <section className="flex flex-wrap items-center gap-2 border-y border-[var(--line)] py-3">
              {tallies.map(({ p, n }) => (
                <span
                  key={p}
                  className="rounded px-2 py-1 font-mono text-[11px]"
                  style={{
                    backgroundColor: `${priorityColor(p)}1f`,
                    color: priorityColor(p),
                  }}
                >
                  {p} {n}
                </span>
              ))}
              <button
                type="button"
                onClick={() => setShowJson((v) => !v)}
                className="ml-auto rounded border border-[var(--line)] px-2.5 py-1 font-mono text-[11px] text-[var(--ink-dim)] transition-colors hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--beacon)]"
                aria-pressed={showJson}
              >
                {showJson ? "View report" : "View raw JSON"}
              </button>
            </section>

            {showJson ? (
              <pre className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-4 font-mono text-[11.5px] leading-5 text-[var(--ink-dim)]">
                {JSON.stringify({ changes }, null, 2)}
              </pre>
            ) : (
              <section className="flex flex-col gap-3">
                {changes.map((c, i) => (
                  <ChangeCard
                    key={`${c.vendor}-${i}`}
                    change={c}
                    index={i}
                    flagged={flagged.includes(i)}
                    onFlag={(idx) => {
                      setFlagged((f) => (f.includes(idx) ? f : [...f, idx]));
                      setTrail((t) => [
                        `correction logged · ${c.vendor} / ${c.change_type} marked wrong`,
                        ...t,
                      ]);
                    }}
                  />
                ))}
              </section>
            )}
          </>
        )}

        {trail.length > 0 && (
          <section className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
            <h2 className="font-mono text-[11px] tracking-[0.18em] text-[var(--ink-faint)]">
              ACTION TRAIL
            </h2>
            <ul className="mt-2 flex flex-col gap-1">
              {trail.map((t, i) => (
                <li key={`${t}-${i}`} className="font-mono text-[11.5px] text-[var(--ink-dim)]">
                  · {t}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
          <h2 className="font-display text-[16px] font-medium text-[var(--ink)]">
            Classify a real diff (fallback)
          </h2>
          <p className="mt-1 text-[13px] text-[var(--ink-dim)]">
            The primary path is now URL → auto-diff → triage. This box remains for dev/debug when you
            want to paste a before/after chunk directly.
          </p>
          <label htmlFor="diff" className="sr-only">
            Vendor page diff
          </label>
          <textarea
            id="diff"
            value={diff}
            onChange={(e) => setDiff(e.target.value)}
            rows={8}
            spellCheck={false}
            className="mt-3 w-full resize-y rounded border border-[var(--line)] bg-[var(--panel-2)] p-3 font-mono text-[12px] leading-6 text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--beacon)]"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runLiveClassify}
              disabled={running}
              className="rounded-md border border-[var(--beacon)] px-3.5 py-2 font-mono text-[12px] font-bold tracking-wide text-[var(--beacon)] transition-colors hover:bg-[color-mix(in_oklab,var(--beacon)_14%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--beacon)] disabled:opacity-50"
            >
              {running ? "classifying…" : "Classify diff"}
            </button>
            <span className="font-mono text-[11px] text-[var(--ink-faint)]">
              live LLM call · seed report stays available via Run seed report
            </span>
          </div>
        </section>

        <section className="rounded-lg border border-dashed border-[var(--line)] p-4">
          <h2 className="font-mono text-[11px] tracking-[0.18em] text-[var(--ink-faint)]">
            NOT LIVE YET — v2
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--ink-dim)]">
            Scheduled multi-vendor polling · crawler-based change tracking · real Jira/Slack routing
            · vendor-wide blast-radius fan-out · correction feedback loop into the manifest ·
            leadership drift digest.
          </p>
        </section>
      </div>
    </main>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "changed":
      return "p0";
    case "baseline":
      return "beacon";
    case "no_change":
      return "ok";
    case "error":
      return "p0";
    default:
      return "noise";
  }
}
