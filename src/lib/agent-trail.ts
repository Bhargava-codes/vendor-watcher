export type TrailStatus = "running" | "ok" | "info" | "warn" | "error";

export type TrailEntry = {
  id: string;
  at: string;
  /** Short action name, e.g. "Visit". */
  action: string;
  /** What the agent did, in plain language. */
  detail: string;
  /** Why it did it — the decision behind the action. */
  reason: string;
  status: TrailStatus;
  /** URL the agent was working on, when relevant. */
  url?: string;
};

let counter = 0;

export function trailEntry(
  action: string,
  detail: string,
  reason: string,
  status: TrailStatus = "ok",
  url?: string,
): TrailEntry {
  counter += 1;
  return {
    id: `t${counter}-${Date.now()}`,
    at: new Date().toISOString(),
    action,
    detail,
    reason,
    status,
    ...(url ? { url } : {}),
  };
}

/**
 * Map a raw server feed line onto a trail entry with a reason, so the log
 * explains the agent's decision instead of just echoing progress.
 */
export function feedLineToEntry(line: string, url?: string): TrailEntry {
  const l = line.toLowerCase();

  if (l.includes("error") || l.includes("failed") || l.includes("couldn't"))
    return trailEntry("Error", line, "Surfaced so the run stays auditable.", "error", url);

  if (l.startsWith("fetching") || l.startsWith("reading"))
    return trailEntry("Visit", line, "Fetching the current version of the page.", "running", url);

  if (l.includes("extracting"))
    return trailEntry(
      "Extract",
      line,
      "Strip chrome, nav and markup so formatting churn can't look like a content change.",
      "ok",
      url,
    );

  if (l.includes("hashing"))
    return trailEntry("Hash", line, "A content hash makes the unchanged case cheap.", "ok", url);

  if (l.includes("comparing"))
    return trailEntry("Compare", line, "Diff against the last stored snapshot.", "ok", url);

  if (l.includes("found") && l.includes("entr"))
    return trailEntry(
      "Discover",
      line,
      "Dated changelog — the agent probes date-addressed entries instead of one page.",
      "ok",
      url,
    );

  if (l.includes("baseline") || l.includes("first check"))
    return trailEntry(
      "Baseline",
      line,
      "Nothing to compare on a first visit, so the agent stores and stops.",
      "info",
      url,
    );

  if (l.includes("no change") || l.includes("nothing new"))
    return trailEntry(
      "Stop",
      line,
      "Hash matched — no diff, no classifier call, no inbox row.",
      "info",
      url,
    );

  if (l.includes("classify") || l.includes("diff:"))
    return trailEntry(
      "Classify",
      line,
      "Only real content diffs reach the LLM; it scores impact against your usage manifest.",
      "ok",
      url,
    );

  if (l.startsWith("done"))
    return trailEntry("Route", line, "Each change is routed to the owning team.", "ok", url);

  return trailEntry("Step", line, "Agent progress.", "ok", url);
}
