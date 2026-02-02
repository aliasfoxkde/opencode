/**
 * Context Limits Tests
 */

import { describe, it, expect } from "bun:test";
import {
  getModelLimit,
  getUsableLimit,
  getMaxLimit,
  getBuffer,
  isWithinSafeLimit,
  getContextUsage,
  getUsageStatus,
  getContextBudget,
  MODEL_LIMITS,
  DEFAULT_MODEL_LIMIT,
} from "../limits";

describe("Model Context Limits", () => {
  describe("getModelLimit", () => {
    it("should return GLM-4.7 limits", () => {
      const limit = getModelLimit("glm-4.7");

      expect(limit.modelId).toBe("glm-4.7");
      expect(limit.maxTokens).toBe(202750);
      expect(limit.usableTokens).toBe(162200); // 80% with 20% buffer
    });

    it("should return Claude Opus limits", () => {
      const limit = getModelLimit("claude-opus-4.5");

      expect(limit.modelId).toBe("claude-opus-4.5");
      expect(limit.maxTokens).toBe(200000);
      expect(limit.usableTokens).toBe(160000); // 80% with 20% buffer
    });

    it("should return default limit for unknown model", () => {
      const limit = getModelLimit("unknown-model-x");

      expect(limit).toEqual(DEFAULT_MODEL_LIMIT);
    });

    it("should handle model ID variations", () => {
      const limit1 = getModelLimit("claude-opus-4.5-20250514");
      const limit2 = getModelLimit("claude-opus-4.5");

      expect(limit1.maxTokens).toBe(limit2.maxTokens);
    });
  });

  describe("getUsableLimit", () => {
    it("should return usable tokens with buffer applied", () => {
      const usable = getUsableLimit("glm-4.7");

      expect(usable).toBe(162200); // 80% of 202750
    });
  });

  describe("getMaxLimit", () => {
    it("should return maximum tokens without buffer", () => {
      const max = getMaxLimit("glm-4.7");

      expect(max).toBe(202750);
    });
  });

  describe("getBuffer", () => {
    it("should calculate buffer size", () => {
      const buffer = getBuffer("glm-4.7");

      expect(buffer).toBe(40550); // 202750 - 162200
    });
  });

  describe("isWithinSafeLimit", () => {
    it("should return true for tokens under limit", () => {
      const result = isWithinSafeLimit("glm-4.7", 100000);

      expect(result).toBe(true);
    });

    it("should return false for tokens over limit", () => {
      const result = isWithinSafeLimit("glm-4.7", 200000);

      expect(result).toBe(false);
    });

    it("should return true at exactly the limit", () => {
      const result = isWithinSafeLimit("glm-4.7", 162200);

      expect(result).toBe(true);
    });
  });

  describe("getContextUsage", () => {
    it("should calculate usage percentage", () => {
      const usage = getContextUsage("glm-4.7", 81100); // 50% of usable

      expect(usage).toBeCloseTo(50, 0);
    });

    it("should cap at 100%", () => {
      const usage = getContextUsage("glm-4.7", 300000);

      expect(usage).toBe(100);
    });
  });

  describe("getUsageStatus", () => {
    it("should return 'safe' for low usage", () => {
      const status = getUsageStatus("glm-4.7", 50000);

      expect(status).toBe("safe");
    });

    it("should return 'warning' for medium usage", () => {
      const status = getUsageStatus("glm-4.7", 100000); // ~62%

      expect(status).toBe("warning");
    });

    it("should return 'critical' for high usage", () => {
      const status = getUsageStatus("glm-4.7", 140000); // ~86%

      expect(status).toBe("critical");
    });

    it("should return 'exceeded' for over limit", () => {
      const status = getUsageStatus("glm-4.7", 200000);

      expect(status).toBe("exceeded");
    });
  });

  describe("getContextBudget", () => {
    it("should return budget information", () => {
      const budget = getContextBudget("glm-4.7", 81100);

      expect(budget.modelId).toBe("glm-4.7");
      expect(budget.usableLimit).toBe(162200);
      expect(budget.currentTokens).toBe(81100);
      expect(budget.remainingTokens).toBe(81100);
      expect(budget.usagePercent).toBeCloseTo(50, 0);
      expect(budget.status).toBe("safe");
    });

    it("should calculate correct remaining tokens", () => {
      const budget = getContextBudget("glm-4.7", 162200);

      expect(budget.remainingTokens).toBe(0);
      expect(budget.usagePercent).toBe(100);
    });
  });

  describe("MODEL_LIMITS", () => {
    it("should have limits for major models", () => {
      expect(MODEL_LIMITS["glm-4.7"]).toBeDefined();
      expect(MODEL_LIMITS["claude-opus-4.5"]).toBeDefined();
      expect(MODEL_LIMITS["gpt-4"]).toBeDefined();
    });

    it("should have 20% buffer for all models", () => {
      for (const limit of Object.values(MODEL_LIMITS)) {
        const expectedUsable = Math.floor(limit.maxTokens * 0.8);
        expect(limit.usableTokens).toBe(expectedUsable);
      }
    });
  });
});
