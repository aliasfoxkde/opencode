/**
 * Droid-Config Safety Enforcement for OpenCode
 *
 * This module provides code-level safety enforcement that persists
 * across directory changes and works in headless mode.
 *
 * Unlike Claude Code's prompt-based rules, this is enforced at the
 * code level and cannot be bypassed by changing directories.
 */

import type { PluginInput, Hooks } from "@opencode-ai/plugin";

import type {
  SafetyCheckResult,
  SafetyConfig,
  SafetyRule,
  SafetySeverity,
  SafetyViolation,
  ToolContext,
} from "./types";

// Import functions directly for internal use
import { checkSafety, shouldBlockTool } from "./detectors";
import { enforceSafety } from "./enforcement";
import { getSafetyConfig } from "./config";
import { createSafetyHooks } from "./integration";

// Export all types
export type {
  SafetyCheckResult,
  SafetyConfig,
  SafetyRule,
  SafetySeverity,
  SafetyViolation,
  ToolContext,
} from "./types";

// Export detectors
export { checkSafety, shouldBlockTool } from "./detectors";
export { SAFETY_RULES } from "./detectors";

// Export enforcement
export { enforceSafety, isFileExempt } from "./enforcement";
export { DEFAULT_CONFIG } from "./enforcement";

// Export config management
export { getSafetyConfig, loadSafetyConfig, reloadSafetyConfig, validateConfig } from "./config";

// Convenience function for complete safety check
export async function performSafetyCheck(
  content: string,
  filepath: string,
  options?: { strict?: boolean }
): Promise<{
    result: SafetyCheckResult;
    action: "allow" | "warn" | "block" | "fix";
    message?: string;
  }> {
  const config = getSafetyConfig();

  // Override with options if provided
  const effectiveConfig: SafetyConfig = {
    ...config,
    strictMode: options?.strict ?? config.strictMode,
  };

  const result = checkSafety(content, filepath);
  const enforcement = enforceSafety(result, effectiveConfig);

  return {
    result,
    action: enforcement.action,
    message: enforcement.message,
  };
}

/**
 * OpenCode Plugin Entry Point
 *
 * This is the main function that OpenCode calls to initialize the Droid-Config
 * safety enforcement plugin.
 */
export default async function droidSafetyPlugin(input: PluginInput): Promise<Hooks> {
  return createSafetyHooks(input);
}
