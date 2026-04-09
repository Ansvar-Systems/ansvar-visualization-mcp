/**
 * list_available_diagram_types — Meta-tool for agent reasoning.
 *
 * Returns the full catalog of available diagram/table types with
 * descriptions and when to use each one. Prevents agents from
 * hallucinating tool names.
 */

export interface ListTypesInput {
  category?: "diagrams" | "tables" | "utility" | "all";
}

const CATALOG = {
  diagrams: [
    {
      tool: "create_dfd",
      name: "Data Flow Diagram",
      when: "System architecture, trust zones, data flows between components, boundary crossings",
      output: "Mermaid flowchart with subgraphs for zones",
    },
    {
      tool: "create_sequence",
      name: "Sequence Diagram",
      when: "Multi-party interactions, API flows, incident reporting timelines, authentication flows",
      output: "Mermaid sequenceDiagram with sanitized participant IDs",
    },
    {
      tool: "create_hierarchy",
      name: "Hierarchy / Tree",
      when: "Framework decomposition, control trees, org charts, regulation chapter structure",
      output: "Mermaid flowchart TD",
    },
    {
      tool: "create_attack_tree",
      name: "Attack Tree",
      when: "STRIDE/MITRE ATT&CK analysis, threat modeling, attacker goals with AND/OR branching",
      output: "Mermaid flowchart TD with security-aware styling",
    },
    {
      tool: "create_swimlane",
      name: "Swimlane Diagram",
      when: "Multi-party responsibility flows, TPRM handoffs, DORA responsibility chains",
      output: "Mermaid flowchart LR with subgraph lanes",
    },
    {
      tool: "create_state_diagram",
      name: "State Diagram",
      when: "Compliance lifecycle, document workflow, asset states, incident response stages",
      output: "Mermaid stateDiagram-v2",
    },
    {
      tool: "create_timeline",
      name: "Timeline / Gantt",
      when: "Implementation roadmaps, compliance deadlines, audit schedules, transition periods",
      output: "Mermaid gantt",
    },
    {
      tool: "create_radar_chart",
      name: "Radar / Maturity Chart",
      when: "Maturity assessments, gap analysis scoring across domains, readiness evaluation",
      output: "Markdown table with bars + Mermaid xychart",
    },
  ],
  tables: [
    {
      tool: "create_risk_matrix",
      name: "Risk Matrix (5x5)",
      when: "Risk assessments, threat analysis output, likelihood vs impact scoring",
      output: "Markdown 5x5 grid with color indicators + risk register",
    },
    {
      tool: "create_comparison_table",
      name: "Comparison Table",
      when: "Side-by-side comparison of any items with shared attributes",
      output: "Markdown table",
    },
    {
      tool: "create_traceability_matrix",
      name: "Traceability Matrix",
      when: "Requirements → controls → evidence mapping, compliance gap analysis",
      output: "Markdown cross-reference table with status indicators",
    },
    {
      tool: "create_heatmap_table",
      name: "Heatmap Table",
      when: "CVSS scoring, control coverage, maturity heat maps, multi-framework overview",
      output: "Markdown table with color-coded value indicators",
    },
    {
      tool: "create_comparison_matrix",
      name: "Comparison Matrix (Weighted)",
      when: "Vendor selection, framework comparison, technology evaluation with weighted scoring",
      output: "Markdown weighted scoring table with totals and recommendation",
    },
    {
      tool: "create_regulatory_mapping",
      name: "Regulatory Mapping",
      when: "Regulation articles → controls → gaps, compliance mapping visualization",
      output: "Markdown mapping table + Mermaid relationship graph",
    },
  ],
  utility: [
    {
      tool: "validate_and_fix_mermaid",
      name: "Validate & Fix Mermaid",
      when: "Heuristically check Mermaid code and apply best-effort corrections before rendering",
      output: "Mermaid code with warnings and change log",
    },
    {
      tool: "list_available_diagram_types",
      name: "List Diagram Types",
      when: "Discover what visualization tools are available",
      output: "This catalog",
    },
  ],
};

export function listAvailableTypes(input: ListTypesInput): string {
  const category = input.category ?? "all";
  const parts: string[] = ["### Available Visualization Tools\n"];

  const renderCategory = (name: string, items: typeof CATALOG.diagrams) => {
    parts.push(`**${name}:**\n`);
    parts.push("| Tool | Type | When to Use |");
    parts.push("| --- | --- | --- |");
    for (const item of items) {
      parts.push(`| \`${item.tool}\` | ${item.name} | ${item.when} |`);
    }
    parts.push("");
  };

  if (category === "all" || category === "diagrams") {
    renderCategory("Diagrams (Mermaid output)", CATALOG.diagrams);
  }
  if (category === "all" || category === "tables") {
    renderCategory("Structured Tables (Markdown output)", CATALOG.tables);
  }
  if (category === "all" || category === "utility") {
    renderCategory("Utility", CATALOG.utility);
  }

  return parts.join("\n");
}

export const LIST_TYPES_TOOL = {
  name: "list_available_diagram_types",
  description:
    "List all available visualization tools with descriptions of when to use each one. Use this to discover capabilities before creating diagrams.",
  inputSchema: {
    type: "object" as const,
    properties: {
      category: {
        type: "string",
        enum: ["diagrams", "tables", "utility", "all"],
        description: "Filter by category (default: all)",
      },
    },
  },
};
