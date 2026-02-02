/**
 * Model-Specific Context Limits
 *
 * Defines context limits for various AI models to prevent API Error 1210
 * (Request exceeds the model's maximum context length)
 */

/**
 * Model context limit configuration
 */
export interface ModelContextLimit {
  /** Model identifier (e.g., "glm-4.7", "claude-opus-4.5") */
  modelId: string;

  /** Maximum context window size in tokens */
  maxTokens: number;

  /** Reserved buffer percentage (default 20%) */
  bufferPercent: number;

  /** Effective usable tokens (maxTokens - buffer) */
  usableTokens: number;

  /** Provider ID */
  providerId: string;
}

/**
 * Default model context limits
 *
 * Based on official documentation as of 2026-02-02
 */
export const MODEL_LIMITS: Record<string, ModelContextLimit> = {
  // GLM Models
  "zai/glm-4.7": {
    modelId: "zai/glm-4.7",
    maxTokens: 202750, // HARD LIMIT - causes API Error 1210
    bufferPercent: 20,
    usableTokens: 162200, // 80% of max
    providerId: "zai",
  },
  "glm-4.7": {
    modelId: "glm-4.7",
    maxTokens: 202750,
    bufferPercent: 20,
    usableTokens: 162200,
    providerId: "zai",
  },

  // Claude Models
  "claude-opus-4.5-20250514": {
    modelId: "claude-opus-4.5-20250514",
    maxTokens: 200000,
    bufferPercent: 20,
    usableTokens: 160000,
    providerId: "anthropic",
  },
  "claude-sonnet-4.5-20250514": {
    modelId: "claude-sonnet-4.5-20250514",
    maxTokens: 200000,
    bufferPercent: 20,
    usableTokens: 160000,
    providerId: "anthropic",
  },
  "claude-opus-4.5": {
    modelId: "claude-opus-4.5",
    maxTokens: 200000,
    bufferPercent: 20,
    usableTokens: 160000,
    providerId: "anthropic",
  },
  "claude-sonnet-4.5": {
    modelId: "claude-sonnet-4.5",
    maxTokens: 200000,
    bufferPercent: 20,
    usableTokens: 160000,
    providerId: "anthropic",
  },

  // GPT Models
  "gpt-4": {
    modelId: "gpt-4",
    maxTokens: 128000,
    bufferPercent: 20,
    usableTokens: 102400,
    providerId: "openai",
  },
  "gpt-4-turbo": {
    modelId: "gpt-4-turbo",
    maxTokens: 128000,
    bufferPercent: 20,
    usableTokens: 102400,
    providerId: "openai",
  },
  "gpt-4o": {
    modelId: "gpt-4o",
    maxTokens: 128000,
    bufferPercent: 20,
    usableTokens: 102400,
    providerId: "openai",
  },

  // DeepSeek Models
  "deepseek-chat": {
    modelId: "deepseek-chat",
    maxTokens: 128000,
    bufferPercent: 20,
    usableTokens: 102400,
    providerId: "deepseek",
  },
  "deepseek-coder": {
    modelId: "deepseek-coder",
    maxTokens: 128000,
    bufferPercent: 20,
    usableTokens: 102400,
    providerId: "deepseek",
  },

  // Qwen Models
  "qwen-max": {
    modelId: "qwen-max",
    maxTokens: 128000,
    bufferPercent: 20,
    usableTokens: 102400,
    providerId: "qwen",
  },
  "qwen-plus": {
    modelId: "qwen-plus",
    maxTokens: 128000,
    bufferPercent: 20,
    usableTokens: 102400,
    providerId: "qwen",
  },

  // Gemini Models
  "gemini-2.0-flash-exp": {
    modelId: "gemini-2.0-flash-exp",
    maxTokens: 1000000,
    bufferPercent: 20,
    usableTokens: 800000,
    providerId: "google",
  },
  "gemini-pro": {
    modelId: "gemini-pro",
    maxTokens: 1000000,
    bufferPercent: 20,
    usableTokens: 800000,
    providerId: "google",
  },
};

