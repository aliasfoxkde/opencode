/**
 * Knowledge System Plugin for OpenCode
 *
 * Integrates Droid-Config's knowledge graph with OpenCode
 */

import type { PluginInput, Hooks } from "@opencode-ai/plugin";
import { Log } from "../util/log";
import {
  queryKnowledge,
  addKnowledge,
  addMemory,
  retrieveMemory,
  getKnowledgeSummary,
  initializeKnowledge,
} from "./retrieval";

const log = Log.create({ service: "knowledge-plugin" });

/**
 * Create knowledge hooks for OpenCode plugin system
 */
export async function createKnowledgeHooks(
  input: PluginInput
): Promise<Partial<Hooks>> {
  // Initialize knowledge system
  await initializeKnowledge();

  return {
    /**
     * Chat message hook - provide knowledge context
     */
    "chat.message": async (messageData, messageContext) => {
      const { parts } = messageContext;
      if (!parts) return;

      const userText = parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join(" ");

      // Query knowledge based on message content
      const knowledge = await queryKnowledge({
        query: userText.substring(0, 100), // First 100 chars for context
        maxResults: 5,
        includeRelated: false,
      });

      if (knowledge.nodes.length > 0) {
        // Add knowledge context to the message
        const knowledgeContext = formatKnowledgeContext(knowledge);

        parts.push({
          type: "text",
          text: knowledgeContext,
        } as any);

        log.debug("Knowledge context added", {
          sessionId: messageData.sessionID,
          nodes: knowledge.nodes.length,
        });
      }

      // Store message in memory
      await addMemory({
        id: `msg-${messageData.messageID || Date.now()}`,
        type: "episodic",
        content: userText,
        sessionId: messageData.sessionID,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 1,
        importance: 0.5,
        tags: [],
        relatedNodes: knowledge.nodes.map((n) => n.id),
      });
    },

    /**
     * Config hook - initialize knowledge system
     */
    config: async (configData) => {
      const summary = await getKnowledgeSummary();

      log.info("Knowledge system initialized", {
        totalNodes: summary.totalNodes,
        nodesByType: summary.nodesByType,
      });
    },
  };
}

/**
 * Format knowledge context for chat messages
 */
function formatKnowledgeContext(
  knowledge: { nodes: any[]; score: number }
): string {
  if (knowledge.nodes.length === 0) {
    return "";
  }

  const relevantKnowledge = knowledge.nodes
    .slice(0, 3) // Top 3 most relevant
    .map((node) => `- ${node.label}: ${node.content.substring(0, 100)}...`)
    .join("\n");

  return `
[Relevant Knowledge]

${relevantKnowledge}

Confidence: ${(knowledge.score * 100).toFixed(0)}%
`.trim();
}

/**
 * Knowledge plugin entry point for OpenCode
 */
export default async function knowledgePlugin(
  input: PluginInput
): Promise<Hooks> {
  return createKnowledgeHooks(input);
}
