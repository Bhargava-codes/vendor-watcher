// Per-workspace pipeline (build spec §6): match stored vendor changes to a stack,
// assign severity, score, and persist. Deterministic: no AI calls happen here.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { actionFor, classifyType, computeScore, deadlineLabel, matchProduct, severityFor, type ClassifiedItem, type ScoredAlert } from "./reliability";

type Client = SupabaseClient<Database>;
const WINDOW_DAYS = 90;

export async function runScan(supabase: Client, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: stack, error: stackErr } = await supabase.from("stack_items").select("vendor, product").eq("workspace_id", userId);
  if (stackErr) throw new Error("Could not load your stack");
  const products: Record<string, string[]> = {};
  for (const s of stack ?? []) {
    products[s.vendor] ??= [];
    if (s.product) products[s.vendor]!.push(s.product);
  }
  const vendors = Object.keys(products);
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000);
  const sinceDay = since.toISOString().slice(0, 10);

  // Global changes are service-only; read them after the caller is verified.
  const { data: rows, error } = vendors.length
    ? await supabaseAdmin
        .from("changes")
        .select("id, classifier_output, entry_date, entry_url, detected_at, watches!inner(vendor, url)")
        .in("watches.vendor", vendors)
        .like("watches.url", "https://%")
        .gte("detected_at", new Date(Date.now() - 90 * 86400000).toISOString())
    : { data: [], error: null };
  if (error) throw new Error("Could not read vendor changes");

  let published = 0;
  const alertRows: Database["public"]["Tables"]["alerts"]["Insert"][] = [];
  for (const row of rows ?? []) {
    const day = row.entry_date ?? row.detected_at.slice(0, 10);
    if (day < sinceDay) continue;
    const vendor = (row.watches as { vendor: string }).vendor;
    const items = ((row.classifier_output as { changes?: ClassifiedItem[] } | null)?.changes ?? []);
    items.forEach((item, index) => {
      published += 1;
      const t = classifyType(item);
      if (!t) return;
      const chosen = products[vendor] ?? [];
      const text = `${item.section ?? ""} ${item.before ?? ""} ${item.after ?? ""} ${item.interpretation ?? ""}`;
      const product = chosen.length ? matchProduct(text, chosen) : null;
      if (chosen.length && !product) return; // filtered: does not touch their products
      const severity = severityFor(item);
      alertRows.push({
        workspace_id: userId,
        change_id: row.id,
        item_index: index,
        vendor,
        product,
        type: t.type,
        kind: t.kind,
        severity,
        title: item.after || item.section || "Vendor change",
        why: item.interpretation ?? null,
        action: actionFor(item),
        deadline: deadlineLabel(item, severity),
        notice_days: item.days_to_impact ?? null,
        source_url: item.entry_url ?? row.entry_url ?? null,
        published_at: day,
      });
    });
  }

  if (alertRows.length) {
    const { error: upErr } = await supabase.from("alerts").upsert(alertRows, { onConflict: "workspace_id,change_id,item_index" });
    if (upErr) throw new Error("Could not save alerts");
  }

  const weights = Object.fromEntries(vendors.map((v) => [v, Math.max(1, products[v]!.length)]));
  const score = computeScore(alertRows.map((a) => ({ vendor: a.vendor, severity: a.severity, type: a.type, kind: a.kind, notice_days: a.notice_days ?? null }) as ScoredAlert), weights);
  await supabase.from("scores").insert({ workspace_id: userId, total: score.total, per_vendor: score.perVendor, per_type: score.perType, change_count: score.changeCount, published_count: published });

  const needAction = alertRows.filter((a) => a.severity !== "Low").length;
  return {
    vendorCount: vendors.length,
    published,
    touching: alertRows.length,
    needAction,
    prodNow: alertRows.filter((a) => a.severity === "Critical").length,
    score: score.total,
  };
}
