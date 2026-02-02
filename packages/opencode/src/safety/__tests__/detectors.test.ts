/**
 * Safety Detectors Tests
 */

import { describe, it, expect } from "bun:test";
import { checkSafety, shouldBlockTool, SAFETY_RULES } from "../detectors";

describe("Safety Detectors", () => {
  describe("checkSafety", () => {
    it("should detect incomplete markers (warning)", () => {
      const content = "const TASK = 'todo'; // TODO: implement this";
      const result = checkSafety(content, "src/app.ts");

      // Warnings don't make content unsafe
      expect(result.safe).toBe(true);
      expect(result.violations.some((v) => v.rule === "incomplete_marker")).toBe(true);
      expect(result.summary.warning).toBeGreaterThan(0);
    });

    it("should detect test data in production code (error, blocking)", () => {
      // Pattern matches: test data, test value, test example, etc.
      const content = "const test data = { value: 123 };";
      const result = checkSafety(content, "src/user.ts");

      // This is a blocking error
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.rule === "test_data_in_production")).toBe(true);
      expect(result.summary.error).toBeGreaterThan(0);
    });

    it("should detect exposed secrets (critical, blocking)", () => {
      const content = `
        const API_KEY = "sk-1234567890abcdef";
        const password = "secret123";
      `;
      const result = checkSafety(content, "config.ts");

      // Critical violations make content unsafe
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.rule === "secret_exposed")).toBe(true);
      expect(result.summary.critical).toBeGreaterThan(0);
    });

    it("should detect dangerous eval usage (error, blocking)", () => {
      const content = "const result = eval(userInput);";
      const result = checkSafety(content, "processor.ts");

      // This is a blocking error
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.rule === "dangerous_eval")).toBe(true);
      expect(result.summary.error).toBeGreaterThan(0);
    });

    it("should detect hardcoded URLs (warning)", () => {
      const content = 'const apiUrl = "https://api.example.com/v1/";';
      const result = checkSafety(content, "api.ts");

      // Warnings don't make content unsafe
      expect(result.safe).toBe(true);
      expect(result.violations.some((v) => v.rule === "hardcoded_url")).toBe(true);
      expect(result.summary.warning).toBeGreaterThan(0);
    });

    it("should allow safe code", () => {
      const content = `
        const userData = {
          name: userName,
          email: userEmail,
        };
        const apiUrl = process.env.API_URL;
      `;
      const result = checkSafety(content, "src/user.ts");

      expect(result.safe).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it("should respect file exclusions", () => {
      const content = "const TASK = 'todo'; // TODO: implement";
      const result = checkSafety(content, "README.md");

      expect(result.safe).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it("should count violations by severity", () => {
      const content = `
        const TASK = "todo";
        const API_KEY = "sk-test";
        const result = eval(code);
      `;
      const result = checkSafety(content, "app.ts");

      expect(result.summary).toBeDefined();
      expect(result.summary.warning).toBeGreaterThan(0);
      expect(result.summary.critical).toBeGreaterThan(0);
      expect(result.summary.error).toBeGreaterThan(0);
    });
  });

  describe("shouldBlockTool", () => {
    it("should not block non-write tools", () => {
      const result = shouldBlockTool({
        tool: "read",
        args: { filepath: "config.json" },
      });

      expect(result.block).toBe(false);
    });

    it("should block write with critical violations", () => {
      const result = shouldBlockTool({
        tool: "write",
        args: {
          filepath: "config.ts",
          content: "const API_KEY = 'sk-test';",
        },
      });

      expect(result.block).toBe(true);
      expect(result.reason).toBeDefined();
    });

    it("should not block write with safe content", () => {
      const result = shouldBlockTool({
        tool: "write",
        args: {
          filepath: "app.ts",
          content: "const x = 42;",
        },
      });

      expect(result.block).toBe(false);
    });
  });

  describe("SAFETY_RULES", () => {
    it("should have all required safety rules", () => {
      const ruleNames = SAFETY_RULES.map((r) => r.name);

      expect(ruleNames).toContain("incomplete_marker");
      expect(ruleNames).toContain("test_data_in_production");
      expect(ruleNames).toContain("secret_exposed");
      expect(ruleNames).toContain("dangerous_eval");
      expect(ruleNames).toContain("hardcoded_url");
    });

    it("should have proper severity levels", () => {
      for (const rule of SAFETY_RULES) {
        expect(["warning", "error", "critical"]).toContain(rule.severity);
      }
    });
  });
});
