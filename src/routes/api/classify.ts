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
