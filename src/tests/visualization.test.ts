import assert from "node:assert/strict";
import test from "node:test";

import { dispatch } from "../tools/registry.js";

test("create_risk_matrix rejects out-of-range scores", async () => {
  const result = await dispatch("create_risk_matrix", {
    risks: [{ id: "R-1", label: "Broken", likelihood: 7, impact: 0 }],
  });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /must be between 1 and 5/);
});

test("create_heatmap_table rejects mismatched dimensions", async () => {
  const result = await dispatch("create_heatmap_table", {
    rows: ["row-1", "row-2"],
    columns: ["col-1", "col-2"],
    values: [[1, 2]],
  });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /must contain 2 row/);
});

test("create_dfd rejects edges that reference unknown nodes", async () => {
  const result = await dispatch("create_dfd", {
    zones: [{ id: "trusted", label: "Trusted" }],
    nodes: [{ id: "api", label: "API", type: "process", zone: "trusted" }],
    edges: [{ from: "ghost", to: "api" }],
  });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /unknown node/);
});

test("create_traceability_matrix counts covered as met in the summary", async () => {
  const result = await dispatch("create_traceability_matrix", {
    requirements: [{ id: "REQ-1", label: "Requirement" }],
    controls: [{ id: "CTRL-1", label: "Control" }],
    mappings: [{ requirement: "REQ-1", control: "CTRL-1", status: "covered" }],
  });

  assert.equal(result.isError, undefined);
  assert.match(result.content[0].text, /\*\*Coverage:\*\* 1 met/);
});

test("validate_and_fix_mermaid stops claiming broken flowcharts are valid", async () => {
  const result = await dispatch("validate_and_fix_mermaid", {
    mermaid: "flowchart TD\nthis is not mermaid",
  });

  assert.equal(result.isError, undefined);
  assert.doesNotMatch(result.content[0].text, /Parser validation passed/);
  assert.match(result.content[0].text, /Parser validation failed|Manual correction/);
});

test("validate_and_fix_mermaid uses parser-backed validation for fixed flowcharts", async () => {
  const result = await dispatch("validate_and_fix_mermaid", {
    mermaid: "graph TD; A-->B",
  });

  assert.equal(result.isError, undefined);
  assert.match(result.content[0].text, /Parser validation passed/);
  assert.match(result.content[0].text, /flowchart/);
});

test("create_radar_chart output passes central parser validation", async () => {
  const result = await dispatch("create_radar_chart", {
    title: "Maturity",
    dimensions: [{ name: "Access Control", current: 3, target: 4 }],
  });

  assert.equal(result.isError, undefined);
  assert.match(result.content[0].text, /```mermaid/);
});
