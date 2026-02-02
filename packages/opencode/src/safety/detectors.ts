/**
 * Safety Pattern Detectors
 *
 * Detects various anti-patterns in code that violate safety rules
 */

import type { SafetyRule, SafetyViolation, SafetyCheckResult } from "./types";

/**
 * Core safety rules for Droid-Config
 *
 * These patterns are derived from .claude/rules/safety-rules.md and
 * represent the minimum safety standards for production code.
 */
export const SAFETY_RULES: SafetyRule[] = [
  {
    name: "incomplete_marker",
    // Detects: TASK, ISSUE, WORKAROUND, etc.
    pattern: /\b(TASK|ISSUE|WORKAROUND|TO_BE_DETERMINED|TO_BE_COMPLETED)\b/i,
    severity: "warning",
    block: false,
    message: "Incomplete marker detected - replace with actual implementation",
    exclusions: ["docs/", "README.md", "CLAUDE.md"],
  },
  {
    name: "test_data_in_production",
    // Detects: mock, test, dummy, fake, sample data/value/example
    // But excludes test files themselves
    pattern: /\b(mock|test|dummy|fake|sample)\s*(data|value|example|user|class|function)/i,
    severity: "error",
    block: true,
    message: "Test data not allowed in production code - use realistic data",
    exclusions: ["test/", "spec/", "__tests__/", ".test.", ".spec.", "tests/"],
  },
  {
    name: "secret_exposed",
    // Detects: api_key, secret, password, token, private_key
    pattern: /\b(api_key|apikey|api-key|secret|password|token|private_key|auth_token)\s*[:=]\s*['"`]/i,
    severity: "critical",
    block: true,
    message: "Secret detected - use environment variables for secrets",
  },
  {
    name: "dangerous_eval",
    // Detects: eval(), new Function(), etc.
    pattern: /\beval\s*\(|\bnew\s+Function\s*\(|\bsetTimeout\s*\(\s*['"`]|dangerouslySetInnerHTML/i,
    severity: "error",
    block: true,
    message: "Dangerous code pattern detected - use safer alternatives",
    exclusions: ["tests/", "spec/"],
  },
  {
    name: "hardcoded_url",
    // Detects: http:// hardcoded URLs (but allow localhost and private networks)
    pattern: /https?:\/\/(?!localhost|127\.0\.0\.1|192\.168\.|10\.|0\.0\.0\.0)[^\s"'>]+/i,
    severity: "warning",
    block: false,
    message: "Hardcoded URL detected - use configuration instead",
    exclusions: ["docs/", "README.md", "CLAUDE.md"],
  },
];

/**
 * Check content for safety violations
 *
 * @param content - File content to check
 * @param filepath - Path to the file being checked
 * @returns Safety check result with all violations
 */
export function checkSafety(content: string, filepath: string): SafetyCheckResult {
  const violations: SafetyViolation[] = [];
  const lines = content.split("\n");

  for (const rule of SAFETY_RULES) {
    // Check if file is in exclusion list
    const isExcluded = rule.exclusions?.some((pattern) =>
      filepath.includes(pattern)
    );

    if (isExcluded) {
      continue; // Skip this rule for this file
    }

    // Check each line for violations
    for (let i = 0; i < lines.length; i++) {
      if (rule.pattern.test(lines[i])) {
        violations.push({
          rule: rule.name,
          line: i + 1,
          file: filepath,
          message: rule.message,
          severity: rule.severity,
          block: rule.block,
        });
      }
    }
  }

  // Count by severity
  const summary = {
    critical: violations.filter((v) => v.severity === "critical").length,
    error: violations.filter((v) => v.severity === "error").length,
    warning: violations.filter((v) => v.severity === "warning").length,
  };

  // Determine if content is safe (no blocking violations)
  const blockingViolations = violations.filter((v) =>
    v.severity === "critical" || (v.severity === "error" && v.block)
  );

  return {
    safe: blockingViolations.length === 0,
    violations,
    summary,
  };
}

/**
 * Check if a tool execution should be blocked based on safety rules
 *
 * @param context - Tool execution context
 * @returns Whether the tool should be blocked
 */
export function shouldBlockTool(context: {
  tool: string;
  args: Record<string, any>;
}): { block: boolean; reason?: string } {
  // Only check write/edit operations
  const { tool, args } = context;

  if (tool !== "write" && tool !== "edit") {
    return { block: false };
  }

  const filepath = args.filepath || args.path;
  const content = args.content || args.text || args.body;

  if (!filepath || !content) {
    return { block: false };
  }

  const result = checkSafety(content, filepath);

  if (!result.safe) {
    const critical = result.violations.filter((v) =>
      v.severity === "critical" || v.severity === "error"
    );

    if (critical.length > 0) {
      return {
        block: true,
        reason: `Safety violations detected in ${filepath}:\n${result.violations
          .filter((v) => v.severity === "critical" || v.severity === "error")
          .map((v) => `  [${v.rule}] Line ${v.line}: ${v.message}`)
          .join("\n")}`,
      };
    }
  }

  return { block: false };
}
