/**
 * Context Pruning and Summarization
 *
 * Manages context size by pruning old entries and summarizing when
 * approaching model token limits
 */

import type { ContextEntry, ContextSnapshot } from "./types";
import { Log } from "../util/log";
import { estimateEntryTokens, estimateEntriesTokens, getTotalTokens } from "./token-counter";
import { getUsableLimit, getUsageStatus } from "./limits";

const log = Log.create({ service: "context-pruning" });

/**
 * Pruning strategy
 */
export type PruningStrategy = "fifo" | "lru" | "priority" | "summarize";

/**
 * Pruning options
 */
export interface PruningOptions {
  /** Maximum tokens to keep */
  maxTokens: number;

  /** Target percentage to prune to (default 70%) */
  targetPercent?: number;

  /** Pruning strategy */
  strategy: PruningStrategy;

  /** Entry type priorities (higher = more important) */
  priorities?: Record<string, number>;

  /** Whether to summarize instead of dropping */
  summarize: boolean;

  /** Minimum entries to keep */
  minEntries?: number;
}

/**
 * Default priorities for entry types
 */
const DEFAULT_PRIORITIES: Record<string, number> = {
  state: 10, // Most important - session state
  metadata: 9, // High priority - context metadata
  message: 8, // High priority - conversation history
  tool_call: 5, // Medium priority - tool executions
  file_read: 4, // Medium-low priority - file reads
  file_write: 3, // Lower priority - file writes
};

/**
 * Pruning result
 */
export interface PruningResult {
  /** Original entries */
  original: ContextEntry[];

  /** Entries after pruning */
  pruned: ContextEntry[];

  /** Entries that were removed */
  removed: ContextEntry[];

  /** Entries that were summarized */
  summarized: { original: ContextEntry; summary: ContextEntry }[];

  /** Token count before pruning */
  tokensBefore: number;

  /** Token count after pruning */
  tokensAfter: number;

  /** Tokens saved */
  tokensSaved: number;
}

/**
 * Prune context entries to fit within token limit
 *
 * @param entries - Context entries to prune
 * @param options - Pruning options
 * @returns Pruning result
 */
export function pruneContext(
  entries: ContextEntry[],
  options: PruningOptions
): PruningResult {
  const targetPercent = options.targetPercent ?? 70;
  const targetTokens = options.maxTokens * (targetPercent / 100);
  const priorities = { ...DEFAULT_PRIORITIES, ...options.priorities };

  let pruned = [...entries];
  const removed: ContextEntry[] = [];
  const summarized: { original: ContextEntry; summary: ContextEntry }[] = [];

  const tokensBefore = getTotalTokens(pruned);

  // Sort by timestamp (oldest first) for FIFO/LRU
  pruned.sort((a, b) => a.timestamp - b.timestamp);

  // Apply pruning strategy
  switch (options.strategy) {
    case "fifo":
      // First In First Out - remove oldest entries first
      while (
        getTotalTokens(pruned) > targetTokens &&
        pruned.length > (options.minEntries ?? 10)
      ) {
        const removedEntry = pruned.shift()!;
        removed.push(removedEntry);
      }
      break;

    case "lru":
      // Least Recently Used - same as FIFO for timestamp-sorted entries
      while (
        getTotalTokens(pruned) > targetTokens &&
        pruned.length > (options.minEntries ?? 10)
      ) {
        const removedEntry = pruned.shift()!;
        removed.push(removedEntry);
      }
      break;

    case "priority":
      // Priority-based - keep high-priority entries
      pruned.sort((a, b) => {
        const priorityA = priorities[a.type] ?? 5;
        const priorityB = priorities[b.type] ?? 5;
        if (priorityA !== priorityB) {
          return priorityB - priorityA; // Higher priority first
        }
        return b.timestamp - a.timestamp; // Newer first within same priority
      });

      while (
        getTotalTokens(pruned) > targetTokens &&
        pruned.length > (options.minEntries ?? 10)
      ) {
        const removedEntry = pruned.pop()!;
        removed.push(removedEntry);
      }
      break;

    case "summarize":
      // Summarize old entries instead of dropping
      pruned = summarizeEntries(pruned, targetTokens, options.minEntries ?? 10);
      break;
  }

  const tokensAfter = getTotalTokens(pruned);
  const tokensSaved = tokensBefore - tokensAfter;

  log.info("Context pruning completed", {
    originalCount: entries.length,
    prunedCount: pruned.length,
    removedCount: removed.length,
    tokensBefore,
    tokensAfter,
    tokensSaved,
  });

  return {
    original: entries,
    pruned,
    removed,
    summarized,
    tokensBefore,
    tokensAfter,
    tokensSaved,
  };
}

