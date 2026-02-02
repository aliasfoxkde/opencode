/**
 * Safety Rule Type Definitions
 *
 * Defines the structure for safety rules used in Droid-Config integration
 */

/**
 * Severity levels for safety violations
 */
export type SafetySeverity = "warning" | "error" | "critical";

/**
 * Safety rule definition
 */
export interface SafetyRule {
  /** Unique identifier for the rule */
  name: string;

  /** Regex pattern to detect violations */
  pattern: RegExp;

  /** Severity level of this violation */
  severity: SafetySeverity;

  /** Whether to block the operation when violated */
  block: boolean;

  /** Human-readable message explaining the violation */
  message: string;

  /** File patterns to exclude from this check */
  exclusions?: string[];
}

/**
 * Safety violation details
 */
export interface SafetyViolation {
  /** Rule that was violated */
  rule: string;

  /** Line number where violation occurred */
  line: number;

  /** File where violation occurred */
  file: string;

  /** Human-readable message */
  message: string;

  /** Severity of the violation */
  severity: SafetySeverity;

  /** Whether to block the operation when violated */
  block?: boolean;
}

/**
 * Result of a safety check
 */
export interface SafetyCheckResult {
  /** Whether the content is safe (no blocking violations) */
  safe: boolean;

  /** All violations found (including warnings) */
  violations: SafetyViolation[];

  /** Count by severity */
  summary: {
    critical: number;
    error: number;
    warning: number;
  };
}

/**
 * Safety configuration
 */
export interface SafetyConfig {
  /** Whether safety enforcement is enabled */
  enabled: boolean;

  /** Whether to run in strict mode (all violations block) */
  strictMode: boolean;

  /** Whether to show warnings for non-blocking violations */
  warnMode: boolean;

  /** Whether to automatically fix issues when possible */
  autoFix: boolean;
}

/**
 * Tool execution context
 */
export interface ToolContext {
  /** Tool being executed */
  tool: string;

  /** Arguments passed to the tool */
  args: Record<string, any>;

  /** File path being operated on (if applicable) */
  filepath?: string;

  /** Content being written (if applicable) */
  content?: string;

  /** Current working directory */
  cwd?: string;
}
