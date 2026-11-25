import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { SEED_CHANGES, type Change } from "@/lib/drift-data";
import {
  addWatch,
  listWatches,
  removeWatch,
  resetMockBaseline,
  runWatch,
} from "@/lib/capture.functions";
import { feedLineToEntry, trailEntry, type TrailEntry } from "@/lib/agent-trail";
import { AgentTrailView } from "@/components/driftwatch/AgentTrailView";
import { Sidebar, type ViewId } from "@/components/driftwatch/Sidebar";
import { Topbar } from "@/components/driftwatch/Topbar";
import { InboxView } from "@/components/driftwatch/InboxView";
import { ChangeDrawer } from "@/components/driftwatch/ChangeDrawer";
import { WatchesView } from "@/components/driftwatch/WatchesView";
import { VendorsView } from "@/components/driftwatch/VendorsView";
import { TrendsView } from "@/components/driftwatch/TrendsView";
import { SettingsView } from "@/components/driftwatch/SettingsView";
import { HowItWorksView } from "@/components/driftwatch/HowItWorksView";
import { RunWatchOverlay } from "@/components/driftwatch/RunWatchOverlay";
import { DeveloperLanding } from "@/components/driftwatch/DeveloperLanding";

export const Route = createFileRoute("/")({
  validateSearch: (search): { view?: "console" } =>
    search["view"] === "console" ? { view: "console" } : {},
  head: () => ({
    meta: [
      { title: "DriftWatch — Dependency drift monitoring for AI builders" },
      {
        name: "description",
        content:
          "Configure your voice or agentic AI stack and catch vendor breaking changes before they reach production.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "DriftWatch — Dependency drift monitoring for AI builders" },
      {
        property: "og:description",
        content:
          "Configure your voice or agentic AI stack and catch vendor breaking changes before they reach production.",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DriftWatchApp,
});

function DriftWatchApp() {
  const search = Route.useSearch();
  const [surface, setSurface] = useState<"landing" | "console">(
    search.view === "console" ? "console" : "landing",
  );

  if (surface === "landing") {
    return <DeveloperLanding onOpenConsole={() => setSurface("console")} />;
  }

  return <MonitoringConsole onOpenBuilder={() => setSurface("landing")} />;
}

function MonitoringConsole({ onOpenBuilder }: { onOpenBuilder: () => void }) {
  const [view, setView] = useState<ViewId>("inbox");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Change | null>(null);
  const [liveChanges, setLiveChanges] = useState<Change[] | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [serverDone, setServerDone] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [trail, setTrail] = useState<TrailEntry[]>([]);

  const queryClient = useQueryClient();
  const list = useServerFn(listWatches);
  const run = useServerFn(runWatch);
  const reset = useServerFn(resetMockBaseline);
  const add = useServerFn(addWatch);
  const remove = useServerFn(removeWatch);

  const watchesQuery = useQuery({
    queryKey: ["watches"],
    queryFn: () => list(),
  });
  const watches = useMemo(() => watchesQuery.data ?? [], [watchesQuery.data]);

  const changes = liveChanges ?? SEED_CHANGES;
  const p0Count = changes.filter((c) => c.priority === "P0").length;

  const handleRun = useCallback(async () => {
    if (overlayOpen) return;
    setOverlayOpen(true);
    setServerDone(false);
    setSummary(null);
    setLiveError(null);
    setTrail([]);

    // A new action means the previous one finished, so settle any spinner.
    const push = (entry: TrailEntry) =>
      setTrail((t) => [
        ...t.map((e) => (e.status === "running" ? { ...e, status: "ok" as const } : e)),
        entry,
      ]);

    try {
      const collected: Change[] = [];
      const errors: string[] = [];
      let ranSomething = false;

      const feeds = watches.filter((w) => w.kind === "dated_feed");
      const mock = watches.find((w) => w.url === "/mock/deepgram-changelog");

      push(
        trailEntry(
          "Plan",
          `${feeds.length + (mock ? 1 : 0)} target(s) queued: ${feeds.length} dated changelog feed(s)${mock ? " + 1 mock page" : ""}`,
          "The agent picks a strategy per watch — date-addressed feeds are read entry by entry, plain pages by whole-page snapshot.",
          "info",
        ),
      );

      // Real vendor changelogs (Deepgram, ElevenLabs) — dated entry feeds.
      for (const feedWatch of feeds) {
        ranSomething = true;
        push(
          trailEntry(
            "Visit",
            `Opening ${feedWatch.vendor} changelog`,
            "Dated feed — probe the recent date window and follow the vendor's own entry index.",
            "running",
            feedWatch.url,
          ),
        );
        const result = await run({ data: { watch_id: feedWatch.id } });
        result.feed.forEach((line) => push(feedLineToEntry(line, feedWatch.url)));

        if (result.status === "changed" && result.changes) {
          collected.push(...result.changes);
          push(
            trailEntry(
              "Report",
              `${result.changes.length} classified change(s) from ${feedWatch.vendor}`,
              "Added to the inbox, ranked by priority and routed to an owner.",
              "ok",
              feedWatch.url,
            ),
          );
        } else if (result.status === "error") {
          errors.push(result.error ?? `We couldn't read ${feedWatch.vendor}.`);
        }
      }

      // The mock Deepgram page keeps the offline demo repeatable.
      let mockChanges: Change[] = [];
      if (mock) {
        ranSomething = true;
        push(
          trailEntry(
            "Reset",
            "Restoring the v1 baseline for the mock page",
            "Keeps the demo repeatable so a change is always detectable on the next visit.",
            "info",
            mock.url,
          ),
        );
        await reset({ data: undefined });
        push(
          trailEntry(
            "Visit",
            "Opening the mock changelog page",
            "Plain page — snapshot the whole document and diff it.",
            "running",
            mock.url,
          ),
        );
        const result = await run({ data: { watch_id: mock.id } });
        result.feed.forEach((line) => push(feedLineToEntry(line, mock.url)));

        if (result.status === "changed" && result.changes) {
          mockChanges = result.changes;
        } else if (result.status === "error") {
          errors.push(result.error ?? "We couldn't read the mock page.");
        }
      }

      const live = [...collected, ...mockChanges];

      if (live.length > 0) {
        // Live runs re-derive Deepgram from source, so drop seeded Deepgram rows
        // and keep the other vendors' history.
        const liveVendors = new Set(live.map((c) => c.vendor.toLowerCase()));
        const others = SEED_CHANGES.filter((s) => !liveVendors.has(s.vendor.toLowerCase()));
        setLiveChanges([...live, ...others]);

        const urgent = live.filter((c) => c.priority === "P0").length;
        setSummary(
          urgent > 0
            ? `All done — ${urgent} change${urgent === 1 ? "" : "s"} need${urgent === 1 ? "s" : ""} your attention`
            : `All done — ${live.length} change${live.length === 1 ? "" : "s"} found`,
        );
      } else if (errors.length > 0) {
        setSummary("All done — some pages couldn't be read");
      } else if (ranSomething) {
        setSummary("All done — nothing new since the last check.");
      } else {
        setSummary("All done — nothing to check yet.");
      }

      if (errors.length > 0) {
        setLiveError(errors[0] ?? null);
        errors.forEach((e) =>
          push(trailEntry("Error", e, "Recorded rather than swallowed — the run continues.", "error")),
        );
      }
    } catch {
      setLiveError("Something went wrong on that run. Try again in a moment.");
      setSummary("All done — the run didn't finish cleanly");
      push(
        trailEntry(
          "Error",
          "The run stopped unexpectedly",
          "Partial results are kept so the trail still shows how far the agent got.",
          "error",
        ),
      );
    } finally {
      setServerDone(true);
      void queryClient.invalidateQueries({ queryKey: ["watches"] });
    }
  }, [overlayOpen, watches, reset, run, queryClient]);


  const closeOverlay = useCallback(() => {
    setOverlayOpen(false);
    setView("inbox");
    toast.success(summary ?? "Run finished");
  }, [summary]);

  const addMutation = useMutation({
    mutationFn: (vars: { url: string; role: string }) =>
      add({ data: { url: vars.url, role: vars.role as "STT" | "LLM" | "TTS" | "noise-cancel" } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Watch added — we'll read it on the next run.");
        void queryClient.invalidateQueries({ queryKey: ["watches"] });
      } else {
        toast.error(res.error);
      }
    },
    onError: () => toast.error("Could not add that page."),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { watch_id: id } }),
    onSuccess: () => {
      toast.success("Watch removed.");
      void queryClient.invalidateQueries({ queryKey: ["watches"] });
    },
    onError: () => toast.error("Could not remove that page."),
  });

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar view={view} onSelect={setView} p0Count={p0Count} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          view={view}
          query={query}
          onQueryChange={setQuery}
          onRun={() => void handleRun()}
          running={overlayOpen}
          onOpenBuilder={onOpenBuilder}
        />

        <main className={`flex-1 overflow-y-auto px-6 py-6 ${overlayOpen ? "blur-sm" : ""}`}>
          {view === "inbox" && (
            <InboxView
              changes={changes}
              query={query}
              onOpen={setSelected}
              liveError={liveError}
            />
          )}
          {view === "watches" && (
            <WatchesView
              watches={watches}
              busy={addMutation.isPending}
              onAdd={async (url, role) => {
                await addMutation.mutateAsync({ url, role });
              }}
              onRemove={async (id) => {
                await removeMutation.mutateAsync(id);
              }}
            />
          )}
          {view === "vendors" && <VendorsView />}
          {view === "trends" && <TrendsView changes={changes} />}
          {view === "trail" && <AgentTrailView entries={trail} />}
          {view === "settings" && <SettingsView />}
          {view === "how-it-works" && <HowItWorksView />}
        </main>
      </div>

      <ChangeDrawer change={selected} onClose={() => setSelected(null)} />
      <RunWatchOverlay
        open={overlayOpen}
        entries={trail}
        serverDone={serverDone}
        summary={summary}
        onClose={closeOverlay}
      />
    </div>
  );
}
