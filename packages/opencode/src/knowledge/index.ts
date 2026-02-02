/**
 * Knowledge System for OpenCode
 *
 * Integrates Droid-Config's knowledge graph and memory systems
 */

import type { PluginInput, Hooks } from "@opencode-ai/plugin";
import { createKnowledgeHooks } from "./plugin";

// Export all types
export type {
  KnowledgeNodeType,
  KnowledgeRelationType,
  GroundTruthStatus,
  KnowledgeNode,
  KnowledgeRelationship,
  KnowledgeQueryResult,
  KnowledgeRetrievalOptions,
  MemoryEntry,
  GroundTruthValidation,
  KnowledgeSummary,
} from "./types";

// Export knowledge retrieval
export {
  queryKnowledge,
  addKnowledge,
  addMemory,
  retrieveMemory,
  getKnowledgeSummary,
  validateGroundTruth,
  initializeKnowledge,
} from "./retrieval";

/**
 * OpenCode Plugin Entry Point
 *
 * This is the main function that OpenCode calls to initialize the
 * knowledge system plugin.
 */
export default async function knowledgePlugin(input: PluginInput): Promise<Hooks> {
  return createKnowledgeHooks(input);
}
