import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runScan } from "./workspace.server";

const OWNER_TYPES = ["Development", "Behavior", "Pricing"] as const;

export const saveStack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      items: z.array(z.object({ block: z.string().max(20), vendor: z.string().min(1).max(80), product: z.string().max(120).nullable() })).min(1).max(300),
      owners: z.array(z.object({ type: z.enum(OWNER_TYPES), email: z.string().email().max(255).nullable() })).max(3),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("stack_items").delete().eq("workspace_id", userId);
    const { error } = await supabase.from("stack_items").insert(data.items.map((i) => ({ ...i, workspace_id: userId })));
    if (error) throw new Error("Could not save your stack");
    if (data.owners.length) {
      const { error: oErr } = await supabase.from("owners").upsert(data.owners.map((o) => ({ ...o, workspace_id: userId })), { onConflict: "workspace_id,type" });
      if (oErr) throw new Error("Could not save owners");
    }
    return { ok: true };
  });

export const scanWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => runScan(context.supabase, context.userId));

export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const [stack, owners, alerts, scores] = await Promise.all([
      supabase.from("stack_items").select("vendor, product, block").eq("workspace_id", userId),
      supabase.from("owners").select("type, email").eq("workspace_id", userId),
      supabase.from("alerts").select("id, vendor, product, type, kind, severity, title, why, action, deadline, source_url, published_at, status, sent_to, remind_at, notice_days").eq("workspace_id", userId).gte("published_at", since).order("published_at", { ascending: false }).limit(200),
      supabase.from("scores").select("computed_at, total, per_vendor, per_type, change_count, published_count").eq("workspace_id", userId).order("computed_at", { ascending: false }).limit(30),
    ]);
    return {
      stack: stack.data ?? [],
      owners: owners.data ?? [],
      alerts: alerts.data ?? [],
      scores: (scores.data ?? []).map((s) => ({ ...s, per_vendor: s.per_vendor as Record<string, { score: number | null; weight: number; changes: number; critical: number; high: number; medium: number }>, per_type: s.per_type as Record<string, number> })),
    };
  });

export const updateAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(["open", "resolved"]).optional(), sent_to: z.string().max(255).nullable().optional(), remind_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const patch: { status?: "open" | "resolved"; sent_to?: string | null; remind_at?: string | null } = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.sent_to !== undefined) patch.sent_to = data.sent_to;
    if (data.remind_at !== undefined) patch.remind_at = data.remind_at;
    const id = data.id;
    const { error } = await context.supabase.from("alerts").update(patch).eq("id", id).eq("workspace_id", context.userId);
    if (error) throw new Error("Could not update the alert");
    return { ok: true };
  });
