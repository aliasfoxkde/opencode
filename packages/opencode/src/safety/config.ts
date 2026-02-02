/**
 * Safety Configuration Management
 *
 * Loads and manages safety configuration from Droid-Config
 */

import type { SafetyConfig } from "./types";
import { DEFAULT_CONFIG } from "./enforcement";

import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Default configuration file locations
 */
const CONFIG_PATHS = [
  "/home/mkinney/repos/Droid-Config/config/safety/opencode.json",
  "/home/mkinney/.config/safety/opencode.json",
  "/home/mkinney/repos/Droid-Config/.claude/rules/safety-rules.md",
];

/**
 * Load safety configuration from Droid-Config
 *
 * @returns Safety configuration
 */
export function loadSafetyConfig(): SafetyConfig {
  // Try to load from JSON config file
  for (const configPath of CONFIG_PATHS) {
    if (configPath.endsWith(".json") && existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, "utf-8");
        const config = JSON.parse(content);
        return {
          ...DEFAULT_CONFIG,
          ...config,
        };
      } catch (error) {
        // Invalid JSON, continue to next path
        continue;
      }
    }
  }

  // No config file found, use defaults
  return DEFAULT_CONFIG;
}

/**
 * Get current safety configuration
 *
 * @returns Current safety configuration
 */
let currentConfig: SafetyConfig | null = null;

export function getSafetyConfig(): SafetyConfig {
  if (!currentConfig) {
    currentConfig = loadSafetyConfig();
  }
  return currentConfig;
}

/**
 * Reload safety configuration from disk
 *
 * @returns Reloaded configuration
 */
export function reloadSafetyConfig(): SafetyConfig {
  currentConfig = loadSafetyConfig();
  return currentConfig;
}

/**
 * Validate safety configuration
 *
 * @param config - Configuration to validate
 * @returns Whether configuration is valid
 */
export function validateConfig(config: any): config is SafetyConfig {
  return (
    typeof config === "object" &&
    config !== null &&
    typeof config.enabled === "boolean" &&
    typeof config.strictMode === "boolean" &&
    typeof config.warnMode === "boolean" &&
    typeof config.autoFix === "boolean"
  );
}
