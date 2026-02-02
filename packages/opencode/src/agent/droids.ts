/**
 * Droid Agent Definitions
 *
 * 18 specialized AI agents from Droid-Config .factory/droids/
 */

import type { AgentDefinition } from "./types";

/**
 * Development Specialists
 */
const BACKEND_DEV: AgentDefinition = {
  id: "backend-dev",
  name: "Backend Development Specialist",
  description: "Expert in server-side development, APIs, databases, and backend architecture",
  capabilities: [
    "code_generation",
    "code_review",
    "debugging",
    "architecture",
    "database",
    "testing",
  ],
  model: "glm-4.7",
  priority: "normal",
  maxConcurrentTasks: 3,
  timeout: 300,
  enabled: true,
};

const FRONTEND_DEV: AgentDefinition = {
  id: "frontend-dev",
  name: "Frontend Development Specialist",
  description: "Expert in UI/UX implementation, responsive design, and frontend frameworks",
  capabilities: [
    "code_generation",
    "code_review",
    "debugging",
    "testing",
  ],
  model: "glm-4.7",
  priority: "normal",
  maxConcurrentTasks: 3,
  timeout: 300,
  enabled: true,
};

const FULLSTACK_DEV: AgentDefinition = {
  id: "fullstack-dev",
  name: "Full-Stack Development Specialist",
  description: "Expert in complete web application development from database to UI",
  capabilities: [
    "code_generation",
    "code_review",
    "debugging",
    "architecture",
    "database",
    "testing",
    "devops",
  ],
  model: "glm-4.7",
  priority: "high",
  maxConcurrentTasks: 2,
  timeout: 600,
  enabled: true,
};

const DATABASE_DEV: AgentDefinition = {
  id: "database-dev",
  name: "Database Development Specialist",
  description: "Expert in database design, SQL, NoSQL, migrations, and data modeling",
  capabilities: [
    "code_generation",
    "code_review",
    "architecture",
    "database",
  ],
  model: "glm-4.7",
  priority: "normal",
  maxConcurrentTasks: 3,
  timeout: 300,
  enabled: true,
};

const CLOUD_DEV: AgentDefinition = {
  id: "cloud-dev",
  name: "Cloud Development Specialist",
  description: "Expert in cloud platforms, serverless, microservices, and distributed systems",
  capabilities: [
    "code_generation",
    "code_review",
    "architecture",
    "devops",
  ],
  model: "glm-4.7",
  priority: "normal",
  maxConcurrentTasks: 2,
  timeout: 600,
  enabled: true,
};

/**
 * AI/ML Specialists
 */
const AI_MODEL_ORCHESTRATION: AgentDefinition = {
  id: "ai-orchestrator",
  name: "AI Model Orchestration Specialist",
  description: "Expert in multi-model AI systems, prompt engineering, and LLM optimization",
  capabilities: [
    "code_generation",
    "code_review",
    "research",
    "analysis",
  ],
  model: "glm-4.7",
  priority: "high",
  maxConcurrentTasks: 2,
  timeout: 300,
  enabled: true,
};

const DATA_SCIENCE_ML: AgentDefinition = {
  id: "datascience-ml",
  name: "Data Science & ML Specialist",
  description: "Expert in machine learning, data analysis, statistical modeling, and AI pipelines",
  capabilities: [
    "code_generation",
    "code_review",
    "research",
    "analysis",
  ],
  model: "glm-4.7",
  priority: "normal",
  maxConcurrentTasks: 2,
  timeout: 600,
  enabled: true,
};

/**
 * Specialized Engineering
 */
const BLOCKCHAIN_WEB3: AgentDefinition = {
  id: "blockchain-web3",
  name: "Blockchain & Web3 Specialist",
  description: "Expert in smart contracts, DeFi, NFTs, and blockchain development",
  capabilities: [
    "code_generation",
    "code_review",
    "security",
  ],
  model: "glm-4.7",
  priority: "normal",
  maxConcurrentTasks: 2,
  timeout: 300,
  enabled: true,
};

