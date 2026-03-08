/**
 * Tool registry — maps tool names to handlers and schema definitions.
 */
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { createDfd, CREATE_DFD_TOOL } from "./create-dfd.js";
import { createSequence, CREATE_SEQUENCE_TOOL } from "./create-sequence.js";
import { createHierarchy, CREATE_HIERARCHY_TOOL } from "./create-hierarchy.js";
import { createAttackTree, CREATE_ATTACK_TREE_TOOL } from "./create-attack-tree.js";
import { createSwimlane, CREATE_SWIMLANE_TOOL } from "./create-swimlane.js";
import { createStateDiagram, CREATE_STATE_DIAGRAM_TOOL } from "./create-state-diagram.js";
import { createTimeline, CREATE_TIMELINE_TOOL } from "./create-timeline.js";
import { createRadarChart, CREATE_RADAR_CHART_TOOL } from "./create-radar-chart.js";
import { createRiskMatrix, CREATE_RISK_MATRIX_TOOL } from "./create-risk-matrix.js";
import { createComparisonTable, CREATE_COMPARISON_TABLE_TOOL } from "./create-comparison-table.js";
import { createTraceabilityMatrix, CREATE_TRACEABILITY_MATRIX_TOOL } from "./create-traceability-matrix.js";
import { createHeatmapTable, CREATE_HEATMAP_TABLE_TOOL } from "./create-heatmap-table.js";
import { createComparisonMatrix, CREATE_COMPARISON_MATRIX_TOOL } from "./create-comparison-matrix.js";
import { createRegulatoryMapping, CREATE_REGULATORY_MAPPING_TOOL } from "./create-regulatory-mapping.js";
import { validateAndFixMermaid, VALIDATE_MERMAID_TOOL } from "./validate-mermaid.js";
import { listAvailableTypes, LIST_TYPES_TOOL } from "./list-types.js";

// All tool definitions for ListTools response
export const TOOL_DEFINITIONS: Tool[] = [
  CREATE_DFD_TOOL,
  CREATE_SEQUENCE_TOOL,
  CREATE_HIERARCHY_TOOL,
  CREATE_ATTACK_TREE_TOOL,
  CREATE_SWIMLANE_TOOL,
  CREATE_STATE_DIAGRAM_TOOL,
  CREATE_TIMELINE_TOOL,
  CREATE_RADAR_CHART_TOOL,
  CREATE_RISK_MATRIX_TOOL,
  CREATE_COMPARISON_TABLE_TOOL,
  CREATE_TRACEABILITY_MATRIX_TOOL,
  CREATE_HEATMAP_TABLE_TOOL,
  CREATE_COMPARISON_MATRIX_TOOL,
  CREATE_REGULATORY_MAPPING_TOOL,
  VALIDATE_MERMAID_TOOL,
  LIST_TYPES_TOOL,
];

// Dispatch function: tool name → handler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (args: any) => string;

const HANDLERS: Record<string, Handler> = {
  create_dfd: createDfd,
  create_sequence: createSequence,
  create_hierarchy: createHierarchy,
  create_attack_tree: createAttackTree,
  create_swimlane: createSwimlane,
  create_state_diagram: createStateDiagram,
  create_timeline: createTimeline,
  create_radar_chart: createRadarChart,
  create_risk_matrix: createRiskMatrix,
  create_comparison_table: createComparisonTable,
  create_traceability_matrix: createTraceabilityMatrix,
  create_heatmap_table: createHeatmapTable,
  create_comparison_matrix: createComparisonMatrix,
  create_regulatory_mapping: createRegulatoryMapping,
  validate_and_fix_mermaid: validateAndFixMermaid,
  list_available_diagram_types: listAvailableTypes,
};

/**
 * Validate required fields against the tool's inputSchema.
 * Returns an error message if validation fails, null if OK.
 */
function validateRequired(toolName: string, args: Record<string, unknown>): string | null {
  const tool = TOOL_DEFINITIONS.find((t) => t.name === toolName);
  if (!tool) return null;

  const schema = tool.inputSchema as { required?: string[]; properties?: Record<string, unknown> };
  const required = schema.required ?? [];

  const missing = required.filter((field) => args[field] === undefined || args[field] === null);
  if (missing.length > 0) {
    return `Missing required field(s): ${missing.join(", ")}`;
  }
  return null;
}

export function dispatch(
  toolName: string,
  args: Record<string, unknown>
): { content: Array<{ type: "text"; text: string }>; isError?: boolean } {
  const handler = HANDLERS[toolName];
  if (!handler) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
      isError: true,
    };
  }

  // Validate required fields before calling handler
  const validationError = validateRequired(toolName, args);
  if (validationError) {
    return {
      content: [{ type: "text", text: `Validation error: ${validationError}` }],
      isError: true,
    };
  }

  try {
    const result = handler(args);
    return { content: [{ type: "text", text: result }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Tool error: ${message}` }],
      isError: true,
    };
  }
}
