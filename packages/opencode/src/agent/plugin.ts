/**
 * Agent System Plugin for OpenCode
 *
 * Integrates Droid-Config's autonomous agent system with OpenCode
 */

import type { PluginInput, Hooks } from "@opencode-ai/plugin";
import { Log } from "../util/log";
import type {
  AgentDefinition,
  AgentTask,
  AgentTaskResult,
  AgentOrchestrationRequest,
  DroidAgentConfig,
} from "./types";
import { AGENTS } from "./droids";

const log = Log.create({ service: "agent-plugin" });

/**
 * Get all available agents
 */
export function getAvailableAgents(): AgentDefinition[] {
  return AGENTS.filter((agent) => agent.enabled);
}

/**
 * Get agent by ID
 */
export function getAgentById(id: string): AgentDefinition | undefined {
  return AGENTS.find((agent) => agent.id === id);
}

/**
 * Select best agent for a task
 */
export function selectAgentForTask(
  task: AgentTask,
  preferredAgents?: string[]
): AgentDefinition | undefined {
  const availableAgents = getAvailableAgents();

  // If preferred agents are specified, try them first
  if (preferredAgents && preferredAgents.length > 0) {
    for (const agentId of preferredAgents) {
      const agent = getAgentById(agentId);
      if (agent && isAgentCapable(agent, task)) {
        return agent;
      }
    }
  }

  // Find agents with all required capabilities
  const capableAgents = availableAgents.filter((agent) =>
    isAgentCapable(agent, task)
  );

  if (capableAgents.length === 0) {
    return undefined;
  }

  // Sort by priority (urgent > high > normal > low)
  const priorityOrder: Record<string, number> = {
    urgent: 4,
    high: 3,
    normal: 2,
    low: 1,
  };

  capableAgents.sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // If same priority, prefer agent with fewer active tasks
    return a.maxConcurrentTasks - b.maxConcurrentTasks;
  });

  return capableAgents[0];
}

/**
 * Check if agent is capable of handling a task
 */
function isAgentCapable(
  agent: AgentDefinition,
  task: AgentTask
): boolean {
  // Check if agent has all required capabilities
  const hasAllCapabilities = task.requiredCapabilities.every((cap) =>
    agent.capabilities.includes(cap)
  );

  if (!hasAllCapabilities) {
    return false;
  }

  // Check if agent has capacity
  const agentMetrics = getAgentMetrics(agent.id);
  if (agentMetrics.activeTasks >= agent.maxConcurrentTasks) {
    return false;
  }

  return true;
}

/**
 * Get agent metrics
 */
export function getAgentMetrics(agentId: string): {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  avgExecutionTime: number;
  totalTokens: number;
  avgTokensPerTask: number;
  status: "idle" | "busy" | "error" | "offline";
  activeTasks: number;
} {
  // TODO: Integrate with Droid-Config's agent metrics
  return {
    totalTasks: 0,
    successfulTasks: 0,
    failedTasks: 0,
    avgExecutionTime: 0,
    totalTokens: 0,
    avgTokensPerTask: 0,
    status: "idle",
    activeTasks: 0,
  };
}

/**
 * Create agent hooks for OpenCode plugin system
 */
export function createAgentHooks(input: PluginInput): Partial<Hooks> {
  return {
    /**
     * Chat message hook - detect agent requests
     */
    "chat.message": async (messageData, messageContext) => {
      const { parts } = messageContext;
      if (!parts) return;

      const userText = parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join(" ")
        .toLowerCase();

      // Check if user is requesting agent assistance
      if (userText.includes("@agent") || userText.includes("use agent")) {
        log.info("Agent request detected", {
          sessionId: messageData.sessionID,
          message: userText.substring(0, 100),
        });

        // Inject agent guidance
        parts.push({
          type: "text",
          text: getAgentGuidance(),
        } as any);
      }
    },

    /**
     * Config hook - initialize agent system
     */
    config: async (configData) => {
      const agentCount = getAvailableAgents().length;

      log.info("Agent system initialized", {
        totalAgents: AGENTS.length,
        availableAgents: agentCount,
      });
    },
  };
}

/**
 * Get agent guidance message
 */
function getAgentGuidance(): string {
  const agents = getAvailableAgents();
  const agentList = agents
    .map((a) => `- ${a.name}: ${a.description}`)
    .join("\n");

  return `
[Agent System Available]

You have access to ${agents.length} specialized agents:

${agentList}

To use an agent, mention them by name or describe the task type.
The system will automatically select the best agent for the job.

Available capabilities:
${getCapabilitiesList()}
`.trim();
}

/**
 * Get list of all capabilities
 */
function getCapabilitiesList(): string {
  const capabilities = new Set<string>();

  for (const agent of getAvailableAgents()) {
    for (const cap of agent.capabilities) {
      capabilities.add(cap);
    }
  }

  return Array.from(capabilities)
    .map((cap) => `- ${cap}`)
    .join("\n");
}

/**
 * Agent plugin entry point for OpenCode
 */
export default async function agentPlugin(input: PluginInput): Promise<Hooks> {
  return createAgentHooks(input);
}