/**
 * Default context limit for unknown models
 */
export const DEFAULT_MODEL_LIMIT: ModelContextLimit = {
  modelId: "default",
  maxTokens: 128000,
  bufferPercent: 20,
  usableTokens: 102400,
  providerId: "unknown",
};

/**
 * Get context limit for a model
 *
 * @param modelId - Model identifier
 * @returns Model context limit configuration
 */
export function getModelLimit(modelId: string): ModelContextLimit {
  // Try exact match first
  if (MODEL_LIMITS[modelId]) {
    return MODEL_LIMITS[modelId];
  }

  // Try prefix match (e.g., "claude-opus-4.5-20250514" should match "claude-opus-4.5")
  for (const [key, limit] of Object.entries(MODEL_LIMITS)) {
    if (modelId.includes(key) || key.includes(modelId)) {
      return limit;
    }
  }

  // Return default limit
  return DEFAULT_MODEL_LIMIT;
}

/**
 * Get usable token limit for a model
 *
 * @param modelId - Model identifier
 * @returns Usable token count (with buffer applied)
 */
export function getUsableLimit(modelId: string): number {
  return getModelLimit(modelId).usableTokens;
}

/**
 * Get max token limit for a model
 *
 * @param modelId - Model identifier
 * @returns Maximum token count
 */
export function getMaxLimit(modelId: string): number {
  return getModelLimit(modelId).maxTokens;
}

/**
 * Calculate buffer for a model
 *
 * @param modelId - Model identifier
 * @returns Buffer token count
 */
export function getBuffer(modelId: string): number {
  const limit = getModelLimit(modelId);
  return limit.maxTokens - limit.usableTokens;
}

/**
 * Check if token count is within safe limit
 *
 * @param modelId - Model identifier
 * @param tokenCount - Current token count
 * @returns True if within safe limit
 */
export function isWithinSafeLimit(modelId: string, tokenCount: number): boolean {
  return tokenCount <= getUsableLimit(modelId);
}

/**
 * Get percentage of context used
 *
 * @param modelId - Model identifier
 * @param tokenCount - Current token count
 * @returns Percentage of usable context used (0-100)
 */
export function getContextUsage(modelId: string, tokenCount: number): number {
  const usableLimit = getUsableLimit(modelId);
  return Math.min(100, (tokenCount / usableLimit) * 100);
}

/**
 * Get context usage status
 *
 * @param modelId - Model identifier
 * @param tokenCount - Current token count
 * @returns Usage status indicator
 */
export function getUsageStatus(
  modelId: string,
  tokenCount: number
): "safe" | "warning" | "critical" | "exceeded" {
  const usage = getContextUsage(modelId, tokenCount);

  if (usage >= 100) return "exceeded";
  if (usage >= 80) return "critical";
  if (usage >= 60) return "warning";
  return "safe";
}

/**
 * Context budget tracking state
 */
export interface ContextBudget {
  /** Model ID */
  modelId: string;

  /** Usable token limit */
  usableLimit: number;

  /** Current token count */
  currentTokens: number;

  /** Remaining tokens */
  remainingTokens: number;

  /** Usage percentage */
  usagePercent: number;

  /** Usage status */
  status: "safe" | "warning" | "critical" | "exceeded";
}

/**
 * Get current context budget for a model
 *
 * @param modelId - Model identifier
 * @param currentTokens - Current token count
 * @returns Context budget information
 */
export function getContextBudget(
  modelId: string,
  currentTokens: number
): ContextBudget {
  const limit = getModelLimit(modelId);
  const usableLimit = limit.usableTokens;
  const remainingTokens = Math.max(0, usableLimit - currentTokens);
  const usagePercent = getContextUsage(modelId, currentTokens);
  const status = getUsageStatus(modelId, currentTokens);

  return {
    modelId,
    usableLimit,
    currentTokens,
    remainingTokens,
    usagePercent,
    status,
  };
}
