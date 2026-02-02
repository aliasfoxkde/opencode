/**
 * Agent System for OpenCode
 *
 * Integrates Droid-Config's autonomous agent system with OpenCode
 */

import type { PluginInput, Hooks } from "@opencode-ai/plugin";
import { createAgentHooks } from "./plugin";

// Export all types
export type {
  AgentCapability,
  AgentStatus,
  AgentPriority,
  AgentDefinition,
  AgentTask,
  AgentTaskResult,
  AgentMetrics,
  AgentOrchestrationRequest,
  AgentOrchestrationResult,
  DroidAgentConfig,
} from "./types";

// Export agent management
export {
  getAvailableAgents,
  getAgentById,
  selectAgentForTask,
  getAgentMetrics,
} from "./plugin";

// Export agent definitions
export { AGENTS } from "./droids";

/**
 * OpenCode Plugin Entry Point
 *
 * This is the main function that OpenCode calls to initialize the
 * agent system plugin.
 */
export default async function agentPlugin(input: PluginInput): Promise<Hooks> {
  return createAgentHooks(input);
}
