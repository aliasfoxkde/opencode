/**
 * Safety Integration with OpenCode Tool Execution
 *
 * Integrates Droid-Config safety enforcement with OpenCode's tool system
 */

import type { PluginInput, Hooks } from "@opencode-ai/plugin";
import { Log } from "../util/log";

const log = Log.create({ service: "droid-safety-plugin" });

import { checkSafety, shouldBlockTool, performSafetyCheck, getSafetyConfig } from "./index";

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
      const args = toolArgs;

      log.debug("Tool execution before hook", { tool, args });

      const blockResult = shouldBlockTool({ tool, args });

      if (blockResult.block) {
        throw new Error(`[DroidConfig Safety] ${blockResult.reason}`);
      }

      // For write/edit operations, perform full safety check
      if (tool === "write" || tool === "edit") {
        const filepath = args.filepath || args.path;
        const content = args.content || args.text || args.body;

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
      const userText = parts.map((p: any) => p.text || "").join(" ").toLowerCase();

      if (userText.includes("create") ||
          userText.includes("write") ||
          userText.includes("implement") ||
          userText.includes("add code")) {

        const safetyGuidance = `
[DroidConfig Safety Guidelines]

When writing code:
- Never use placeholder data (TASK, ISSUE, TODO, etc.)
- Never use mock/test data in production
- Never hardcode secrets or API keys
- Use environment variables for configuration
- Follow security best practices (avoid eval(), etc.)
- Write production-ready code from the start
`.trim();

        parts.push({
          type: "text",
          text: safetyGuidance,
        });
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
