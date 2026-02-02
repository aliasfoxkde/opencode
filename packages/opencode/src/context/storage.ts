/**
 * Context Storage Implementation
 *
 * Handles persistent storage of context data
 */

import type {
  ContextEntry,
  ContextSnapshot,
  ContextStorageOptions,
  ContextQueryOptions,
  ContextSummary,
} from "./types";
import { Log } from "../util/log";

const log = Log.create({ service: "context-storage" });

/**
 * Default storage options
 */
const DEFAULT_OPTIONS: Required<Omit<ContextStorageOptions, "storagePath">> = {
  maxEntries: 10000,
  maxAge: 7 * 24 * 60 * 60, // 7 days
  maxTokens: 200000,
  backend: "file",
  compress: true,
};

/**
 * Context storage backend
 */
export class ContextStorage {
  private options: ContextStorageOptions & { storagePath?: string };
  private memoryCache: Map<string, ContextEntry> = new Map();
  private initialized = false;

  constructor(options: ContextStorageOptions) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  /**
   * Initialize storage backend
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.options.backend === "file") {
      await this.initializeFileStorage();
    }

    this.initialized = true;
    log.info("Context storage initialized", {
      backend: this.options.backend,
      path: this.options.storagePath,
    });
  }

  /**
   * Initialize file-based storage
   */
  private async initializeFileStorage(): Promise<void> {
    if (!this.options.storagePath) {
      this.options.storagePath =
        process.env.OPENCECODE_CONTEXT_PATH ||
        `${process.env.HOME}/.opencode/context`;
    }

    // Create storage directory if it doesn't exist
    const fs = await import("fs/promises");
    try {
      await fs.mkdir(this.options.storagePath, { recursive: true });
    } catch (error) {
      log.warn("Failed to create context storage directory", { error });
    }

    // Load existing entries into memory cache
    await this.loadFromFileStorage();
  }

