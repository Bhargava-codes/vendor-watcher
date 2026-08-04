import { createHash } from "crypto";

export function hashContent(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractCleanMarkdown(html: string): string {
  // Remove script/style tags and their contents.
  let text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");

  // Try to extract the <main> element if present.
  const mainMatch = text.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch && mainMatch[1]) text = mainMatch[1];

  // Convert common HTML tags to line breaks / plain text.
  text = text
    .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n")
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  return normalizeWhitespace(text);
}

export type PageSection = {
  heading: string;
  body: string[];
};

function parseSections(lines: string[]): PageSection[] {
  const sections: PageSection[] = [];
  let current: PageSection = { heading: "unknown", body: [] };
  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch && headingMatch[2]) {
      if (current.body.length > 0 || current.heading !== "unknown") {
        sections.push(current);
      }
      current = { heading: headingMatch[2].trim(), body: [] };
    } else if (line.trim()) {
      current.body.push(line.trim());
    }
  }
  if (current.body.length > 0 || current.heading !== "unknown") {
    sections.push(current);
  }
  return sections;
}

function lineDiff(oldLines: string[], newLines: string[]): { removed: string[]; added: string[] } {
  // Normalize lines for comparison: lowercase, collapse spaces, remove punctuation differences.
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const oldNorm = oldLines.map(normalize);
  const newNorm = newLines.map(normalize);
  const oldSet = new Set(oldNorm);
  const newSet = new Set(newNorm);
  const removed = oldLines.filter((_, i) => oldNorm[i] !== undefined && !newSet.has(oldNorm[i]!));
  const added = newLines.filter((_, i) => newNorm[i] !== undefined && !oldSet.has(newNorm[i]!));
  return { removed, added };
}

export function computeStructuredDiff(oldContent: string, newContent: string): { diff: string; hunks: number } {
  const oldSections = parseSections(oldContent.split("\n"));
  const newSections = parseSections(newContent.split("\n"));

  const newByHeading = new Map(newSections.map((s) => [s.heading, s.body]));
  const oldByHeading = new Map(oldSections.map((s) => [s.heading, s.body]));
  const headings = new Set([...oldByHeading.keys(), ...newByHeading.keys()]);

  let hunks = 0;
  const parts: string[] = [];

  for (const heading of headings) {
    const oldBody = oldByHeading.get(heading) ?? [];
    const newBody = newByHeading.get(heading) ?? [];
    if (oldBody.length === 0 && newBody.length === 0) continue;

    const { removed, added } = lineDiff(oldBody, newBody);
    if (removed.length === 0 && added.length === 0) continue;

    hunks++;
    parts.push(`## ${heading}`);
    for (const line of removed) parts.push(`- ${line}`);
    for (const line of added) parts.push(`+ ${line}`);
  }

  return { diff: parts.join("\n"), hunks };
}

export function fetchWithTimeout(url: string, timeoutMs = 15000, maxBytes = 5 * 1024 * 1024): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    signal: controller.signal,
    headers: {
      "User-Agent": "DependencyDriftMonitor/1.0 (+https://lovable.dev)",
      Accept: "text/html, text/plain, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8",
    },
    redirect: "follow",
  }).then((res) => {
    clearTimeout(timer);
    if (res.status === 404) return res;
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return res;
  });
}

export async function fetchPageMarkdown(url: string, useFirecrawl: boolean): Promise<{
  ok: true;
  markdown: string;
  finalUrl: string;
} | { ok: false; reason: string; shouldRetry: boolean }> {
  // Firecrawl path is reserved for real vendor pages; if requested, the caller must have configured it.
  if (useFirecrawl) {
    return { ok: false, reason: "Firecrawl not configured in this environment — use the mock page or connect Firecrawl.", shouldRetry: false };
  }

  try {
    const res = await fetchWithTimeout(url);
    if (res.status === 404) {
      return { ok: false, reason: "404 — page not found", shouldRetry: false };
    }
    const contentType = res.headers.get("content-type") ?? "";
    let text: string;
    if (contentType.includes("text/plain") || contentType.includes("text/markdown")) {
      text = await res.text();
    } else {
      const html = await res.text();
      text = extractCleanMarkdown(html);
    }
    const normalized = normalizeWhitespace(text);
    if (!normalized) {
      return { ok: false, reason: "No readable content extracted — the page may be JS-rendered or require a headless fetch.", shouldRetry: false };
    }
    return { ok: true, markdown: normalized, finalUrl: res.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes("abort") || message.includes("timeout");
    return { ok: false, reason: isTimeout ? "Request timed out" : `Fetch failed: ${message}`, shouldRetry: isTimeout };
  }
}
