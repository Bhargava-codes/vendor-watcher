import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const BodySchema = z.object({
  diff: z.string().min(10).max(20000),
  vendor: z.string().max(60).optional(),
});

export const Route = createFileRoute("/api/classify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Authenticated callers only — this endpoint spends AI credits.
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
        if (!token || token.split(".").length !== 3) {
          return Response.json({ error: "Please sign in to use the classifier." }, { status: 401 });
        }

        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl = process.env["SUPABASE_URL"];
        const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!supabaseUrl || !publishableKey) {
          return Response.json({ error: "Service unavailable." }, { status: 503 });
        }
        const authClient = createClient(supabaseUrl, publishableKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              if (headers.get("Authorization") === `Bearer ${publishableKey}`) headers.delete("Authorization");
              headers.set("apikey", publishableKey);
              headers.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers });
            },
          },
        });
        const { data: claims, error: claimsError } = await authClient.auth.getClaims(token);
        if (claimsError || !claims?.claims?.sub) {
          return Response.json({ error: "Please sign in to use the classifier." }, { status: 401 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request body." }, { status: 400 });
        }


        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Paste a diff between 10 and 20,000 characters." },
            { status: 400 },
          );
        }

        const { classifyDiff } = await import("@/lib/classifier.server");
        const { USAGE_MANIFEST } = await import("@/lib/drift-data");

        const result = await classifyDiff({
          diff: parsed.data.diff,
          vendorHint: parsed.data.vendor,
          manifest: USAGE_MANIFEST,
          today: new Date().toISOString().slice(0, 10),
        });

        if (!result.ok) {
          return Response.json({ error: result.error }, { status: result.status });
        }
        return Response.json({ changes: result.changes });
      },
    },
  },
});