  /**
   * Load existing entries from file storage
   */
  private async loadFromFileStorage(): Promise<void> {
    const fs = await import("fs/promises");
    const path = await import("path");

    try {
      const files = await fs.readdir(this.options.storagePath!);
      let loadedCount = 0;

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        try {
          const filePath = path.join(this.options.storagePath!, file);
          const content = await fs.readFile(filePath, "utf-8");
          const entry: ContextEntry = JSON.parse(content);

          // Skip expired entries
          if (this.isExpired(entry)) continue;

          this.memoryCache.set(entry.id, entry);
          loadedCount++;
        } catch (error) {
          log.warn("Failed to load context entry", { file, error });
        }
      }

      log.info("Loaded context entries from file storage", { count: loadedCount });
    } catch (error) {
      log.warn("Failed to load from file storage", { error });
    }
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: ContextEntry): boolean {
    const maxAge = this.options.maxAge ?? DEFAULT_OPTIONS.maxAge;
    const now = Date.now();
    const entryAge = (now - entry.timestamp) / 1000;

    if (entry.ttl && entryAge > entry.ttl) return true;
    if (entryAge > maxAge) return true;

    return false;
  }

  /**
   * Store a context entry
   */
  async store(entry: ContextEntry): Promise<void> {
    await this.initialize();

    // Check if we've hit the max entries limit
    if (this.memoryCache.size >= (this.options.maxEntries ?? DEFAULT_OPTIONS.maxEntries)) {
      await this.evictOldest();
    }

    // Store in memory cache
    this.memoryCache.set(entry.id, entry);

    // Persist to file if using file backend
    if (this.options.backend === "file") {
      await this.writeToFile(entry);
    }
  }

  /**
   * Write entry to file storage
   */
  private async writeToFile(entry: ContextEntry): Promise<void> {
    if (!this.options.storagePath) return;

    const fs = await import("fs/promises");
    const path = await import("path");
    const crypto = await import("crypto");

    const filename = `${entry.id}.json`;
    const filePath = path.join(this.options.storagePath, filename);

    try {
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
    } catch (error) {
      log.error("Failed to write context entry to file", { entryId: entry.id, error });
    }
  }

  /**
   * Evict oldest entries to make room
   */
  private async evictOldest(): Promise<void> {
    const entries = Array.from(this.memoryCache.values());
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Remove 10% of oldest entries
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      const entry = entries[i];
      this.memoryCache.delete(entry.id);

      // Delete from file storage
      if (this.options.backend === "file" && this.options.storagePath) {
        await this.deleteFromFile(entry.id);
      }
    }

    log.info("Evicted oldest context entries", { count: toRemove });
  }

  /**
   * Delete entry from file storage
   */
  private async deleteFromFile(entryId: string): Promise<void> {
    if (!this.options.storagePath) return;

    const fs = await import("fs/promises");
    const path = await import("path");

    const filename = `${entryId}.json`;
    const filePath = path.join(this.options.storagePath, filename);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore errors when deleting non-existent files
    }
  }

  /**
   * Retrieve a context entry by ID
   */
  async retrieve(entryId: string): Promise<ContextEntry | null> {
    await this.initialize();

    const entry = this.memoryCache.get(entryId);
    if (!entry) return null;

    // Check if expired
    if (this.isExpired(entry)) {
      this.memoryCache.delete(entryId);
      return null;
    }

    return entry;
  }

  /**
   * Query context entries
   */
  async query(options: ContextQueryOptions = {}): Promise<ContextEntry[]> {
    await this.initialize();

    let entries = Array.from(this.memoryCache.values());

    // Filter by session ID
    if (options.sessionId) {
      entries = entries.filter((e) => e.sessionId === options.sessionId);
    }

    // Filter by type
    if (options.type) {
      entries = entries.filter((e) => e.type === options.type);
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      entries = entries.filter((e) =>
        options.tags!.some((tag) => e.tags?.includes(tag))
      );
    }

    // Filter by time range
    if (options.since) {
      entries = entries.filter((e) => e.timestamp >= options.since!);
    }
    if (options.before) {
      entries = entries.filter((e) => e.timestamp <= options.before!);
    }

    // Sort by timestamp (newest first)
    entries.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (options.limit) {
      entries = entries.slice(0, options.limit);
    }

    // Optionally strip data
    if (!options.includeData) {
      entries = entries.map((e) => ({ ...e, data: {} }));
    }

    return entries;
  }

  /**
   * Create a context snapshot
   */
  async createSnapshot(sessionId: string, cwd: string): Promise<ContextSnapshot> {
    await this.initialize();

    const crypto = await import("crypto");
    const snapshotId = crypto.randomUUID();

    // Get all entries for this session
    const entries = await this.query({
      sessionId,
      includeData: true,
      limit: this.options.maxEntries,
    });

    // Get git info if available
    let gitBranch: string | undefined;
    let gitCommit: string | undefined;
    try {
      const { execSync } = await import("child_process");
      gitBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd,
        encoding: "utf-8",
      }).trim();
      gitCommit = execSync("git rev-parse HEAD", {
        cwd,
        encoding: "utf-8",
      }).trim();
    } catch {
      // Not in a git repo
    }

    // Estimate token count (rough approximation)
    const tokenCount = this.estimateTokens(entries);

    const snapshot: ContextSnapshot = {
      id: snapshotId,
      timestamp: Date.now(),
      sessionId,
      cwd,
      gitBranch,
      gitCommit,
      entries,
      tokenCount,
    };

    return snapshot;
  }

  /**
   * Estimate token count for entries
   */
  private estimateTokens(entries: ContextEntry[]): number {
    let total = 0;
    for (const entry of entries) {
      // Rough estimation: ~4 characters per token
      const json = JSON.stringify(entry);
      total += Math.ceil(json.length / 4);
    }
    return total;
  }

  /**
   * Get context summary
   */
  async getSummary(): Promise<ContextSummary> {
    await this.initialize();

    const entries = Array.from(this.memoryCache.values());
    const entriesByType: Record<string, number> = {};
    const activeSessions = new Set<string>();

    let oldestTimestamp: number | undefined;
    let newestTimestamp: number | undefined;
    let totalTokens = 0;

    for (const entry of entries) {
      entriesByType[entry.type] = (entriesByType[entry.type] || 0) + 1;
      activeSessions.add(entry.sessionId);

      if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
      if (!newestTimestamp || entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
      }

      totalTokens += this.estimateTokens([entry]);
    }

    return {
      totalEntries: entries.length,
      entriesByType: entriesByType as any,
      totalTokens,
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp,
      activeSessions: Array.from(activeSessions),
    };
  }

  /**
   * Clear all context entries
   */
  async clear(sessionId?: string): Promise<void> {
    await this.initialize();

    if (sessionId) {
      // Clear only entries for this session
      const entries = await this.query({ sessionId });
      for (const entry of entries) {
        this.memoryCache.delete(entry.id);
        if (this.options.backend === "file") {
          await this.deleteFromFile(entry.id);
        }
      }
    } else {
      // Clear all entries
      this.memoryCache.clear();

      if (this.options.backend === "file" && this.options.storagePath) {
        const fs = await import("fs/promises");
        const path = await import("path");

        try {
          const files = await fs.readdir(this.options.storagePath);
          for (const file of files) {
            if (file.endsWith(".json")) {
              await fs.unlink(path.join(this.options.storagePath, file));
            }
          }
        } catch (error) {
          log.warn("Failed to clear file storage", { error });
        }
      }
    }

    log.info("Cleared context entries", { sessionId });
  }

  /**
   * Shutdown storage backend
   */
  async shutdown(): Promise<void> {
    // Flush any pending writes
    if (this.options.backend === "file") {
      log.info("Shutting down file storage backend");
    }

    this.initialized = false;
  }
}

/**
 * Default context storage instance
 */
let defaultStorage: ContextStorage | null = null;

/**
 * Get or create default context storage
 */
export function getContextStorage(): ContextStorage {
  if (!defaultStorage) {
    defaultStorage = new ContextStorage({
      backend: "file",
      maxEntries: 10000,
      maxAge: 7 * 24 * 60 * 60, // 7 days
      maxTokens: 200000,
      compress: true,
    });
  }
  return defaultStorage;
}
