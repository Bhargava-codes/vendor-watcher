# Mooring backend follow-up — not implemented in the UI pass

1. Persist setup: authenticated workspace membership, vendor/product selections and owner routing. Use managed Drizzle migrations and tenant-scoped access policies; migrate browser-only selections after sign-in.
2. Connect first scan: reuse existing safe capture, dated-feed discovery, diff and classifier paths. Return actual scan progress and stored results, not timer-driven sample numbers. Checks remain manual; no scheduled jobs.
3. Personalize Home: match verified vendor events to selected products, preserve source links and reasoning, and store acknowledgement/assignment state. Keep illustrative design data separate from real findings.
4. Calculate reliability: implement the supplied specification's deterministic formula, with tests for penalties, notice periods and the rolling window. The PDF's 79 and category deductions are examples, not constants.
5. Connect routing: authenticated Send actions, verified destinations, delivery status and retry/idempotency handling. Configure email/ticket/webhook services separately; never report a successful delivery from a UI-only click.
6. Verify accounts: test new-user setup and returning-user Home journeys. Review supported social providers separately; changing the UI does not remove managed OAuth consent.

Implement each stage separately with authorization tests and an end-to-end signed-in verification. No backend schema, classifier, scheduling or integration changes were made in the UI pass.