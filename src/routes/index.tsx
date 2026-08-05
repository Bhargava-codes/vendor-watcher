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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DriftWatch — Vendor change monitoring for voice AI" },
      {
        name: "description",
        content:
          "DriftWatch reads your vendor pages, spots the changes that touch your live call path, and routes each one to the team that can act on it.",
      },
      { property: "og:title", content: "DriftWatch — Vendor change monitoring for voice AI" },
      {
        property: "og:description",
        content:
          "Catch breaking changes, deprecations and price moves across your STT, LLM and TTS vendors before they reach production.",
      },
    ],
  }),
  component: DriftWatchApp,
});

function DriftWatchApp() {
  const [view, setView] = useState<ViewId>("inbox");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Change | null>(null);
  const [liveChanges, setLiveChanges] = useState<Change[] | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [serverDone, setServerDone] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

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

    try {
      const mock = watches.find((w) => w.url === "/mock/deepgram-changelog");
      if (!mock) {
        setSummary("All done — nothing new since the last check.");
        setServerDone(true);
        return;
      }

      await reset({ data: undefined });
      const result = await run({ data: { watch_id: mock.id } });

      if (result.status === "changed" && result.changes && result.changes.length > 0) {
        // The live run re-derives every Deepgram change from the page, so drop
        // the seeded Deepgram rows and keep the other vendors' history.
        const others = SEED_CHANGES.filter((s) => s.vendor.toLowerCase() !== "deepgram");
        setLiveChanges([...result.changes, ...others]);

        const urgent = result.changes.filter((c) => c.priority === "P0").length;

        setSummary(
          urgent > 0
            ? `All done — ${urgent} change${urgent === 1 ? "" : "s"} need${urgent === 1 ? "s" : ""} your attention`
            : `All done — ${result.changes.length} change${result.changes.length === 1 ? "" : "s"} found`,
        );

      } else if (result.status === "error") {
        setLiveError(result.error ?? "We couldn't read that page.");
        setSummary("All done — one page couldn't be read");
      } else {
        setSummary("All done — nothing new since the last check.");
      }
    } catch {
      setLiveError("Something went wrong on that run. Try again in a moment.");
      setSummary("All done — the run didn't finish cleanly");
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
          {view === "settings" && <SettingsView />}
          {view === "how-it-works" && <HowItWorksView />}
        </main>
      </div>

      <ChangeDrawer change={selected} onClose={() => setSelected(null)} />
      <RunWatchOverlay
        open={overlayOpen}
        serverDone={serverDone}
        summary={summary}
        onClose={closeOverlay}
      />
    </div>
  );
}