const CYBERSECURITY: AgentDefinition = {
  id: "cybersecurity",
  name: "Cybersecurity Specialist",
  description: "Expert in security auditing, penetration testing, and secure development",
  capabilities: [
    "code_review",
    "security",
    "testing",
    "analysis",
  ],
  model: "glm-4.7",
  priority: "high",
  maxConcurrentTasks: 2,
  timeout: 300,
  enabled: true,
};

/**
 * Support Roles
 */
const CONTENT_CREATION: AgentDefinition = {
  id: "content-creator",
  name: "Content Creation Specialist",
  description: "Expert in technical writing, documentation, and content generation",
  capabilities: [
    "code_generation",
    "documentation",
  ],
  model: "glm-4.7",
  priority: "normal",
  maxConcurrentTasks: 5,
  timeout: 300,
  enabled: true,
};

const EDUCATIONAL: AgentDefinition = {
  id: "educational",
  name: "Educational Content Specialist",
  description: "Expert in creating tutorials, explanations, and learning materials",
  capabilities: [
    "code_generation",
    "documentation",
  ],
  model: "glm-4.7",
  priority: "normal",
  maxConcurrentTasks: 5,
  timeout: 300,
  enabled: true,
};

const PROJECT_MANAGEMENT: AgentDefinition = {
  id: "project-manager",
  name: "Project Management Specialist",
  description: "Expert in project planning, task breakdown, and milestone tracking",
  capabilities: [
    "analysis",
    "documentation",
  ],
  model: "glm-4.7",
  priority: "normal",
  maxConcurrentTasks: 3,
  timeout: 300,
  enabled: true,
};

const RESEARCH: AgentDefinition = {
  id: "research",
  name: "Research Specialist",
  description: "Expert in information gathering, analysis, and synthesis",
  capabilities: [
    "research",
    "analysis",
    "documentation",
  ],
  model: "glm-4.7",
  priority: "normal",
  maxConcurrentTasks: 3,
  timeout: 600,
  enabled: true,
};

/**
 * Quality Assurance
 */
const MASTER_TESTING_AUTOMATION: AgentDefinition = {
  id: "testing-automation",
  name: "Master Testing Automation Specialist",
  description: "Expert in test automation, QA strategies, and comprehensive testing frameworks",
  capabilities: [
    "code_generation",
    "code_review",
    "testing",
  ],
  model: "glm-4.7",
  priority: "high",
  maxConcurrentTasks: 3,
  timeout: 300,
  enabled: true,
};

/**
 * Design
 */
const UI_UX_DESIGN: AgentDefinition = {
  id: "ui-ux-design",
  name: "UI/UX Design Specialist",
  description: "Expert in user interface design, user experience, and design systems",
  capabilities: [
    "code_generation",
    "code_review",
  ],
  model: "glm-4.7",
  priority: "normal",
  maxConcurrentTasks: 3,
  timeout: 300,
  enabled: true,
};

/**
 * DevOps
 */
const DEVOPS_QUALITY_ORCHESTRATOR: AgentDefinition = {
  id: "devops-orchestrator",
  name: "Universal DevOps Quality Orchestrator",
  description: "Expert in CI/CD, infrastructure, deployment, and operations",
  capabilities: [
    "code_generation",
    "code_review",
    "devops",
    "testing",
  ],
  model: "glm-4.7",
  priority: "high",
  maxConcurrentTasks: 2,
  timeout: 600,
  enabled: true,
};

/**
 * All available agents
 */
export const AGENTS: AgentDefinition[] = [
  BACKEND_DEV,
  FRONTEND_DEV,
  FULLSTACK_DEV,
  DATABASE_DEV,
  CLOUD_DEV,
  AI_MODEL_ORCHESTRATION,
  DATA_SCIENCE_ML,
  BLOCKCHAIN_WEB3,
  CYBERSECURITY,
  CONTENT_CREATION,
  EDUCATIONAL,
  PROJECT_MANAGEMENT,
  RESEARCH,
  MASTER_TESTING_AUTOMATION,
  UI_UX_DESIGN,
  DEVOPS_QUALITY_ORCHESTRATOR,
];
