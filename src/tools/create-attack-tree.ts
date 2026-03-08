/**
 * create_attack_tree — STRIDE/MITRE ATT&CK attack trees.
 *
 * Attacker goal at root, branching through AND/OR gates to leaf
 * attack steps. Mitigated nodes styled differently. Maps directly
 * to threat modeling workflow output.
 */
import { sanitizeLabel, sanitizeId, mermaidBlock, checkDuplicateIds } from "../sanitize.js";

export interface AttackNode {
  id: string;
  label: string;
  parent: string | null;
  gate?: "AND" | "OR";
  type?: "goal" | "sub-goal" | "leaf";
  mitigated?: boolean;
  likelihood?: "low" | "medium" | "high";
}

export interface AttackTreeInput {
  title?: string;
  goal: string;
  nodes: AttackNode[];
}

export function createAttackTree(input: AttackTreeInput): string {
  const lines: string[] = ["flowchart TD"];

  // Find the root node (parent === null), or auto-create from `goal`
  let root = input.nodes.find((n) => n.parent === null);
  if (!root) {
    // Auto-create root from the `goal` field
    root = { id: "attack_goal", label: input.goal, parent: null, type: "goal" };
    const existingIds = new Set(input.nodes.map((n) => n.id));
    input.nodes = [root, ...input.nodes.map((n) => ({
      ...n,
      // Remap orphaned parents (null, undefined, or referencing non-existent node) to root
      parent: (n.parent && existingIds.has(n.parent)) ? n.parent : "attack_goal",
    }))];
  }

  const dupeError = checkDuplicateIds(input.nodes.map((n) => n.id));
  if (dupeError) return `**Error:** ${dupeError}`;

  // Build parent → children map
  const childMap = new Map<string, AttackNode[]>();
  for (const node of input.nodes) {
    if (node.parent !== null) {
      const siblings = childMap.get(node.parent) ?? [];
      siblings.push(node);
      childMap.set(node.parent, siblings);
    }
  }

  // Render all nodes with their shapes
  for (const node of input.nodes) {
    const id = sanitizeId(node.id);
    const label = sanitizeLabel(node.label);
    const type = node.type ?? (node.parent === null ? "goal" : "leaf");

    if (type === "goal") {
      lines.push(`  ${id}{{"${label}"}}`);
    } else if (node.gate === "AND" || node.gate === "OR") {
      // Gate nodes get diamond shape — strip gate prefix from label if already present
      const gateLabel = label.startsWith(`${node.gate}: `) ? label : `${node.gate}: ${label}`;
      lines.push(`  ${id}{"${gateLabel}"}`);
    } else {
      lines.push(`  ${id}["${label}"]`);
    }
  }

  // Render edges
  for (const node of input.nodes) {
    if (node.parent !== null) {
      const parentId = sanitizeId(node.parent);
      const childId = sanitizeId(node.id);
      lines.push(`  ${parentId} --> ${childId}`);
    }
  }

  // Style mitigated nodes
  const mitigatedNodes = input.nodes.filter((n) => n.mitigated);
  if (mitigatedNodes.length > 0) {
    lines.push("");
    for (const node of mitigatedNodes) {
      lines.push(`  style ${sanitizeId(node.id)} fill:#065f46,stroke:#10b981,color:#a7f3d0`);
    }
  }

  // Style root/goal
  lines.push(`  style ${sanitizeId(root.id)} fill:#7f1d1d,stroke:#ef4444,color:#fca5a5`);

  // Style high-likelihood unmitigated nodes
  const criticalNodes = input.nodes.filter(
    (n) => n.likelihood === "high" && !n.mitigated && n.parent !== null
  );
  for (const node of criticalNodes) {
    lines.push(`  style ${sanitizeId(node.id)} fill:#7c2d12,stroke:#f97316,color:#fed7aa`);
  }

  const diagram = mermaidBlock(lines.join("\n"));
  const parts: string[] = [];
  if (input.title) {
    parts.push(`### ${input.title}\n`);
  }
  parts.push(diagram);

  // Legend
  const mitigatedCount = mitigatedNodes.length;
  const totalLeaves = input.nodes.filter((n) => !childMap.has(n.id) && n.parent !== null).length;
  if (totalLeaves > 0) {
    parts.push(
      `\n**Coverage:** ${mitigatedCount}/${totalLeaves} leaf attacks mitigated` +
        (criticalNodes.length > 0 ? ` | ${criticalNodes.length} high-likelihood unmitigated` : "")
    );
  }

  return parts.join("\n");
}

export const CREATE_ATTACK_TREE_TOOL = {
  name: "create_attack_tree",
  description:
    "Create a STRIDE/MITRE ATT&CK attack tree. Attacker goal at root, AND/OR gates for branching conditions, leaf attack steps with mitigation status and likelihood. Returns validated Mermaid flowchart with security-aware styling.",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      goal: { type: "string", description: "Attacker's top-level objective" },
      nodes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
            parent: { type: ["string", "null"], description: "Parent node ID, or null for root" },
            gate: { type: "string", enum: ["AND", "OR"], description: "Gate type for branching nodes" },
            type: { type: "string", enum: ["goal", "sub-goal", "leaf"] },
            mitigated: { type: "boolean", description: "Whether this attack path is mitigated" },
            likelihood: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["id", "label", "parent"],
        },
      },
    },
    required: ["goal", "nodes"],
  },
};
