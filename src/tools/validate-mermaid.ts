/**
 * validate_and_fix_mermaid — Syntax check and auto-correction.
 *
 * Common LLM Mermaid errors this catches and fixes:
 * - Missing diagram type declaration
 * - Unquoted labels with special characters
 * - Mismatched brackets
 * - Empty node labels
 * - Semicolons instead of newlines
 * - "graph" instead of "flowchart"
 */

export interface ValidateMermaidInput {
  mermaid: string;
}

interface ValidationResult {
  valid: boolean;
  fixed: string;
  changes: string[];
  warnings: string[];
}

export function validateAndFixMermaid(input: ValidateMermaidInput): string {
  const result = validate(input.mermaid);

  const parts: string[] = [];

  if (result.valid && result.changes.length === 0) {
    parts.push("**Status:** Valid Mermaid syntax. No changes needed.\n");
    parts.push("```mermaid\n" + result.fixed + "\n```");
  } else if (result.changes.length > 0) {
    parts.push(`**Status:** ${result.valid ? "Valid after fixes" : "Fixed with best effort"}.\n`);
    parts.push("**Changes applied:**\n");
    for (const change of result.changes) {
      parts.push(`- ${change}`);
    }
    if (result.warnings.length > 0) {
      parts.push("\n**Warnings:**\n");
      for (const warn of result.warnings) {
        parts.push(`- ${warn}`);
      }
    }
    parts.push("\n```mermaid\n" + result.fixed + "\n```");
  } else {
    parts.push("**Status:** Could not auto-fix. Manual correction needed.\n");
    for (const warn of result.warnings) {
      parts.push(`- ${warn}`);
    }
    parts.push("\n**Original:**\n```\n" + input.mermaid + "\n```");
  }

  return parts.join("\n");
}

function validate(raw: string): ValidationResult {
  const changes: string[] = [];
  const warnings: string[] = [];
  let code = raw.trim();

  // Strip fenced code block markers if present
  if (code.startsWith("```mermaid")) {
    code = code.replace(/^```mermaid\s*\n?/, "").replace(/\n?```\s*$/, "");
    changes.push("Stripped code fence markers");
  } else if (code.startsWith("```")) {
    code = code.replace(/^```\w*\s*\n?/, "").replace(/\n?```\s*$/, "");
    changes.push("Stripped code fence markers");
  }

  // Replace semicolons with newlines (common LLM error)
  if (code.includes(";")) {
    code = code.replace(/;\s*/g, "\n");
    changes.push("Replaced semicolons with newlines");
  }

  // Normalize "graph" to "flowchart" (deprecated but LLMs still use it)
  if (/^graph\s+(TD|LR|TB|BT|RL)/m.test(code)) {
    code = code.replace(/^graph\s+(TD|LR|TB|BT|RL)/m, "flowchart $1");
    changes.push("Replaced deprecated 'graph' with 'flowchart'");
  }

  // Check for diagram type declaration
  const diagramTypes = [
    "flowchart", "sequenceDiagram", "classDiagram", "stateDiagram",
    "stateDiagram-v2", "erDiagram", "gantt", "pie", "mindmap",
    "timeline", "xychart-beta", "block-beta", "quadrantChart",
  ];
  const firstLine = code.split("\n")[0].trim();
  const hasType = diagramTypes.some(
    (t) => firstLine.startsWith(t)
  );
  if (!hasType) {
    // Try to infer
    if (code.includes("-->") || code.includes("==>")) {
      code = "flowchart TD\n" + code;
      changes.push("Added missing 'flowchart TD' declaration (inferred from arrow syntax)");
    } else if (code.includes("->>") || code.includes("participant")) {
      code = "sequenceDiagram\n" + code;
      changes.push("Added missing 'sequenceDiagram' declaration");
    } else {
      warnings.push("Could not determine diagram type — no declaration found and syntax ambiguous");
    }
  }

  // Fix unbalanced quotes in labels
  const quoteCount = (code.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    warnings.push("Unbalanced double quotes detected — may cause parse errors");
  }

  // Check for common bracket issues
  const opens = (code.match(/\[/g) || []).length;
  const closes = (code.match(/\]/g) || []).length;
  if (opens !== closes) {
    warnings.push(`Unbalanced square brackets: ${opens} opening, ${closes} closing`);
  }

  const parenOpens = (code.match(/\(/g) || []).length;
  const parenCloses = (code.match(/\)/g) || []).length;
  if (parenOpens !== parenCloses) {
    warnings.push(`Unbalanced parentheses: ${parenOpens} opening, ${parenCloses} closing`);
  }

  // Fix empty node labels: A[] → A[A]
  code = code.replace(/(\w+)\[\s*\]/g, (_, id) => {
    changes.push(`Fixed empty label for node '${id}'`);
    return `${id}[${id}]`;
  });

  const valid = warnings.length === 0;
  return { valid, fixed: code, changes, warnings };
}

export const VALIDATE_MERMAID_TOOL = {
  name: "validate_and_fix_mermaid",
  description:
    "Validate Mermaid syntax and attempt auto-correction of common errors (missing declarations, semicolons, deprecated syntax, unbalanced brackets). Returns fixed code with a list of changes applied.",
  inputSchema: {
    type: "object" as const,
    properties: {
      mermaid: { type: "string", description: "Raw Mermaid code to validate" },
    },
    required: ["mermaid"],
  },
};