/**
 * Summarize context entries
 *
 * @param entries - Entries to summarize
 * @param targetTokens - Target token count
 * @param minEntries - Minimum entries to keep
 * @returns Summarized entries
 */
function summarizeEntries(
  entries: ContextEntry[],
  targetTokens: number,
  minEntries: number
): ContextEntry[] {
  // Keep recent entries as-is, summarize older ones
  const result: ContextEntry[] = [];
  let currentTokens = 0;

  // Process newest first
  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);

  for (const entry of sorted) {
    const entryTokens = estimateEntryTokens(entry);

    if (result.length < minEntries || currentTokens + entryTokens < targetTokens) {
      // Keep entry as-is
      result.unshift(entry);
      currentTokens += entryTokens;
    } else {
      // Create summary entry
      const summaryEntry = createSummaryEntry(entry);
      result.unshift(summaryEntry);
      currentTokens += estimateEntryTokens(summaryEntry);
    }
  }

  return result;
}

/**
 * Create a summary entry from a context entry
 *
 * @param entry - Entry to summarize
 * @returns Summary entry
 */
function createSummaryEntry(entry: ContextEntry): ContextEntry {
  return {
    id: `${entry.id}-summary`,
    type: "metadata",
    timestamp: entry.timestamp,
    sessionId: entry.sessionId,
    tags: [...(entry.tags || []), "summary"],
    data: {
      originalType: entry.type,
      originalId: entry.id,
      summary: generateSummary(entry),
    },
  };
}

/**
 * Generate a text summary for an entry
 *
 * @param entry - Entry to summarize
 * @returns Text summary
 */
function generateSummary(entry: ContextEntry): string {
  switch (entry.type) {
    case "message":
      const role = entry.data.role || "unknown";
      const contentLength = JSON.stringify(entry.data.content || "").length;
      return `[${role.toUpperCase()}] Message (${contentLength} chars)`;

    case "tool_call":
      const tool = entry.data.tool || "unknown";
      return `Tool call: ${tool}`;

    case "file_read":
      return `File read: ${entry.data.filepath || "unknown"}`;

    case "file_write":
      return `File write: ${entry.data.filepath || "unknown"}`;

    default:
      return `${entry.type} entry`;
  }
}

/**
 * Check if context needs pruning
 *
 * @param entries - Context entries
 * @param modelId - Model identifier
 * @returns True if pruning is needed
 */
export function needsPruning(entries: ContextEntry[], modelId: string): boolean {
  const totalTokens = getTotalTokens(entries);
  const usableLimit = getUsableLimit(modelId);
  const status = getUsageStatus(modelId, totalTokens);

  return status === "warning" || status === "critical" || status === "exceeded";
}

/**
 * Get recommended pruning action
 *
 * @param entries - Context entries
 * @param modelId - Model identifier
 * @returns Recommended action
 */
export function getPruningRecommendation(
  entries: ContextEntry[],
  modelId: string
): {
  needsPruning: boolean;
  action: "none" | "prune" | "summarize" | "critical";
  currentTokens: number;
  usableLimit: number;
  usagePercent: number;
} {
  const currentTokens = getTotalTokens(entries);
  const usableLimit = getUsableLimit(modelId);
  const usagePercent = (currentTokens / usableLimit) * 100;
  const status = getUsageStatus(modelId, currentTokens);

  let action: "none" | "prune" | "summarize" | "critical" = "none";

  if (status === "exceeded") {
    action = "critical";
  } else if (status === "critical") {
    action = "summarize";
  } else if (status === "warning") {
    action = "prune";
  }

  return {
    needsPruning: action !== "none",
    action,
    currentTokens,
    usableLimit,
    usagePercent,
  };
}

/**
 * Auto-prune context if needed
 *
 * @param entries - Context entries
 * @param modelId - Model identifier
 * @param options - Pruning options
 * @returns Pruned entries (or original if no pruning needed)
 */
export function autoPrune(
  entries: ContextEntry[],
  modelId: string,
  options?: Partial<PruningOptions>
): ContextEntry[] {
  const recommendation = getPruningRecommendation(entries, modelId);

  if (!recommendation.needsPruning) {
    return entries;
  }

  const pruningOptions: PruningOptions = {
    maxTokens: recommendation.usableLimit,
    targetPercent: 70,
    strategy: recommendation.action === "summarize" ? "summarize" : "priority",
    summarize: true,
    minEntries: 10,
    ...options,
  };

  const result = pruneContext(entries, pruningOptions);
  return result.pruned;
}
