import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScore, severityFor } from "./reliability.ts";

const many = (vendor, sev, n, extra = {}) => Array.from({ length: n }, () => ({ vendor, severity: sev, type: "Development", kind: "Breaking change", notice_days: null, ...extra }));

test("spec sample: 74/77/82/89 with weights 2/2/1/1 gives 79", () => {
  // OpenAI −26, Anthropic −23, LangGraph −18, Pinecone −11
  const alerts = [
    ...many("OpenAI", "Critical", 1), ...many("OpenAI", "High", 1), ...many("OpenAI", "Medium", 1),
    ...many("Anthropic", "Critical", 1), ...many("Anthropic", "High", 1), ...many("Anthropic", "Low", 1),
    ...many("LangGraph", "Critical", 1), ...many("LangGraph", "Medium", 1), ...many("LangGraph", "Low", 1),
    ...many("Pinecone", "High", 1), ...many("Pinecone", "Medium", 1), ...many("Pinecone", "Low", 1),
  ];
  const r = computeScore(alerts, { OpenAI: 2, Anthropic: 2, LangGraph: 1, Pinecone: 1 });
  assert.equal(r.perVendor.OpenAI.score, 74);
  assert.equal(r.perVendor.Anthropic.score, 77);
  assert.equal(r.perVendor.LangGraph.score, 82);
  assert.equal(r.perVendor.Pinecone.score, 89);
  assert.equal(r.total, 79);
});

test("deprecation with under 30 days' notice costs an extra 10", () => {
  const alerts = [...many("X", "Low", 2), { vendor: "X", severity: "High", type: "Development", kind: "Deprecation", notice_days: 10 }];
  assert.equal(computeScore(alerts, { X: 1 }).perVendor.X.score, 82);
});

test("vendor with fewer than 3 changes is not scored and never shows 100", () => {
  const r = computeScore(many("X", "Low", 2), { X: 1, Y: 1 });
  assert.equal(r.perVendor.X.score, null);
  assert.equal(r.perVendor.Y.score, null);
  assert.equal(r.total, null);
});

test("severity rules", () => {
  assert.equal(severityFor({ change_type: "breaking", days_to_impact: 0 }), "Critical");
  assert.equal(severityFor({ change_type: "behaviour_change", severity: { time_to_impact: "immediate", failure_mode: "silent_regression" } }), "Critical");
  assert.equal(severityFor({ change_type: "deprecation", days_to_impact: 20 }), "High");
  assert.equal(severityFor({ change_type: "pricing", days_to_impact: 60 }), "Medium");
  assert.equal(severityFor({ change_type: "new_capability" }), "Low");
  assert.equal(severityFor({ change_type: "breaking", days_to_impact: 0, priority: "P2" }), "High");
});
