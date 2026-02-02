/**
 * Agent System Type Definitions
 *
 * Defines types for autonomous agent integration with OpenCode
 */

/**
 * Agent capability types
 */
export type AgentCapability =
  | "code_generation"
  | "code_review"
  | "debugging"
  | "testing"
  | "documentation"
  | "architecture"
  | "security"
  | "performance"
  | "database"
  | "devops"
  | "research"
  | "analysis";

/**
 * Agent status
 */
export type AgentStatus =
  | "idle"
  | "busy"
  | "error"
  | "offline";

/**
 * Agent priority
 */
export type AgentPriority = "low" | "normal" | "high" | "urgent";

/**
 * Autonomous agent definition
 */
export interface AgentDefinition {
  /** Unique agent identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Agent description */
  description: string;

  /** Agent capabilities */
  capabilities: AgentCapability[];

  /** Default model for this agent */
  model: string;

  /** Agent priority */
  priority: AgentPriority;

  /** Maximum concurrent tasks */
  maxConcurrentTasks: number;

  /** Timeout in seconds */
  timeout: number;

  /** Whether agent is currently enabled */
  enabled: boolean;
}

/**
 * Task definition for agents
 */
export interface AgentTask {
  /** Unique task identifier */
  id: string;

  /** Task type */
  type: string;

  /** Task description */
  description: string;

  /** Required capabilities */
  requiredCapabilities: AgentCapability[];

  /** Task parameters */
  parameters: Record<string, any>;

  /** Task priority */
  priority: AgentPriority;

  /** Task creation timestamp */
  createdAt: number;

  /** Task deadline */
  deadline?: number;

  /** Parent task ID (for subtasks) */
  parentTaskId?: string;
}

/**
 * Task execution result
 */
export interface AgentTaskResult {
  /** Task identifier */
  taskId: string;

  /** Agent that executed the task */
  agentId: string;

  /** Execution status */
  status: "success" | "failure" | "partial";

  /** Result data */
  result?: any;

  /** Error message if failed */
  error?: string;

  /** Execution time in milliseconds */
  executionTime: number;

  /** Output tokens used */
  outputTokens: number;

  /** Input tokens used */
  inputTokens: number;
}

/**
 * Agent metrics
 */
export interface AgentMetrics {
  /** Agent identifier */
  agentId: string;

  /** Total tasks completed */
  totalTasks: number;

  /** Tasks completed successfully */
  successfulTasks: number;

  /** Tasks failed */
  failedTasks: number;

  /** Average execution time (ms) */
  avgExecutionTime: number;

  /** Total tokens consumed */
  totalTokens: number;

  /** Average tokens per task */
  avgTokensPerTask: number;

  /** Current status */
  status: AgentStatus;

  /** Current active tasks */
  activeTasks: number;
}

/**
 * Agent orchestration request
 */
export interface AgentOrchestrationRequest {
  /** Request identifier */
  id: string;

  /** Primary task */
  task: AgentTask;

  /** Subtasks */
  subtasks?: AgentTask[];

  /** Required capabilities */
  requiredCapabilities: AgentCapability[];

  /** Preferred agents */
  preferredAgents?: string[];

  /** Maximum parallel agents */
  maxParallelAgents?: number;

  /** Coordination strategy */
  strategy: "sequential" | "parallel" | "hierarchical";
}

/**
 * Agent orchestration result
 */
export interface AgentOrchestrationResult {
  /** Request identifier */
  requestId: string;

  /** Primary task result */
  primaryResult?: AgentTaskResult;

  /** Subtask results */
  subtaskResults?: AgentTaskResult[];

  /** Overall status */
  status: "pending" | "in_progress" | "completed" | "failed";

  /** Execution time in milliseconds */
  executionTime: number;

  /** Total tokens consumed */
  totalTokens: number;
}

/**
 * Droid agent configurations from Droid-Config
 *
 * Maps to the 18 specialized droids in .factory/droids/
 */
export interface DroidAgentConfig {
  /** Droid identifier */
  id: string;

  /** Droid name */
  name: string;

  /** Droid type (development, ai, engineering, support, etc.) */
  type: string;

  /** Capabilities */
  capabilities: AgentCapability[];

  /** Default model */
  model: string;

  /** System prompt */
  systemPrompt: string;
}
