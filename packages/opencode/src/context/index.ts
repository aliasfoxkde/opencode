/**
 * Context Persistence for OpenCode
 *
 * This module provides context persistence that survives directory changes
 * and works in headless mode, allowing AI to maintain continuity across sessions.
 *
 * Unlike Claude Code's in-memory context, this is persisted to disk and can be
 * restored after directory changes or process restarts.
 */

import type { PluginInput, Hooks } from "@opencode-ai/plugin";
import { createContextHooks } from "./hooks";

// Export all types
export type {
  ContextEntry,
  ContextEntryType,
  ContextSnapshot,
  ContextStorageOptions,
  ContextQueryOptions,
  ContextSummary,
} from "./types";

// Export storage
export { ContextStorage, getContextStorage } from "./storage";

// Export hooks
export { createContextHooks } from "./hooks";

// Export model limits
export {
  MODEL_LIMITS,
  DEFAULT_MODEL_LIMIT,
  getModelLimit,
  getUsableLimit,
  getMaxLimit,
  getBuffer,
  isWithinSafeLimit,
  getContextUsage,
  getUsageStatus,
  getContextBudget,
} from "./limits";

export type { ModelContextLimit, ContextBudget } from "./limits";

// Export token counter
export {
  estimateTokens,
  estimateObjectTokens,
  estimateEntryTokens,
  estimateEntriesTokens,
  getTokenSummary,
  getTotalTokens,
  getTokenBudget,
} from "./token-counter";

export type { TokenCountOptions, TokenSummary, TokenBudget } from "./token-counter";

// Export pruning
export {
  pruneContext,
  needsPruning,
  getPruningRecommendation,
  autoPrune,
} from "./pruning";

export type { PruningStrategy, PruningOptions, PruningResult } from "./pruning";

/**
 * OpenCode Plugin Entry Point
 *
 * This is the main function that OpenCode calls to initialize the
 * context persistence plugin.
 */
export default async function contextPlugin(input: PluginInput): Promise<Hooks> {
  return createContextHooks(input);
}
