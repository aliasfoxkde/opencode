/**
 * Context Persistence Type Definitions
 *
 * Defines the structure for context persistence in OpenCode
 */

/**
 * Context entry types
 */
export type ContextEntryType =
  | "message"
  | "file_read"
  | "file_write"
  | "tool_call"
  | "state"
  | "metadata";

/**
 * Single context entry
 */
export interface ContextEntry {
  /** Unique identifier for the entry */
  id: string;

  /** Type of context entry */
  type: ContextEntryType;

  /** Timestamp when the entry was created */
  timestamp: number;

  /** Session identifier */
  sessionId: string;

  /** Entry data */
  data: Record<string, any>;

  /** Optional tags for filtering */
  tags?: string[];

  /** Optional TTL in seconds */
  ttl?: number;
}

/**
 * Context snapshot
 */
export interface ContextSnapshot {
  /** Snapshot identifier */
  id: string;

  /** Timestamp when snapshot was created */
  timestamp: number;

  /** Session identifier */
  sessionId: string;

  /** Working directory when snapshot was created */
  cwd: string;

  /** Git branch (if applicable) */
  gitBranch?: string;

  /** Git commit (if applicable) */
  gitCommit?: string;

  /** Context entries in this snapshot */
  entries: ContextEntry[];

  /** Total token count estimate */
  tokenCount: number;
}

/**
 * Context storage options
 */
export interface ContextStorageOptions {
  /** Maximum number of entries to keep */
  maxEntries?: number;

  /** Maximum age of entries in seconds */
  maxAge?: number;

  /** Maximum token count */
  maxTokens?: number;

  /** Storage backend to use */
  backend: "file" | "memory" | "database";

  /** Storage path for file backend */
  storagePath?: string;

  /** Whether to compress stored data */
  compress?: boolean;
}

/**
 * Context query options
 */
export interface ContextQueryOptions {
  /** Filter by session ID */
  sessionId?: string;

  /** Filter by entry type */
  type?: ContextEntryType;

  /** Filter by tags */
  tags?: string[];

  /** Filter by time range */
  since?: number;
  before?: number;

  /** Maximum number of results */
  limit?: number;

  /** Whether to include full data or just metadata */
  includeData?: boolean;
}

/**
 * Context summary for quick inspection
 */
export interface ContextSummary {
  /** Total number of entries */
  totalEntries: number;

  /** Entries by type */
  entriesByType: Record<ContextEntryType, number>;

  /** Total estimated token count */
  totalTokens: number;

  /** Oldest entry timestamp */
  oldestEntry?: number;

  /** Newest entry timestamp */
  newestEntry?: number;

  /** Active sessions */
  activeSessions: string[];
}
