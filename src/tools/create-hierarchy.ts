/**
 * create_hierarchy — Top-down or left-right tree diagram.
 *
 * Framework decomposition, control trees, organizational charts,
 * ISO 27001 clause structure, regulation chapter breakdowns.
 */
import { sanitizeLabel, sanitizeId, mermaidBlock } from "../sanitize.js";
import { assertUniqueIds } from "./validation.js";

export interface HierarchyNode {
  id: string;
  label: string;
  children?: HierarchyNode[];
}

export interface HierarchyInput {
  title?: string;
  direction?: "TD" | "LR";
  root: HierarchyNode;
}

function renderNode(node: HierarchyNode, lines: string[], depth: number): void {
  const indent = "  ".repeat(depth);
  const nodeId = sanitizeId(node.id);
  const label = sanitizeLabel(node.label);

  // Root gets a different shape
  if (depth === 0) {
    lines.push(`${indent}${nodeId}["${label}"]`);
  } else {
    lines.push(`${indent}${nodeId}["${label}"]`);
  }

  for (const child of node.children ?? []) {
    const childId = sanitizeId(child.id);
    lines.push(`${indent}${nodeId} --> ${childId}`);
    renderNode(child, lines, depth + 1);
  }
}

function collectIds(node: HierarchyNode, ids: string[] = []): string[] {
  ids.push(node.id);
  for (const child of node.children ?? []) {
    collectIds(child, ids);
  }
  return ids;
}

export function createHierarchy(input: HierarchyInput): string {
  assertUniqueIds("hierarchy nodes", collectIds(input.root));

  const dir = input.direction ?? "TD";
  const lines: string[] = [`flowchart ${dir}`];

  renderNode(input.root, lines, 1);

  const diagram = mermaidBlock(lines.join("\n"));
  const parts: string[] = [];
  if (input.title) {
    parts.push(`### ${input.title}\n`);
  }
  parts.push(diagram);
  return parts.join("\n");
}

export const CREATE_HIERARCHY_TOOL = {
  name: "create_hierarchy",
  description:
    "Create a hierarchy/tree diagram from nested nodes. Use for framework decomposition, control trees, regulation structure, org charts. Returns a Mermaid flowchart.",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      direction: { type: "string", enum: ["TD", "LR"], description: "Top-down (default) or left-right" },
      root: {
        type: "object",
        description: "Root node with recursive children",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          children: { type: "array", items: { type: "object" }, description: "Child nodes (same structure, recursive)" },
        },
        required: ["id", "label"],
      },
    },
    required: ["root"],
  },
};
