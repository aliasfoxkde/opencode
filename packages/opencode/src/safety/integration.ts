/**
 * Safety Integration with OpenCode Tool Execution
 *
 * Integrates Droid-Config safety enforcement with OpenCode's tool system
 */

import type { PluginInput, Hooks } from "@opencode-ai/plugin";
import { Log } from "../util/log";
import { checkSafety, shouldBlockTool } from "./detectors";
import { enforceSafety } from "./enforcement";
import { getSafetyConfig } from "./config";
import type { SafetyCheckResult, SafetyConfig } from "./types";

const log = Log.create({ service: "droid-safety-plugin" });

/**
 * Convenience function for complete safety check
 */
async function performSafetyCheck(
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
 * Create safety hooks for OpenCode plugin system
 *
 * These hooks integrate with OpenCode's tool execution flow to enforce
 * safety rules before operations execute.
 */
export function createSafetyHooks(input: PluginInput): Partial<Hooks> {
  const config = getSafetyConfig();

  return {
    /**
     * Hook called before tool execution
     *
     * This is the main enforcement point - we can block operations before they execute.
     */
    "tool.execute.before": async (toolData, toolArgs) => {
      if (!config.enabled) {
        return;
      }

      const tool = toolData.tool;
      const args = toolArgs.args;

      log.debug("Tool execution before hook", { tool, args });

      const blockResult = shouldBlockTool({ tool, args });

      if (blockResult.block) {
        throw new Error(`[DroidConfig Safety] ${blockResult.reason}`);
      }

      // For write/edit operations, perform full safety check
      if (tool === "write" || tool === "edit") {
        const filepath = (args as any).filepath || (args as any).path;
        const content = (args as any).content || (args as any).text || (args as any).body;

        if (filepath && content) {
          const result = await performSafetyCheck(content, filepath, {
            strict: config.strictMode,
          });

          if (result.action === "block") {
            throw new Error(`[DroidConfig Safety] ${result.message}`);
          }

          if (result.action === "warn" && result.message) {
            log.warn("Safety violations detected", {
              file: filepath,
              violations: result.result.violations.length,
            });
          }
        }
      }
    },

    /**
     * Hook called when a chat message is received
     *
     * Can inject safety guidelines into the conversation.
     */
    "chat.message": async (messageData, messageContext) => {
      if (!config.enabled) {
        return;
      }

      log.debug("Chat message hook", messageData);

      const { parts } = messageContext;
      if (!parts) return;

      // Add safety guidance to messages that appear to be creating new code
      const userText = parts
        .map((p: any) => {
          if (p.type === "text" && p.text) {
            return p.text;
          }
          return "";
        })
        .join(" ")
        .toLowerCase();

      if (
        userText.includes("create") ||
        userText.includes("write") ||
        userText.includes("implement") ||
        userText.includes("add code")
      ) {
        const safetyGuidance = `[DroidConfig Safety Guidelines]

When writing code:
- Never use placeholder data (TASK, ISSUE, TODO, etc.)
- Never use mock/test data in production
- Never hardcode secrets or API keys
- Use environment variables for configuration
- Follow security best practices (avoid eval(), etc.)
- Write production-ready code from the start
`.trim();

        // Create a text part with required fields
        // Note: We use partial object since the hook may fill in required IDs
        parts.push({
          type: "text",
          text: safetyGuidance,
        } as any);
      }
    },

    /**
     * Configuration hook - initialize safety system
     */
    config: async (configData: any) => {
      log.info("Droid-Config safety enforcement plugin initialized", {
        config: {
          enabled: config.enabled,
          strictMode: config.strictMode,
          warnMode: config.warnMode,
          autoFix: config.autoFix,
        },
      });
    },
  };
}

/**
 * Safety plugin entry point for OpenCode
 *
 * This is the main function that OpenCode calls to initialize the DroidConfig
 * safety enforcement plugin.
 */
export default async function droidSafetyPlugin(input: PluginInput): Promise<Hooks> {
  return createSafetyHooks(input);
}
