/**
 * Token Counter for Context Management
 *
 * Estimates token counts for various data types to manage context budgets
 */

import type { ContextEntry } from "./types";

/**
 * Token counting options
 */
export interface TokenCountOptions {
  /** Whether to count metadata (defaults to true) */
  includeMetadata?: boolean;

  /** Character-to-token ratio (defaults to 4) */
  charRatio?: number;

  /** Custom token count for specific entry types */
  typeMultipliers?: Record<string, number>;
}

/**
 * Default token counting options
 */
const DEFAULT_OPTIONS: Required<TokenCountOptions> = {
  includeMetadata: true,
  charRatio: 4, // Approximate: 4 characters per token
  typeMultipliers: {
    message: 1.0,
    file_read: 1.0,
    file_write: 1.2,
    tool_call: 0.5,
    state: 0.3,
    metadata: 0.2,
  },
};

/**
 * Estimate token count for a string
 *
 * Uses a simple character-based estimation. For more accurate results,
 * use a proper tokenizer like tiktoken.
 *
 * @param text - Text to count
 * @param options - Counting options
 * @returns Estimated token count
 */
export function estimateTokens(
  text: string,
  options: TokenCountOptions = {}
): number {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Remove whitespace and normalize
  const normalized = text.trim().replace(/\s+/g, " ");

  // Count characters and divide by ratio
  return Math.ceil(normalized.length / opts.charRatio);
}

/**
 * Estimate token count for an object
 *
 * @param obj - Object to count
 * @param options - Counting options
 * @returns Estimated token count
 */
export function estimateObjectTokens(
  obj: any,
  options: TokenCountOptions = {}
): number {
  const json = JSON.stringify(obj);
  return estimateTokens(json, options);
}

/**
 * Estimate token count for a context entry
 *
 * @param entry - Context entry to count
 * @param options - Counting options
 * @returns Estimated token count
 */
export function estimateEntryTokens(
  entry: ContextEntry,
  options: TokenCountOptions = {}
): number {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let tokens = 0;

  // Count entry data
  const dataTokens = estimateObjectTokens(entry.data, options);
  const multiplier = opts.typeMultipliers[entry.type] || 1.0;
  tokens += dataTokens * multiplier;

  // Count metadata if requested
  if (opts.includeMetadata) {
    const metadata = {
      id: entry.id,
      type: entry.type,
      timestamp: entry.timestamp,
      sessionId: entry.sessionId,
    };
    tokens += estimateObjectTokens(metadata, options) * opts.typeMultipliers.metadata;
  }

  return Math.ceil(tokens);
}

/**
 * Estimate token count for multiple context entries
 *
 * @param entries - Context entries to count
 * @param options - Counting options
 * @returns Estimated token count
 */
export function estimateEntriesTokens(
  entries: ContextEntry[],
  options: TokenCountOptions = {}
): number {
  let total = 0;
  for (const entry of entries) {
    total += estimateEntryTokens(entry, options);
  }
  return total;
}

/**
 * Token count summary for context entries
 */
export interface TokenSummary {
  /** Total estimated tokens */
  totalTokens: number;

  /** Token count by entry type */
  byType: Record<string, number>;

  /** Number of entries */
  entryCount: number;

  /** Average tokens per entry */
  avgTokensPerEntry: number;

  /** Estimated overhead for system prompt, etc. */
  systemOverhead: number;
}

/**
 * Get token summary for context entries
 *
 * @param entries - Context entries to summarize
 * @param options - Counting options
 * @returns Token summary
 */
export function getTokenSummary(
  entries: ContextEntry[],
  options: TokenCountOptions = {}
): TokenSummary {
  const byType: Record<string, number> = {};
  let totalTokens = 0;

  for (const entry of entries) {
    const tokens = estimateEntryTokens(entry, options);
    byType[entry.type] = (byType[entry.type] || 0) + tokens;
    totalTokens += tokens;
  }

  const entryCount = entries.length;
  const avgTokensPerEntry = entryCount > 0 ? totalTokens / entryCount : 0;

  // System overhead includes system prompts, instructions, etc.
  const systemOverhead = 2000; // Conservative estimate

  return {
    totalTokens,
    byType,
    entryCount,
    avgTokensPerEntry,
    systemOverhead,
  };
}

/**
 * Calculate total tokens including system overhead
 *
 * @param entries - Context entries
 * @param options - Counting options
 * @returns Total token count including overhead
 */
export function getTotalTokens(
  entries: ContextEntry[],
  options: TokenCountOptions = {}
): number {
  const summary = getTokenSummary(entries, options);
  return summary.totalTokens + summary.systemOverhead;
}

/**
 * Token budget information
 */
export interface TokenBudget {
  /** Total tokens used */
  used: number;

  /** Total tokens available */
  available: number;

  /** Remaining tokens */
  remaining: number;

  /** Usage percentage */
  usagePercent: number;

  /** Usage status */
  status: "safe" | "warning" | "critical" | "exceeded";
}

/**
 * Calculate token budget for context entries
 *
 * @param entries - Context entries
 * @param maxTokens - Maximum allowed tokens
 * @param options - Counting options
 * @returns Token budget information
 */
export function getTokenBudget(
  entries: ContextEntry[],
  maxTokens: number,
  options: TokenCountOptions = {}
): TokenBudget {
  const totalTokens = getTotalTokens(entries, options);
  const used = totalTokens;
  const available = maxTokens;
  const remaining = Math.max(0, available - used);
  const usagePercent = (used / available) * 100;

  let status: "safe" | "warning" | "critical" | "exceeded";
  if (usagePercent >= 100) {
    status = "exceeded";
  } else if (usagePercent >= 80) {
    status = "critical";
  } else if (usagePercent >= 60) {
    status = "warning";
  } else {
    status = "safe";
  }

  return {
    used,
    available,
    remaining,
    usagePercent,
    status,
  };
}
