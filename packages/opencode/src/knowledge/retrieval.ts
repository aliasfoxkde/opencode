/**
 * Knowledge Retrieval System
 *
 * Handles retrieval of knowledge from Droid-Config's knowledge graph
 */

import type {
  KnowledgeNode,
  KnowledgeRelationship,
  KnowledgeQueryResult,
  KnowledgeRetrievalOptions,
  MemoryEntry,
} from "./types";
import { Log } from "../util/log";

const log = Log.create({ service: "knowledge-retrieval" });

/**
 * In-memory knowledge graph cache
 * TODO: Integrate with Droid-Config's actual knowledge graph
 */
class KnowledgeGraphCache {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private relationships: Map<string, KnowledgeRelationship> = new Map();
  private nodeRelationships: Map<string, Set<string>> = new Map();

  addNode(node: KnowledgeNode): void {
    this.nodes.set(node.id, node);
  }

  addRelationship(relationship: KnowledgeRelationship): void {
    this.relationships.set(relationship.id, relationship);

    // Update index
    if (!this.nodeRelationships.has(relationship.from)) {
      this.nodeRelationships.set(relationship.from, new Set());
    }
    this.nodeRelationships.get(relationship.from)!.add(relationship.id);
  }

  getNode(id: string): KnowledgeNode | undefined {
    return this.nodes.get(id);
  }

  getRelationships(nodeId: string): KnowledgeRelationship[] {
    const ids = this.nodeRelationships.get(nodeId) || new Set();
    return Array.from(ids)
      .map((id) => this.relationships.get(id))
      .filter((r): r is KnowledgeRelationship => r !== undefined);
  }

  getAllNodes(): KnowledgeNode[] {
    return Array.from(this.nodes.values());
  }

  searchNodes(query: string): KnowledgeNode[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllNodes().filter(
      (node) =>
        node.label.toLowerCase().includes(lowerQuery) ||
        node.content.toLowerCase().includes(lowerQuery) ||
        node.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }
}

/**
 * Memory cache
 * TODO: Integrate with Droid-Config's memory manager
 */
class MemoryCache {
  private entries: Map<string, MemoryEntry> = new Map();

  addEntry(entry: MemoryEntry): void {
    this.entries.set(entry.id, entry);
  }

  getEntry(id: string): MemoryEntry | undefined {
    const entry = this.entries.get(id);
    if (entry) {
      // Update access stats
      entry.lastAccessed = Date.now();
      entry.accessCount++;
    }
    return entry;
  }

  getRecentEntries(limit: number): MemoryEntry[] {
    return Array.from(this.entries.values())
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, limit);
  }

  getBySession(sessionId: string): MemoryEntry[] {
    return Array.from(this.entries.values())
      .filter((entry) => entry.sessionId === sessionId)
      .sort((a, b) => b.lastAccessed - a.lastAccessed);
  }
}

/**
 * Global instances
 */
const knowledgeCache = new KnowledgeGraphCache();
const memoryCache = new MemoryCache();

/**
 * Query knowledge graph
 *
 * @param options - Retrieval options
 * @returns Query results
 */
export async function queryKnowledge(
  options: KnowledgeRetrievalOptions = {}
): Promise<KnowledgeQueryResult> {
  let nodes: KnowledgeNode[] = [];
  const relationships: KnowledgeRelationship[] = [];

  // Text search
  if (options.query) {
    nodes = knowledgeCache.searchNodes(options.query);
  } else {
    nodes = knowledgeCache.getAllNodes();
  }

  // Filter by node type
  if (options.nodeType) {
    nodes = nodes.filter((node) => node.type === options.nodeType);
  }

  // Filter by tags
  if (options.tags && options.tags.length > 0) {
    nodes = nodes.filter((node) =>
      options.tags!.some((tag) => node.tags.includes(tag))
    );
  }

  // Filter by ground truth status
  if (options.groundTruthStatus) {
    nodes = nodes.filter(
      (node) => node.groundTruth === options.groundTruthStatus
    );
  }

  // Filter by minimum confidence
  if (options.minConfidence !== undefined) {
    nodes = nodes.filter((node) => node.confidence >= options.minConfidence!);
  }

  // Get relationships for matched nodes
  if (options.includeRelated) {
    const maxDepth = options.maxDepth || 1;
    const visited = new Set<string>();

    for (const node of nodes.slice(0, options.maxResults || 100)) {
      getRelatedNodes(node.id, maxDepth, visited, relationships);
    }
  }

  // Sort by confidence and limit results
  nodes.sort((a, b) => b.confidence - a.confidence);
  const limitedNodes = nodes.slice(0, options.maxResults || 100);

  return {
    nodes: limitedNodes,
    relationships,
    score: limitedNodes.length > 0 ? limitedNodes[0].confidence : 0,
    total: nodes.length,
  };
}

