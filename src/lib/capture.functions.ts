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

    // ---- Dated changelog feed (real vendors: Deepgram, ElevenLabs) --------------
    if ((watch as { kind?: string }).kind === "dated_feed") {
      const { resolveFeed, fetchFeedEntries, entryAsDiff } = await import("@/lib/changelog-feed.server");
      const { computeStructuredDiff: diffEntries } = await import("@/lib/capture.server");

      const feed: string[] = [`reading ${watch.vendor} changelog`];
      const definition = resolveFeed(watch.url);
      if (!definition) {
        return {
          status: "error",
          diff: null,
          changes: null,
          feed: [...feed, "not a recognised changelog feed"],
          error: "That page isn't a recognised dated changelog.",
        };
      }

      const nowIso = new Date().toISOString();
      const entries = await fetchFeedEntries(definition.base, { windowDays: 7 });
      feed.push(`found ${entries.length} published entr${entries.length === 1 ? "y" : "ies"}`);

      const { data: existing } = await supabaseAdmin
        .from("snapshots")
        .select("id, entry_date, content, content_hash")
        .eq("watch_id", watch.id)
        .not("entry_date", "is", null);

      const byDate = new Map(
        (existing ?? []).map((s) => [s.entry_date as string, s]),
      );

      const fresh = entries
        .map((entry) => {
          const hash = hashContent(entry.markdown);
          const prior = byDate.get(entry.date);
          if (!prior) return { entry, hash, prior: null as null | { id: string; content: string } };
          if (prior.content_hash === hash) return null;
          return { entry, hash, prior: { id: prior.id, content: prior.content } };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (fresh.length === 0) {
        await supabaseAdmin
          .from("watches")
          .update({ last_checked_at: nowIso, last_status: byDate.size === 0 ? "baseline" : "no_change" })
          .eq("id", watch.id);
        return {
          status: byDate.size === 0 ? "baseline" : "no_change",
          diff: null,
          changes: null,
          feed: [...feed, "Nothing new since the last check."],
          error: null,
        };
      }

      // First ever run: store what's published as the baseline, don't raise alerts
      // for history the team has already lived through.
      if (byDate.size === 0) {
        await supabaseAdmin.from("snapshots").insert(
          fresh.map((f) => ({
            watch_id: watch.id,
            content: f.entry.markdown,
            content_hash: f.hash,
            entry_date: f.entry.date,
            entry_url: f.entry.url,
            fetched_at: nowIso,
          })),
        );
        await supabaseAdmin
          .from("watches")
          .update({ last_checked_at: nowIso, last_status: "baseline" })
          .eq("id", watch.id);
        return {
          status: "baseline",
          diff: null,
          changes: null,
          feed: [...feed, `First check — ${fresh.length} entries stored as the baseline.`],
          error: null,
        };
      }

      const MAX_CLASSIFY = 4;
      const toProcess = fresh.slice(0, MAX_CLASSIFY);
      feed.push(
        `${toProcess.length} new entr${toProcess.length === 1 ? "y" : "ies"} to classify`,
      );

      const allChanges: Change[] = [];
      const diffParts: string[] = [];

      for (const item of toProcess) {
        const diff = item.prior
          ? diffEntries(item.prior.content, item.entry.markdown).diff
          : entryAsDiff(item.entry, watch.vendor);
        diffParts.push(diff);

        const { data: snapshot } = await supabaseAdmin
          .from("snapshots")
          .insert({
            watch_id: watch.id,
            content: item.entry.markdown,
            content_hash: item.hash,
            entry_date: item.entry.date,
            entry_url: item.entry.url,
            fetched_at: nowIso,
          })
          .select("id")
          .single();

        const classified = await classifyDiff({
          diff,
          vendorHint: watch.vendor,
          manifest: USAGE_MANIFEST,
          today: nowIso.slice(0, 10),
        });

        const entryChanges = classified.ok
          ? (classified.changes as Change[]).map((c) => ({
              ...c,
              entry_date: item.entry.date,
              entry_url: item.entry.url,
            }))
          : [];
        allChanges.push(...entryChanges);

        if (snapshot) {
          await supabaseAdmin.from("changes").insert({
            watch_id: watch.id,
            snapshot_from: item.prior?.id ?? null,
            snapshot_to: snapshot.id,
            diff,
            classifier_output: classified.ok ? { changes: entryChanges } : null,
            entry_date: item.entry.date,
            entry_url: item.entry.url,
            detected_at: nowIso,
          });
        }

        if (!classified.ok) feed.push(`classifier error on ${item.entry.date}`);
      }

      await supabaseAdmin
        .from("watches")
        .update({ last_checked_at: nowIso, last_status: "changed" })
        .eq("id", watch.id);

      feed.push(`done, ${allChanges.filter((c) => c.priority === "P0").length} at P0`);

      return {
        status: "changed",
        diff: diffParts.join("\n\n"),
        changes: allChanges,
        feed,
        error: null,
      };
    }
    // ---- Single-page snapshot diff ---------------------------------------------

    const feed: string[] = [`fetching ${watch.url}`];


    // Resolve absolute URL for local mock pages.
    let url = watch.url;
    if (url.startsWith("/")) {
      const requestUrl = getRequestUrl();
      url = new URL(url, requestUrl.origin).toString();
    }

    // Demo shortcut: the mock changelog always simulates the "changed" version so the
    // capture engine can demonstrate diff + classification on every run after a reset.
    let markdown: string;
    let finalUrl = url;
    if (watch.url === "/mock/deepgram-changelog") {
      const version = 2;
      markdown = getMockContent(version);
      finalUrl = `${url}?v=${version}`;
      feed.push("extracting clean text");
    } else {
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
      markdown = fetchResult.markdown;
      finalUrl = fetchResult.finalUrl;
      feed.push("extracting clean text");
    }

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

export const resetMockBaseline = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: watch } = await supabaseAdmin
    .from("watches")
    .select("id")
    .eq("url", "/mock/deepgram-changelog")
    .single();

  if (!watch) {
    return { ok: false as const, error: "Mock watch not found." };
  }

  // Wipe all demo state and re-seed the v1 baseline so the next run detects a change.
  const baselineMarkdown = getMockContent(1);
  await supabaseAdmin.from("changes").delete().eq("watch_id", watch.id);
  await supabaseAdmin.from("snapshots").delete().eq("watch_id", watch.id);
  await supabaseAdmin.from("snapshots").insert({
    watch_id: watch.id,
    content: baselineMarkdown,
    content_hash: "baseline-v1",
  });
  await supabaseAdmin
    .from("watches")
    .update({ last_checked_at: null, last_status: "baseline" })
    .eq("id", watch.id);

  return { ok: true as const };
});

