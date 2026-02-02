/**
 * Safety Enforcement Logic
 *
 * Handles what happens when safety violations are detected
 */

import type { SafetyCheckResult, SafetyConfig, SafetyViolation } from "./types";

/**
 * Default safety configuration
 */
export const DEFAULT_CONFIG: SafetyConfig = {
  enabled: true,
  strictMode: false,
  warnMode: true,
  autoFix: false,
};

/**
 * Enforce safety rules based on configuration
 *
 * @param result - Safety check result
 * @param config - Safety configuration
 * @returns Enforcement action to take
 */
export function enforceSafety(
  result: SafetyCheckResult,
  config: SafetyConfig = DEFAULT_CONFIG
): {
  action: "allow" | "warn" | "block" | "fix";
  message?: string;
  fixes?: Array<{ description: string; apply: () => void }>;
} {
  if (!config.enabled) {
    return { action: "allow" };
  }

  const blockingViolations = result.violations.filter((v) =>
    v.severity === "critical" || (v.severity === "error" && v.block)
  );

  // No blocking violations - allow or warn
  if (blockingViolations.length === 0) {
    if (config.warnMode && result.violations.length > 0) {
      return {
        action: "warn",
        message: `Safety warnings detected:\n${formatViolations(result.violations)}`,
      };
    }
    return { action: "allow" };
  }

  // Blocking violations found
  if (config.strictMode || blockingViolations.some((v) => v.severity === "critical")) {
    return {
      action: "block",
      message: `Operation blocked due to safety violations:\n${formatViolations(blockingViolations)}`,
    };
  }

  // Not in strict mode - show warning
  if (config.warnMode) {
    return {
      action: "warn",
      message: `Safety violations detected (operation allowed due to warn mode):\n${formatViolations(blockingViolations)}`,
    };
  }

  return { action: "allow" };
}

/**
 * Format violations for display
 */
function formatViolations(violations: SafetyViolation[]): string {
  return violations
    .map((v) => `  [${v.rule}] ${v.file}:${v.line}: ${v.message}`)
    .join("\n");
}

/**
 * Check if a file should be excluded from safety checks
 *
 * @param filepath - Path to check
 * @returns Whether file should be excluded
 */
export function isFileExempt(filepath: string): boolean {
  const exemptPatterns = [
    /^test\//,
    /^spec\//,
    /\.test\./,
    /\.spec\./,
    /^tests\//,
    /__tests__/,
    /\/node_modules\//,
    /\.md$/,
    /\.json$/,
    /\.yml$/,
    /\.yaml$/,
    /\/docs\//,
    /\/CLAUDE\.md$/,
  ];

  return exemptPatterns.some((pattern) => pattern.test(filepath));
}
