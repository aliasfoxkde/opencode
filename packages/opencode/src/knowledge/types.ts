/**
 * Knowledge System Type Definitions
 *
 * Defines types for knowledge graph and memory integration
 */

/**
 * Knowledge node types
 */
export type KnowledgeNodeType =
  | "concept"
  | "entity"
  | "relationship"
  | "fact"
  | "rule"
  | "pattern"
  | "document";

/**
 * Knowledge relationship types
 */
export type KnowledgeRelationType =
  | "depends_on"
  | "implements"
  | "extends"
  | "related_to"
  | "contradicts"
  | "example_of"
  | "contains"
  | "references";

/**
 * Ground truth status
 */
export type GroundTruthStatus =
  | "verified"
  | "unverified"
  | "disproven"
  | "pending";

/**
 * Knowledge graph node
 */
export interface KnowledgeNode {
  /** Unique node identifier */
  id: string;

  /** Node type */
  type: KnowledgeNodeType;

  /** Node label/name */
  label: string;

  /** Node content/data */
  content: string;

  /** Node metadata */
  metadata: Record<string, any>;

  /** Ground truth status */
  groundTruth?: GroundTruthStatus;

  /** Source of this knowledge */
  source?: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Creation timestamp */
  createdAt: number;

  /** Last updated timestamp */
  updatedAt: number;

  /** Tags for categorization */
  tags: string[];
}

/**
 * Knowledge graph relationship
 */
export interface KnowledgeRelationship {
  /** Unique relationship identifier */
  id: string;

  /** Source node ID */
  from: string;

  /** Target node ID */
  to: string;

  /** Relationship type */
  type: KnowledgeRelationType;

  /** Relationship weight/strength */
  weight: number;

  /** Relationship metadata */
  metadata: Record<string, any>;
}

/**
 * Knowledge query result
 */
export interface KnowledgeQueryResult {
  /** Matching nodes */
  nodes: KnowledgeNode[];

  /** Matching relationships */
  relationships: KnowledgeRelationship[];

  /** Query relevance score */
  score: number;

  /** Total results found */
  total: number;
}

/**
 * Knowledge retrieval options
 */
export interface KnowledgeRetrievalOptions {
  /** Maximum results to return */
  maxResults?: number;

  /** Minimum confidence score */
  minConfidence?: number;

  /** Filter by ground truth status */
  groundTruthStatus?: GroundTruthStatus;

  /** Filter by tags */
  tags?: string[];

  /** Filter by node type */
  nodeType?: KnowledgeNodeType;

  /** Include related nodes */
  includeRelated?: boolean;

  /** Max depth for related nodes */
  maxDepth?: number;

  /** Search query text */
  query?: string;
}

/**
 * Memory entry
 */
export interface MemoryEntry {
  /** Unique entry identifier */
  id: string;

  /** Entry type */
  type: "episodic" | "semantic" | "procedural";

  /** Entry content */
  content: string;

  /** Associated session ID */
  sessionId: string;

  /** Associated task ID (if applicable) */
  taskId?: string;

  /** Creation timestamp */
  createdAt: number;

  /** Last accessed timestamp */
  lastAccessed: number;

  /** Access count */
  accessCount: number;

  /** Importance score (0-1) */
  importance: number;

  /** Tags for categorization */
  tags: string[];

  /** Related knowledge nodes */
  relatedNodes: string[];
}

/**
 * Ground truth validation result
 */
export interface GroundTruthValidation {
  /** Statement being validated */
  statement: string;

  /** Validation status */
  status: GroundTruthStatus;

  /** Confidence in validation */
  confidence: number;

  /** Supporting evidence */
  evidence: string[];

  /** Conflicting evidence */
  conflicts: string[];

  /** Validation timestamp */
  validatedAt: number;

  /** Validator (model or system) */
  validator: string;
}

/**
 * Knowledge summary
 */
export interface KnowledgeSummary {
  /** Total nodes in graph */
  totalNodes: number;

  /** Total relationships in graph */
  totalRelationships: number;

  /** Nodes by type */
  nodesByType: Record<KnowledgeNodeType, number>;

  /** Ground truth distribution */
  groundTruthDistribution: Record<GroundTruthStatus, number>;

  /** Total memory entries */
  totalMemoryEntries: number;

  /** Memory entries by type */
  memoryByType: Record<"episodic" | "semantic" | "procedural", number>;
}