const AddWatchSchema = z.object({
  url: z.string().min(4).max(400),
  role: z.enum(["STT", "LLM", "TTS", "noise-cancel"]),
});

export const addWatch = createServerFn({ method: "POST" })
  .validator((input) => AddWatchSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { inferProvider, positionForRole } = await import("@/lib/watch-utils");
    const { resolveFeed } = await import("@/lib/changelog-feed.server");

    const url = data.url.startsWith("http") || data.url.startsWith("/")
      ? data.url
      : `https://${data.url}`;

    const feedDefinition = resolveFeed(url);

    const { error } = await supabaseAdmin.from("watches").insert({
      url,
      vendor: feedDefinition?.vendor ?? inferProvider(url),
      role: data.role,
      dependency_position: positionForRole(data.role),
      cadence: "manual",
      use_firecrawl: !feedDefinition,
      kind: feedDefinition ? "dated_feed" : "page",
    });


    if (error) return { ok: false as const, error: "Could not add that page." };
    return { ok: true as const };
  });

export const removeWatch = createServerFn({ method: "POST" })
  .validator((input) => z.object({ watch_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("changes").delete().eq("watch_id", data.watch_id);
    await supabaseAdmin.from("snapshots").delete().eq("watch_id", data.watch_id);
    const { error } = await supabaseAdmin.from("watches").delete().eq("id", data.watch_id);
    if (error) return { ok: false as const, error: "Could not remove that page." };
    return { ok: true as const };
  });

export type WatchRow = {
  id: string;
  url: string;
  vendor: string;
  role: string;
  dependency_position: string;
  cadence: string;
  last_checked_at: string | null;
  last_status: string | null;
  use_firecrawl: boolean;
  kind?: string;
  created_at: string;
};

