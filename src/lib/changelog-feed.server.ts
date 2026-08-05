/**
 * Dated changelog feeds.
 *
 * Some vendors (Deepgram, ElevenLabs) publish their changelog on a docs platform
 * that serves a clean Markdown version of every dated entry at
 *   <base>/YYYY/M/D.md
 * and, for any missing page under that path, a "Similar pages" list that names the
 * most recent entries. That gives us discovery without scraping the JS-rendered
 * index page and without RSS (neither vendor exposes a feed).
 */

import { normalizeWhitespace } from "@/lib/capture.server";

export type FeedEntry = {
  /** ISO date (YYYY-MM-DD) of the changelog entry. */
  date: string;
  /** Canonical .md URL of the entry. */
  url: string;
  markdown: string;
};

type FeedDefinition = {
  vendor: string;
  /** Base path of the changelog, without trailing slash and without `.md`. */
  base: string;
  /** Matches any URL the user might paste for this feed. */
  match: RegExp;
};

export const CHANGELOG_FEEDS: FeedDefinition[] = [
  {
    vendor: "Deepgram",
    base: "https://developers.deepgram.com/changelog",
    match: /^https?:\/\/(developers\.)?deepgram\.com\/changelog\/?$/i,
  },
  {
    vendor: "ElevenLabs",
    base: "https://elevenlabs.io/docs/changelog",
    match: /^https?:\/\/(www\.)?elevenlabs\.io\/docs\/changelog\/?$/i,
  },
];

/** Returns the feed definition when a URL is a known dated changelog, else null. */
export function resolveFeed(url: string): FeedDefinition | null {
  const trimmed = url.trim();
  return CHANGELOG_FEEDS.find((f) => f.match.test(trimmed)) ?? null;
}

const MAX_DATE_PROBES = 30;
const REQUEST_TIMEOUT_MS = 15000;

async function getText(url: string): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "DriftWatch/1.0 (vendor change monitoring)",
        Accept: "text/markdown, text/plain;q=0.9, */*;q=0.5",
      },
    });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

/** Strips the docs-platform preamble ("> For clean Markdown of any page…"). */
function cleanEntryMarkdown(raw: string): string {
  const lines = raw.split("\n");
  let start = 0;
  while (start < lines.length) {
    const line = lines[start]?.trim() ?? "";
    if (line === "" || line.startsWith(">")) {
      start++;
      continue;
    }
    break;
  }
  return normalizeWhitespace(lines.slice(start).join("\n"));
}

function isNotFound(markdown: string): boolean {
  return /^#\s*Page Not Found/im.test(markdown);
}

function entryUrl(base: string, date: Date): string {
  return `${base}/${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()}.md`;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Asks the docs platform for a page that cannot exist; the 'Similar pages' block in
 * the response names the most recent dated entries. Catches entries published
 * outside the date window we probe.
 */
async function discoverFromHint(base: string): Promise<{ date: string; url: string }[]> {
  try {
    const { text } = await getText(`${base}/__driftwatch-discovery.md`);
    const found = new Map<string, string>();
    const re = /\((https?:\/\/[^\s)]*?\/(\d{4})\/(\d{1,2})\/(\d{1,2})\.md)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const [, url, y, mo, d] = m;
      if (!url || !y || !mo || !d) continue;
      const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
      found.set(iso, url);
    }
    return [...found.entries()].map(([date, url]) => ({ date, url }));
  } catch {
    return [];
  }
}

async function fetchEntry(date: string, url: string): Promise<FeedEntry | null> {
  try {
    const { status, text } = await getText(url);
    if (status === 404) return null;
    const markdown = cleanEntryMarkdown(text);
    if (!markdown || isNotFound(markdown)) return null;
    return { date, url, markdown };
  } catch {
    return null;
  }
}

/**
 * Discovers and fetches changelog entries for a feed.
 * Probes the last `windowDays` dates (404s are normal and silently skipped) and
 * merges in whatever the platform's "Similar pages" hint reports.
 */
export async function fetchFeedEntries(
  base: string,
  options: { windowDays?: number; today?: Date } = {},
): Promise<FeedEntry[]> {
  const windowDays = Math.min(options.windowDays ?? 7, MAX_DATE_PROBES);
  const today = options.today ?? new Date();

  const targets = new Map<string, string>();

  for (let i = 0; i < windowDays; i++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    targets.set(isoDate(d), entryUrl(base, d));
  }

  for (const hint of await discoverFromHint(base)) {
    targets.set(hint.date, hint.url);
  }

  const list = [...targets.entries()].slice(0, MAX_DATE_PROBES);

  // Small concurrency so we stay polite with the vendor's docs host.
  const results: FeedEntry[] = [];
  const batchSize = 6;
  for (let i = 0; i < list.length; i += batchSize) {
    const batch = list.slice(i, i + batchSize);
    const settled = await Promise.all(batch.map(([date, url]) => fetchEntry(date, url)));
    for (const entry of settled) if (entry) results.push(entry);
  }

  // Newest first.
  return results.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Renders a newly published entry as an all-additions diff for the classifier. */
export function entryAsDiff(entry: FeedEntry, vendor: string): string {
  const body = entry.markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 200)
    .map((line) => (line.startsWith("#") ? `\n${line}` : `+ ${line}`))
    .join("\n");
  return `## ${vendor} changelog — ${entry.date}\n${body}`;
}
