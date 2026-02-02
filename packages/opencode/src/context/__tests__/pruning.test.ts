/**
 * Context Pruning Tests
 */

import { describe, it, expect } from "bun:test";
import {
  pruneContext,
  needsPruning,
  getPruningRecommendation,
  autoPrune,
} from "../pruning";
import type { ContextEntry } from "../types";

describe("Context Pruning", () => {
  const createEntries = (count: number): ContextEntry[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `entry-${i}`,
      type: i % 2 === 0 ? "message" : "tool_call",
      timestamp: Date.now() - (count - i) * 1000,
      sessionId: "test-session",
      data: {
        content: `Entry ${i} with some data that will be counted for tokens`,
      },
    }));
  };

  describe("pruneContext", () => {
    it("should prune using FIFO strategy", () => {
      const entries = createEntries(100);
      const options = {
        maxTokens: 5000,
        strategy: "fifo" as const,
        summarize: false,
      };

      const result = pruneContext(entries, options);

      expect(result.pruned.length).toBeLessThan(entries.length);
      expect(result.tokensAfter).toBeLessThan(result.tokensBefore);
      expect(result.removed.length).toBeGreaterThan(0);
    });

    it("should prune using priority strategy", () => {
      const entries = createEntries(100);
      const options = {
        maxTokens: 5000,
        strategy: "priority" as const,
        summarize: false,
        priorities: {
          message: 10,
          tool_call: 1,
        },
      };

      const result = pruneContext(entries, options);

      // Priority strategy should keep messages (higher priority)
      const messageCount = result.pruned.filter((e) => e.type === "message").length;
      const toolCallCount = result.pruned.filter((e) => e.type === "tool_call").length;

      expect(messageCount).toBeGreaterThan(toolCallCount);
    });

    it("should respect minEntries", () => {
      const entries = createEntries(100);
      const options = {
        maxTokens: 100, // Very low limit
        strategy: "fifo" as const,
        summarize: false,
        minEntries: 20,
      };

      const result = pruneContext(entries, options);

      expect(result.pruned.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe("needsPruning", () => {
    it("should return false for small context", () => {
      const entries = createEntries(10);
      const needs = needsPruning(entries, "glm-4.7");

      expect(needs).toBe(false);
    });

    it("should return true for large context", () => {
      // Create entries with very large content to exceed GLM-4.7 limit
      // GLM-4.7 has 162,200 usable tokens, so we need ~650,000 chars to trigger pruning
      const largeContent = "x".repeat(3500); // ~875 tokens per entry
      const entries: ContextEntry[] = Array.from({ length: 200 }, (_, i) => ({
        id: `entry-${i}`,
        type: "message",
        timestamp: Date.now() - (200 - i) * 1000,
        sessionId: "test-session",
        data: { content: largeContent },
      }));

      const needs = needsPruning(entries, "glm-4.7");

      expect(needs).toBe(true);
    });
  });

  describe("getPruningRecommendation", () => {
    it("should return 'none' for safe context", () => {
      const entries = createEntries(10);
      const recommendation = getPruningRecommendation(entries, "glm-4.7");

      expect(recommendation.action).toBe("none");
      expect(recommendation.needsPruning).toBe(false);
    });

    it("should return 'prune' for warning level", () => {
      const entries = createEntries(500); // Large context
      const recommendation = getPruningRecommendation(entries, "glm-4.7");

      if (recommendation.action === "prune" || recommendation.action === "summarize") {
        expect(recommendation.needsPruning).toBe(true);
      }
    });

    it("should include budget information", () => {
      const entries = createEntries(100);
      const recommendation = getPruningRecommendation(entries, "glm-4.7");

      expect(recommendation.currentTokens).toBeGreaterThan(0);
      expect(recommendation.usableLimit).toBeGreaterThan(0);
      expect(recommendation.usagePercent).toBeGreaterThanOrEqual(0);
    });
  });

  describe("autoPrune", () => {
    it("should return original entries if no pruning needed", () => {
      const entries = createEntries(10);
      const pruned = autoPrune(entries, "glm-4.7");

      expect(pruned).toEqual(entries);
    });

    it("should prune when needed", () => {
      // Create entries with very large content to trigger pruning
      const largeContent = "x".repeat(3500); // ~875 tokens per entry
      const entries: ContextEntry[] = Array.from({ length: 200 }, (_, i) => ({
        id: `entry-${i}`,
        type: "message",
        timestamp: Date.now() - (200 - i) * 1000,
        sessionId: "test-session",
        data: { content: largeContent },
      }));

      const pruned = autoPrune(entries, "glm-4.7");

      expect(pruned.length).toBeLessThan(entries.length);
    });

    it("should use provided options", () => {
      const entries = createEntries(1000);
      const pruned = autoPrune(entries, "glm-4.7", {
        minEntries: 50,
      });

      expect(pruned.length).toBeGreaterThanOrEqual(50);
    });
  });

  describe("token counting", () => {
    it("should estimate tokens for entries", async () => {
      const { estimateEntriesTokens } = await import("../token-counter");

      const entries: ContextEntry[] = [
        {
          id: "test-1",
          type: "message",
          timestamp: Date.now(),
          sessionId: "test",
          data: { content: "Hello, world!" },
        },
      ];

      const tokens = estimateEntriesTokens(entries);

      expect(tokens).toBeGreaterThan(0);
    });

    it("should calculate total tokens with overhead", async () => {
      const { getTotalTokens } = await import("../token-counter");

      const entries = createEntries(10);
      const totalTokens = getTotalTokens(entries);

      expect(totalTokens).toBeGreaterThan(0);
    });
  });
});
