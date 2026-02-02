/**
 * Context Persistence Hooks for OpenCode
 *
 * Integrates with OpenCode's plugin system to automatically capture
 * and restore context across sessions and directory changes.
 */

import type { PluginInput, Hooks } from "@opencode-ai/plugin";
import { Log } from "../util/log";
import type {
  ContextEntry,
  ContextEntryType,
  ContextSnapshot,
} from "./types";
import { getContextStorage } from "./storage";

const log = Log.create({ service: "context-hooks" });

/**
 * Generate a unique ID for context entries
 */
async function generateId(): Promise<string> {
  const crypto = await import("crypto");
  return crypto.randomUUID();
}

/**
 * Get current session ID from OpenCode
 */
function getSessionId(): string {
  return process.env.OPENCECODE_SESSION_ID || "default";
}

/**
 * Create a context hook
 */
async function createContextEntry(
  type: ContextEntryType,
  data: Record<string, any>,
  tags?: string[]
): Promise<void> {
  try {
    const storage = getContextStorage();
    await storage.initialize();

    const entry: ContextEntry = {
      id: await generateId(),
      type,
      timestamp: Date.now(),
      sessionId: getSessionId(),
      data,
      tags,
    };

    await storage.store(entry);
    log.debug("Stored context entry", { type, entryId: entry.id });
  } catch (error) {
    log.warn("Failed to store context entry", { type, error });
  }
}

/**
 * Create context hooks for OpenCode plugin system
 */
export function createContextHooks(input: PluginInput): Partial<Hooks> {
  let currentSnapshot: ContextSnapshot | null = null;
  let snapshotTimer: ReturnType<typeof setInterval> | null = null;

  return {
    /**
     * Hook called before tool execution
     *
     * Captures tool calls for context persistence
     */
    "tool.execute.before": async (toolData, toolArgs) => {
      const tool = toolData.tool;
      const args = toolArgs.args;

      // Capture tool execution in context
      await createContextEntry(
        "tool_call",
        {
          tool,
          args: sanitizeArgs(args),
          cwd: process.cwd(),
        },
        ["tool", tool]
      );
    },

    /**
     * Hook called after tool execution
     *
     * Captures tool results for context persistence
     */
    "tool.execute.after": async (toolData, toolResult) => {
      const tool = toolData.tool;

      // Capture successful tool results
      await createContextEntry(
        "tool_call",
        {
          tool,
          result: sanitizeResult(toolResult.output),
          status: "success",
        },
        ["tool", tool, "result"]
      );
    },

    /**
     * Hook called when a chat message is received
     *
     * Captures user messages for context persistence
     */
    "chat.message": async (messageData, messageContext) => {
      const { message, parts } = messageContext;

      // Extract message content
      const content = parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n");

      await createContextEntry(
        "message",
        {
          role: "user",
          content,
          agent: messageData.agent,
          model: messageData.model,
        },
        ["message", "user"]
      );
    },

    /**
     * Configuration hook
     *
     * Initialize context persistence and create initial snapshot
     */
    config: async (configData) => {
      const storage = getContextStorage();
      await storage.initialize();

      // Create initial snapshot
      const summary = await storage.getSummary();
      log.info("Context persistence initialized", {
        totalEntries: summary.totalEntries,
        activeSessions: summary.activeSessions.length,
      });

      // Set up periodic snapshot creation (every 5 minutes)
      if (!snapshotTimer) {
        snapshotTimer = setInterval(async () => {
          try {
            currentSnapshot = await storage.createSnapshot(
              getSessionId(),
              process.cwd()
            );
            log.debug("Created periodic context snapshot", {
              entriesCount: currentSnapshot.entries.length,
              tokenCount: currentSnapshot.tokenCount,
            });
          } catch (error) {
            log.warn("Failed to create periodic snapshot", { error });
          }
        }, 5 * 60 * 1000);
      }
    },
  };
}

/**
 * Sanitize args for storage (remove sensitive data)
 */
function sanitizeArgs(args: any): any {
  if (!args || typeof args !== "object") return args;

  const sanitized: any = {};
  const sensitiveKeys = [
    "password",
    "secret",
    "token",
    "apiKey",
    "api_key",
    "authorization",
  ];

  for (const [key, value] of Object.entries(args)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeArgs(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize result for storage (limit size)
 */
function sanitizeResult(result: any): any {
  const str = JSON.stringify(result);

  // Limit result size to ~10k characters
  if (str.length > 10000) {
    return {
      _truncated: true,
      _length: str.length,
      _preview: str.substring(0, 5000),
    };
  }

  return result;
}

/**
 * Context plugin entry point for OpenCode
 *
 * This is the main function that OpenCode calls to initialize the
 * context persistence plugin.
 */
export default async function contextPlugin(input: PluginInput): Promise<Hooks> {
  return createContextHooks(input);
}