/**
 * Get related nodes recursively
 */
function getRelatedNodes(
  nodeId: string,
  depth: number,
  visited: Set<string>,
  relationships: KnowledgeRelationship[]
): void {
  if (depth <= 0 || visited.has(nodeId)) {
    return;
  }

  visited.add(nodeId);

  const nodeRelationships = knowledgeCache.getRelationships(nodeId);
  relationships.push(...nodeRelationships);

  for (const rel of nodeRelationships) {
    getRelatedNodes(rel.to, depth - 1, visited, relationships);
  }
}

/**
 * Add knowledge to graph
 *
 * @param node - Knowledge node to add
 * @returns Added node
 */
export async function addKnowledge(node: KnowledgeNode): Promise<KnowledgeNode> {
  knowledgeCache.addNode(node);
  log.info("Knowledge added", { nodeId: node.id, type: node.type, label: node.label });
  return node;
}

/**
 * Add memory entry
 *
 * @param entry - Memory entry to add
 * @returns Added entry
 */
export async function addMemory(entry: MemoryEntry): Promise<MemoryEntry> {
  memoryCache.addEntry(entry);
  log.debug("Memory added", { entryId: entry.id, type: entry.type });
  return entry;
}

/**
 * Retrieve memory entries
 *
 * @param sessionId - Session ID to filter by
 * @param limit - Maximum entries to return
 * @returns Memory entries
 */
export async function retrieveMemory(
  sessionId?: string,
  limit: number = 100
): Promise<MemoryEntry[]> {
  if (sessionId) {
    return memoryCache.getBySession(sessionId).slice(0, limit);
  }
  return memoryCache.getRecentEntries(limit);
}

/**
 * Get knowledge summary
 *
 * @returns Knowledge graph summary
 */
export async function getKnowledgeSummary(): Promise<{
  totalNodes: number;
  totalRelationships: number;
  nodesByType: Record<string, number>;
  groundTruthDistribution: Record<string, number>;
}> {
  const nodes = knowledgeCache.getAllNodes();

  const nodesByType: Record<string, number> = {};
  const groundTruthDistribution: Record<string, number> = {};

  for (const node of nodes) {
    nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    const status = node.groundTruth || "unverified";
    groundTruthDistribution[status] = (groundTruthDistribution[status] || 0) + 1;
  }

  return {
    totalNodes: nodes.length,
    totalRelationships: knowledgeCache.getRelationships("*").length,
    nodesByType,
    groundTruthDistribution,
  };
}

/**
 * Validate ground truth
 *
 * @param statement - Statement to validate
 * @returns Validation result
 */
export async function validateGroundTruth(
  statement: string
): Promise<{
  status: "verified" | "unverified" | "disproven" | "pending";
  confidence: number;
}> {
  // TODO: Integrate with Droid-Config's ground truth manager
  // For now, return unverified with low confidence
  return {
    status: "unverified",
    confidence: 0.5,
  };
}

/**
 * Initialize knowledge system with sample data
 */
export async function initializeKnowledge(): Promise<void> {
  // Add some sample knowledge nodes
  const sampleNodes: KnowledgeNode[] = [
    {
      id: "opencode-safety",
      type: "concept",
      label: "OpenCode Safety System",
      content: "Droid-Config safety enforcement for OpenCode tool execution",
      metadata: { module: "safety" },
      groundTruth: "verified",
      source: "droid-config",
      confidence: 1.0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: ["safety", "opencode", "enforcement"],
    },
    {
      id: "context-persistence",
      type: "concept",
      label: "Context Persistence",
      content: "Persistent context that survives directory changes and works in headless mode",
      metadata: { module: "context" },
      groundTruth: "verified",
      source: "droid-config",
      confidence: 1.0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: ["context", "persistence", "headless"],
    },
    {
      id: "agent-system",
      type: "concept",
      label: "Agent System",
      content: "Multi-agent orchestration with 15 specialized AI agents",
      metadata: { module: "agent" },
      groundTruth: "verified",
      source: "droid-config",
      confidence: 1.0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: ["agent", "orchestration", "ai"],
    },
  ];

  for (const node of sampleNodes) {
    await addKnowledge(node);
  }

  log.info("Knowledge system initialized", { nodes: sampleNodes.length });
}
