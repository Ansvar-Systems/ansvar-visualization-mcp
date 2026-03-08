/**
 * create_dfd — Data Flow Diagram with trust zones and boundary crossings.
 *
 * Follows the DFDModel schema from workflow_service/reports/schemas/dfd.py.
 * Uses Ansvar shape conventions:
 *   [[...]] external entities
 *   [...] processes
 *   [(...)] data stores
 *   ==> trust boundary crossings
 */
import { sanitizeLabel, sanitizeId, mermaidBlock } from "../sanitize.js";

export interface DfdZone {
  id: string;
  label: string;
  trust_level?: "untrusted" | "semi-trusted" | "trusted" | "data" | "cloud" | "external" | "ot";
}

export interface DfdNode {
  id: string;
  label: string;
  type: "external" | "process" | "datastore";
  zone: string;
}

export interface DfdEdge {
  from: string;
  to: string;
  label?: string;
  crosses_boundary?: boolean;
  data_classification?: "public" | "internal" | "auth" | "pii" | "confidential" | "restricted";
}

export interface DfdInput {
  title?: string;
  direction?: "LR" | "TD" | "TB" | "RL";
  zones: DfdZone[];
  nodes: DfdNode[];
  edges: DfdEdge[];
}

const SHAPES: Record<string, [string, string]> = {
  external: ["[[", "]]"],
  process: ["[", "]"],
  datastore: ["[(", ")]"],
};

export function createDfd(input: DfdInput): string {
  const dir = input.direction ?? "LR";
  const lines: string[] = [`flowchart ${dir}`];

  // Build zone → nodes map
  const zoneNodes = new Map<string, DfdNode[]>();
  for (const node of input.nodes) {
    const list = zoneNodes.get(node.zone) ?? [];
    list.push(node);
    zoneNodes.set(node.zone, list);
  }

  // Render zones as subgraphs
  for (const zone of input.zones) {
    const zoneId = sanitizeId(zone.id);
    const zoneLabel = sanitizeLabel(zone.label);
    lines.push(`  subgraph ${zoneId}["${zoneLabel}"]`);

    const nodes = zoneNodes.get(zone.id) ?? [];
    for (const node of nodes) {
      const [left, right] = SHAPES[node.type] ?? SHAPES.process;
      lines.push(`    ${sanitizeId(node.id)}${left}${sanitizeLabel(node.label)}${right}`);
    }

    lines.push("  end");
  }

  // Render nodes not in any zone
  const zonedIds = new Set(input.zones.map((z) => z.id));
  for (const node of input.nodes) {
    if (!zonedIds.has(node.zone)) {
      const [left, right] = SHAPES[node.type] ?? SHAPES.process;
      lines.push(`  ${sanitizeId(node.id)}${left}${sanitizeLabel(node.label)}${right}`);
    }
  }

  // Render edges
  for (const edge of input.edges) {
    const src = sanitizeId(edge.from);
    const dst = sanitizeId(edge.to);
    const arrow = edge.crosses_boundary ? "==>" : "-->";
    if (edge.label) {
      lines.push(`  ${src} ${arrow}|${sanitizeLabel(edge.label)}| ${dst}`);
    } else {
      lines.push(`  ${src} ${arrow} ${dst}`);
    }
  }

  const diagram = mermaidBlock(lines.join("\n"));
  const parts: string[] = [];

  if (input.title) {
    parts.push(`### ${input.title}\n`);
  }
  parts.push(diagram);

  // Add legend for data classifications if any edge uses them
  const classifications = input.edges
    .filter((e) => e.data_classification)
    .map((e) => e.data_classification!);
  if (classifications.length > 0) {
    const unique = [...new Set(classifications)];
    parts.push(
      "\n**Data classification:** " + unique.map((c) => `\`${c}\``).join(", ")
    );
  }

  return parts.join("\n");
}

export const CREATE_DFD_TOOL = {
  name: "create_dfd",
  description:
    "Create a Data Flow Diagram with trust zones, boundary crossings, and typed nodes (external entities, processes, data stores). Returns validated Mermaid flowchart.",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Diagram title" },
      direction: { type: "string", enum: ["LR", "TD", "TB", "RL"], description: "Flow direction (default: LR)" },
      zones: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
            trust_level: { type: "string", enum: ["untrusted", "semi-trusted", "trusted", "data", "cloud", "external", "ot"] },
          },
          required: ["id", "label"],
        },
        description: "Trust zones / security boundaries",
      },
      nodes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
            type: { type: "string", enum: ["external", "process", "datastore"] },
            zone: { type: "string" },
          },
          required: ["id", "label", "type", "zone"],
        },
        description: "System components",
      },
      edges: {
        type: "array",
        items: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" },
            label: { type: "string" },
            crosses_boundary: { type: "boolean" },
            data_classification: { type: "string", enum: ["public", "internal", "auth", "pii", "confidential", "restricted"] },
          },
          required: ["from", "to"],
        },
        description: "Data flows between nodes",
      },
    },
    required: ["zones", "nodes", "edges"],
  },
};
