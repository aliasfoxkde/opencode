/**
 * Context Storage Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ContextStorage } from "../storage";
import type { ContextEntry } from "../types";

describe("ContextStorage", () => {
  let storage: ContextStorage;
  const testDir = "/tmp/opencode-context-test";

  beforeEach(async () => {
    // Clean up test directory
    const fs = await import("fs/promises");
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }

    storage = new ContextStorage({
      backend: "file",
      storagePath: testDir,
      maxEntries: 100,
      maxAge: 3600, // 1 hour
      maxTokens: 10000,
    });
    await storage.initialize();
  });

  afterEach(async () => {
    await storage.clear();
    await storage.shutdown();

    // Clean up test directory
    const fs = await import("fs/promises");
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe("store and retrieve", () => {
    it("should store and retrieve a context entry", async () => {
      const entry: ContextEntry = {
        id: "test-1",
        type: "message",
        timestamp: Date.now(),
        sessionId: "session-1",
        data: { content: "Hello, world!" },
      };

      await storage.store(entry);
      const retrieved = await storage.retrieve("test-1");

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe("test-1");
      expect(retrieved?.data.content).toBe("Hello, world!");
    });

    it("should return null for non-existent entry", async () => {
      const retrieved = await storage.retrieve("non-existent");
      expect(retrieved).toBeNull();
    });
  });

  describe("query", () => {
    beforeEach(async () => {
      // Store test entries
      const entries: ContextEntry[] = [
        {
          id: "msg-1",
          type: "message",
          timestamp: Date.now() - 1000,
          sessionId: "session-1",
          data: { content: "Message 1" },
          tags: ["important"],
        },
        {
          id: "msg-2",
          type: "message",
          timestamp: Date.now(),
          sessionId: "session-1",
          data: { content: "Message 2" },
        },
        {
          id: "tool-1",
          type: "tool_call",
          timestamp: Date.now() - 500,
          sessionId: "session-2",
          data: { tool: "read" },
        },
      ];

      for (const entry of entries) {
        await storage.store(entry);
      }
    });

    it("should query all entries", async () => {
      const results = await storage.query();
      expect(results.length).toBe(3);
    });

    it("should filter by session ID", async () => {
      const results = await storage.query({ sessionId: "session-1" });
      expect(results.length).toBe(2);
      expect(results.every((r) => r.sessionId === "session-1")).toBe(true);
    });

    it("should filter by type", async () => {
      const results = await storage.query({ type: "message" });
      expect(results.length).toBe(2);
      expect(results.every((r) => r.type === "message")).toBe(true);
    });

    it("should filter by tags", async () => {
      const results = await storage.query({ tags: ["important"] });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("msg-1");
    });

    it("should limit results", async () => {
      const results = await storage.query({ limit: 2 });
      expect(results.length).toBe(2);
    });

    it("should sort by timestamp (newest first)", async () => {
      const results = await storage.query();
      expect(results[0].timestamp).toBeGreaterThanOrEqual(results[1].timestamp);
    });
  });

  describe("createSnapshot", () => {
    it("should create a context snapshot", async () => {
      // Store some entries
      const entry: ContextEntry = {
        id: "test-1",
        type: "message",
        timestamp: Date.now(),
        sessionId: "session-1",
        data: { content: "Test" },
      };
      await storage.store(entry);

      const snapshot = await storage.createSnapshot("session-1", "/tmp");

      expect(snapshot).toBeDefined();
      expect(snapshot.sessionId).toBe("session-1");
      expect(snapshot.entries.length).toBe(1);
      expect(snapshot.cwd).toBe("/tmp");
    });

    it("should estimate token count", async () => {
      const entry: ContextEntry = {
        id: "test-1",
        type: "message",
        timestamp: Date.now(),
        sessionId: "session-1",
        data: { content: "This is a test message with some content" },
      };
      await storage.store(entry);

      const snapshot = await storage.createSnapshot("session-1", "/tmp");

      expect(snapshot.tokenCount).toBeGreaterThan(0);
    });
  });

  describe("getSummary", () => {
    it("should return context summary", async () => {
      const entry: ContextEntry = {
        id: "test-1",
        type: "message",
        timestamp: Date.now(),
        sessionId: "session-1",
        data: { content: "Test" },
      };
      await storage.store(entry);

      const summary = await storage.getSummary();

      expect(summary.totalEntries).toBe(1);
      expect(summary.entriesByType.message).toBe(1);
      expect(summary.activeSessions).toContain("session-1");
    });
  });

  describe("clear", () => {
    it("should clear all entries", async () => {
      const entry: ContextEntry = {
        id: "test-1",
        type: "message",
        timestamp: Date.now(),
        sessionId: "session-1",
        data: { content: "Test" },
      };
      await storage.store(entry);

      await storage.clear();

      const summary = await storage.getSummary();
      expect(summary.totalEntries).toBe(0);
    });

    it("should clear entries for specific session", async () => {
      const entry1: ContextEntry = {
        id: "test-1",
        type: "message",
        timestamp: Date.now(),
        sessionId: "session-1",
        data: { content: "Test 1" },
      };
      const entry2: ContextEntry = {
        id: "test-2",
        type: "message",
        timestamp: Date.now(),
        sessionId: "session-2",
        data: { content: "Test 2" },
      };

      await storage.store(entry1);
      await storage.store(entry2);

      await storage.clear("session-1");

      const summary = await storage.getSummary();
      expect(summary.totalEntries).toBe(1);
      expect(summary.activeSessions).toContain("session-2");
      expect(summary.activeSessions).not.toContain("session-1");
    });
  });
});
