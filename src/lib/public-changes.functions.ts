import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface PublicChangeHighlight {
  id: string;
  vendor: string;
  section: string;
  before: string;
  after: string;
  changeType: string;
  priority: string;
  interpretation: string;
  routedTo: string;
  entryDate: string;
  entryUrl: string;
  detectedAt: string;
}

export interface PublicChangeHighlightsResult {
  changes: PublicChangeHighlight[];
  error: string | null;
}

export const getPublicChangeHighlights = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicChangeHighlightsResult> => {
    try {
      const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
      const supabasePublic = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) => {
            const headers = new Headers(init?.headers);
            if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
              headers.delete("Authorization");
            }
            headers.set("apikey", key);
            return fetch(input, { ...init, headers });
          },
        },
      });

      const { data, error } = await supabasePublic.rpc("get_public_change_highlights");
      if (error) {
        console.error("Public change highlights unavailable", error.message);
        return { changes: [], error: "Real captures are temporarily unavailable." };
      }

      return {
        changes: data.map((row) => ({
          id: row.id,
          vendor: row.vendor,
          section: row.section,
          before: row.before_text,
          after: row.after_text,
          changeType: row.change_type,
          priority: row.priority,
          interpretation: row.interpretation,
          routedTo: row.routed_to,
          entryDate: row.entry_date,
          entryUrl: row.entry_url,
          detectedAt: row.detected_at,
        })),
        error: null,
      };
    } catch {
      return { changes: [], error: "Real captures are temporarily unavailable." };
    }
  },
);
