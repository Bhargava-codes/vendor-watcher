// Mooring rules (build spec §4–§5): severity, routing type and the reliability score.
// Pure functions shared by the scan (server) and tests.

export type Severity = "Critical" | "High" | "Medium" | "Low";
export type ChangeKindType = "Development" | "Behavior" | "Pricing";

/** Penalties live in config so they can be tuned without touching the formula. */
export const PENALTY: Record<Severity, number> = { Critical: 15, High: 8, Medium: 3, Low: 0 };
export const SHORT_NOTICE_PENALTY = 10;
export const SHORT_NOTICE_DAYS = 30;
export const MIN_CHANGES_TO_SCORE = 3;
export const SEVERITY_ORDER: Severity[] = ["Critical", "High", "Medium", "Low"];

export type ClassifiedItem = {
  vendor?: string;
  section?: string;
  before?: string;
  after?: string;
  change_type?: string;
  priority?: string;
  interpretation?: string;
  days_to_impact?: number | null;
  deadline_date?: string | null;
  severity?: { certainty?: string; failure_mode?: string; time_to_impact?: string; action_cost?: string };
  entry_url?: string;
};

export function classifyType(item: ClassifiedItem): { type: ChangeKindType; kind: string } | null {
  const text = `${item.section ?? ""} ${item.after ?? ""}`.toLowerCase();
  switch (item.change_type) {
    case "breaking": return { type: "Development", kind: /retir|sunset|removed/.test(text) ? "Retirement" : "Breaking change" };
    case "deprecation": return { type: "Development", kind: /sunset/.test(text) ? "API sunset" : "Deprecation" };
    case "new_capability":
    case "availability":
    case "security": return { type: "Development", kind: item.change_type === "security" ? "Security change" : "New feature" };
    case "behaviour_change": return { type: "Behavior", kind: /alias|repoint|points to/.test(text) ? "Model repointed" : item.severity?.failure_mode === "silent_regression" ? "Default changed" : "Performance shift" };
    case "pricing": return { type: "Pricing", kind: /rate limit|quota|limit/.test(text) ? "Rate limit change" : "Price change" };
    default: return null; // noise / "none"
  }
}

/** §4: Critical = already changing production; High = within 30 days; Medium = after 30 days; Low = no production impact. */
export function severityFor(item: ClassifiedItem): Severity {
  const t = item.change_type;
  const days = item.days_to_impact;
  const sev = item.severity ?? {};
  if (t === "new_capability" || t === "availability") return "Low";
  const immediate = sev.time_to_impact === "immediate" || sev.certainty === "confirmed_now" || (days != null && days <= 0);
  if (immediate && (t === "breaking" || (t === "behaviour_change" && sev.failure_mode === "silent_regression"))) return "Critical";
  if (immediate) return "High";
  if (days != null) return days <= 30 ? "High" : "Medium";
  if (t === "deprecation" || t === "pricing" || t === "breaking") return "Medium";
  return "Low";
}

export function deadlineLabel(item: ClassifiedItem, sev: Severity): string {
  const days = item.days_to_impact;
  if (sev === "Critical") return days != null && days <= 0 ? "Today" : "Before your next deploy";
  if (days != null && days > 0) return `In ${days} days`;
  if (sev === "Low") return "No deadline";
  return "Next release";
}

export type ScoredAlert = { vendor: string; severity: Severity; type: ChangeKindType; kind: string; notice_days: number | null };

export type ScoreResult = {
  total: number | null;
  perVendor: Record<string, { score: number | null; weight: number; changes: number; critical: number; high: number; medium: number }>;
  perType: Record<ChangeKindType, number>;
  changeCount: number;
};

/**
 * §5: dep_v = max(0, 100 − Σ penalty − 10 × deprecations with < 30 days' notice);
 * score = round(Σ w_v·dep_v / Σ w_v), w_v = products of v the workspace uses.
 * Vendors with fewer than MIN_CHANGES_TO_SCORE changes are "Not scored" and left out.
 */
export function computeScore(alerts: ScoredAlert[], weights: Record<string, number>): ScoreResult {
  const perVendor: ScoreResult["perVendor"] = {};
  const perType: Record<ChangeKindType, number> = { Development: 0, Behavior: 0, Pricing: 0 };
  for (const vendor of Object.keys(weights)) perVendor[vendor] = { score: null, weight: Math.max(1, weights[vendor] ?? 1), changes: 0, critical: 0, high: 0, medium: 0 };
  const penalties: Record<string, number> = {};
  for (const a of alerts) {
    const v = (perVendor[a.vendor] ??= { score: null, weight: Math.max(1, weights[a.vendor] ?? 1), changes: 0, critical: 0, high: 0, medium: 0 });
    v.changes += 1;
    if (a.severity === "Critical") v.critical += 1;
    if (a.severity === "High") v.high += 1;
    if (a.severity === "Medium") v.medium += 1;
    let p = PENALTY[a.severity];
    if (a.kind === "Deprecation" && a.notice_days != null && a.notice_days < SHORT_NOTICE_DAYS) p += SHORT_NOTICE_PENALTY;
    penalties[a.vendor] = (penalties[a.vendor] ?? 0) + p;
    perType[a.type] += p;
  }
  let num = 0;
  let den = 0;
  for (const [name, v] of Object.entries(perVendor)) {
    if (v.changes < MIN_CHANGES_TO_SCORE) continue;
    v.score = Math.max(0, 100 - (penalties[name] ?? 0));
    num += v.weight * v.score;
    den += v.weight;
  }
  return { total: den ? Math.round(num / den) : null, perVendor, perType, changeCount: alerts.length };
}

/** A product matches when one of its distinctive words appears in the change text. */
export function matchProduct(text: string, products: string[]): string | null {
  const hay = text.toLowerCase();
  for (const p of products) {
    const words = p.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !["with", "text", "products", "voice"].includes(w));
    if (words.some((w) => hay.includes(w))) return p;
  }
  return null;
}

const ACTIONS: Record<string, string> = {
  config_flip: "Pin the current version or flip the setting before it changes under you.",
  code_change: "Update the integration code and ship before the deadline.",
  re_eval: "Re-run your evals against the new behavior.",
  re_negotiate: "Check the cost impact and adjust your plan or limits.",
};
export function actionFor(item: ClassifiedItem): string | null {
  return ACTIONS[item.severity?.action_cost ?? ""] ?? null;
}
