import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  computeStructuredDiff,
  fetchPageMarkdown,
  hashContent,
} from "@/lib/capture.server";
import { getMockContent } from "@/lib/mock-changelog.server";
import type { Change } from "@/lib/drift-data";

const RunWatchSchema = z.object({
  watch_id: z.string().uuid(),
});

export type RunWatchResult =
  | {
      status: "baseline" | "no_change" | "error";
      diff: null;
      changes: null;
      feed: string[];
      error: string | null;
    }
  | {
      status: "changed";
      diff: string;
      changes: Change[];
      feed: string[];
      error: null;
    };

export const runWatch = createServerFn({ method: "POST" })
  .validator((input) => RunWatchSchema.parse(input))
  .handler(async ({ data }): Promise<RunWatchResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { USAGE_MANIFEST } = await import("@/lib/drift-data");
    const { classifyDiff } = await import("@/lib/classifier.server");

    const { data: watch } = await supabaseAdmin
      .from("watches")
      .select("*")
      .eq("id", data.watch_id)
      .single();

    if (!watch) {
      return { status: "error", diff: null, changes: null, feed: ["watch not found"], error: "Watch not found." };
    }

    const feed: string[] = [`fetching ${watch.url}`];

    // Resolve absolute URL for local mock pages.
    let url = watch.url;
    if (url.startsWith("/")) {
      const requestUrl = getRequestUrl();
      url = new URL(url, requestUrl.origin).toString();
    }

    feed.push("extracting clean text");
    const fetchResult = await fetchPageMarkdown(url, watch.use_firecrawl);
    if (!fetchResult.ok) {
      return {
        status: "error",
        diff: null,
        changes: null,
        feed: [...feed, fetchResult.reason],
        error: fetchResult.reason,
      };
    }
    const markdown = fetchResult.markdown;
    const finalUrl = fetchResult.finalUrl;

    feed.push("hashing content");
    const contentHash = hashContent(markdown);

    feed.push("comparing to last snapshot");
    const { data: lastSnapshot } = await supabaseAdmin
      .from("snapshots")
      .select("id, content_hash, content")
      .eq("watch_id", watch.id)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();

    // No prior snapshot -> store baseline and exit.
    if (!lastSnapshot) {
      await supabaseAdmin.from("snapshots").insert({
        watch_id: watch.id,
        content: markdown,
        content_hash: contentHash,
        fetched_at: now,
      });
      await supabaseAdmin
        .from("watches")
        .update({ last_checked_at: now, last_status: "baseline" })
        .eq("id", watch.id);
      return {
        status: "baseline",
        diff: null,
        changes: null,
        feed: [...feed, "First check — baseline stored, nothing to compare yet."],
        error: null,
      };
    }

    // Hash unchanged -> cheapest exit.
    if (lastSnapshot.content_hash === contentHash) {
      await supabaseAdmin
        .from("watches")
        .update({ last_checked_at: now, last_status: "no_change" })
        .eq("id", watch.id);
      return {
        status: "no_change",
        diff: null,
        changes: null,
        feed: [...feed, "No change since last check."],
        error: null,
      };
    }

    // Content changed -> compute diff and classify.
    feed.push("change detected — computing diff");
    const { diff, hunks } = computeStructuredDiff(lastSnapshot.content, markdown);

    // Store the new snapshot.
    const { data: newSnapshot } = await supabaseAdmin
      .from("snapshots")
      .insert({
        watch_id: watch.id,
        content: markdown,
        content_hash: contentHash,
        fetched_at: now,
      })
      .select("id")
      .single();

    if (!newSnapshot) {
      return {
        status: "error",
        diff: null,
        changes: null,
        feed: [...feed, "Failed to store new snapshot"],
        error: "Failed to store new snapshot.",
      };
    }

    feed.push(`diff: ${hunks} hunk${hunks === 1 ? "" : "s"} — classifying`);

    const classifyResult = await classifyDiff({
      diff,
      vendorHint: watch.vendor,
      manifest: USAGE_MANIFEST,
      today: now.slice(0, 10),
    });

    let changes: Change[] = [];
    if (classifyResult.ok) {
      changes = classifyResult.changes as Change[];
      feed.push(`done, ${changes.filter((c) => c.priority === "P0").length} at P0`);
    } else {
      feed.push(`classifier error: ${classifyResult.error}`);
    }

    await supabaseAdmin.from("changes").insert({
      watch_id: watch.id,
      snapshot_from: lastSnapshot.id,
      snapshot_to: newSnapshot.id,
      diff,
      classifier_output: classifyResult.ok ? { changes } : null,
      detected_at: now,
    });

    await supabaseAdmin
      .from("watches")
      .update({ last_checked_at: now, last_status: "changed" })
      .eq("id", watch.id);

    return {
      status: "changed",
      diff,
      changes,
      feed,
      error: null,
    };
  });

export const listWatches = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("watches").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WatchRow[];
});

export type WatchRow = {
  id: string;
  url: string;
  vendor: string;
  dependency_position: string;
  cadence: string;
  last_checked_at: string | null;
  last_status: string | null;
  use_firecrawl: boolean;
  created_at: string;
};
