/**
 * Plugin Integration Tests
 *
 * Tests that verify all plugins work together correctly
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createSafetyHooks } from "../../src/safety/integration";
import { createContextHooks } from "../../src/context/hooks";
import { createAgentHooks } from "../../src/agent/plugin";
import { createKnowledgeHooks } from "../../src/knowledge/plugin";

// Mock PluginInput
const createMockInput = () => ({
  client: {} as any,
  project: {} as any,
  worktree: "/tmp/worktree",
  directory: "/tmp/project",
  serverUrl: new URL("http://localhost:4096"),
  $: {} as any,
});

describe("Plugin Integration", () => {
  describe("Safety Plugin", () => {
    it("should create safety hooks", async () => {
      const input = createMockInput();
      const hooks = await createSafetyHooks(input);

      expect(hooks).toBeDefined();
      expect(hooks["tool.execute.before"]).toBeDefined();
      expect(hooks["chat.message"]).toBeDefined();
      expect(hooks["config"]).toBeDefined();
    });

    it("should have correct hook signatures", async () => {
      const input = createMockInput();
      const hooks = await createSafetyHooks(input);

      // Verify tool.execute.before hook
      const beforeHook = hooks["tool.execute.before"];
      if (beforeHook) {
        expect(typeof beforeHook).toBe("function");
      }

      // Verify chat.message hook
      const chatHook = hooks["chat.message"];
      if (chatHook) {
        expect(typeof chatHook).toBe("function");
      }
    });
  });

  describe("Context Plugin", () => {
    it("should create context hooks", async () => {
      const input = createMockInput();
      const hooks = await createContextHooks(input);

      expect(hooks).toBeDefined();
      expect(hooks["tool.execute.before"]).toBeDefined();
      expect(hooks["chat.message"]).toBeDefined();
      expect(hooks["config"]).toBeDefined();
    });
  });

  describe("Agent Plugin", () => {
    it("should create agent hooks", async () => {
      const input = createMockInput();
      const hooks = await createAgentHooks(input);

      expect(hooks).toBeDefined();
      expect(hooks["chat.message"]).toBeDefined();
      expect(hooks["config"]).toBeDefined();
    });

    it("should provide agent guidance in chat", async () => {
      const input = createMockInput();
      const hooks = await createAgentHooks(input);

      const chatHook = hooks["chat.message"];
      if (chatHook) {
        const messageData = {
          sessionId: "test-session",
          agent: undefined,
          model: undefined,
          messageID: "msg-1",
        };

        const parts = [{ type: "text", text: "@agent help with backend" }];
        const messageContext = {
          message: { role: "user", content: [] } as any,
          parts,
        };

        await chatHook(messageData, messageContext as any);

        // Verify agent guidance was added for @agent requests
        const guidanceText = messageContext.parts.some(
          (p: any) => p.text && p.text.includes("Agent System")
        );
        expect(guidanceText).toBe(true);
      }
    });
  });

  describe("Knowledge Plugin", () => {
    it("should create knowledge hooks", async () => {
      const input = createMockInput();
      const hooks = await createKnowledgeHooks(input);

      expect(hooks).toBeDefined();
      expect(hooks["chat.message"]).toBeDefined();
      expect(hooks["config"]).toBeDefined();
    });
  });

  describe("Plugin Compatibility", () => {
    it("should load all plugins together", async () => {
      const input = createMockInput();

      // Create all plugins
      const safetyHooks = await createSafetyHooks(input);
      const contextHooks = await createContextHooks(input);
      const agentHooks = await createAgentHooks(input);
      const knowledgeHooks = await createKnowledgeHooks(input);

      // Verify all hooks exist
      expect(safetyHooks["tool.execute.before"]).toBeDefined();
      expect(contextHooks["tool.execute.before"]).toBeDefined();
      expect(agentHooks["chat.message"]).toBeDefined();
      expect(knowledgeHooks["chat.message"]).toBeDefined();
    });

    it("should handle hook chaining", async () => {
      const input = createMockInput();

      const hooks = [
        await createSafetyHooks(input),
        await createContextHooks(input),
        await createAgentHooks(input),
        await createKnowledgeHooks(input),
      ];

      // Simulate tool.execute.before chain
      const toolData = {
        tool: "write",
        sessionId: "test-session",
        callID: "call-1",
      };

      const toolArgs = { args: { filepath: "test.ts", content: "const x = 42;" } };

      for (const hook of hooks) {
        const beforeHook = hook["tool.execute.before"];
        if (beforeHook) {
          try {
            await beforeHook(toolData as any, toolArgs as any);
          } catch (error) {
            // Some hooks may throw for safety violations - that's expected
            expect((error as Error).message).toContain("DroidConfig Safety");
            break; // Stop chain after safety block
          }
        }
      }
    });
  });
});
