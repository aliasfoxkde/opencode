/**
 * Dynamic Configuration Loader for Safety Plugin
 * Loads configuration from Droid-Config safety system
 */

import { Log } from "../../util/log"

namespace SafetyConfig {
  const log = Log.create({ service: "safety-config" })

  export interface SafetyConfig {
    version: string
    enabled: boolean
    name: string
    description: string
    enforcement: {
      strictMode: boolean
      warnMode: boolean
      autoFix: boolean
    }
    rules: {
      placeholders: {
        enabled: boolean
        patterns: string[]
        blockOnDetection: boolean
        severity: string
      }
      mockData: {
        enabled: boolean
        patterns: string[]
        blockOnDetection: boolean
        severity: string
        exclusions: string[]
      }
      secrets: {
        enabled: boolean
        patterns: string[]
        blockOnDetection: boolean
        severity: string
        allowEnvVars: boolean
      }
      dangerousCode: {
        enabled: boolean
        patterns: string[]
        blockOnDetection: boolean
        severity: string
      }
      scaffolding: {
        enabled: boolean
        requireGit: boolean
        requireReadme: boolean
        requireLicense: boolean
        templates: Record<string, {
          description: string
          files: string[]
        }>
      }
    }
    modelSpecific: Record<string, {
      safetyLevel: string
      maxFileSize: number
      allowNetwork: boolean
      allowSystemCommands: boolean
      allowedOperations: string[]
      maxTokensPerOperation: number
      restrictions: {
        allowMultipleFileEdits: boolean
        allowFileDeletion: boolean
        allowSystemPackages: boolean
      }
    }>
    ragIntegration: {
      enabled: boolean
      databasePath: string
      endpoint: string
      contextWindowSize: number
      similarityThreshold: number
      maxContextTokens: number
    }
    observability: {
      enabled: boolean
      logLevel: string
      logViolations: boolean
      logToDatabase: boolean
    }
  }

  export const DEFAULT_CONFIG: SafetyConfig = {
    version: "2.0.0",
    enabled: true,
    name: "opencode-safety",
    description: "Safety enforcement for OpenCode",
    enforcement: {
      strictMode: false,
      warnMode: true,
      autoFix: true
    },
    rules: {
      placeholders: {
        enabled: true,
        patterns: ["TODO", "FIXME", "XXX", "HACK", "TBD", "TBC"],
        blockOnDetection: false,
        severity: "warning"
      },
      mockData: {
        enabled: true,
        patterns: ["mock", "test", "dummy", "fake", "placeholder", "sample"],
        blockOnDetection: true,
        severity: "error",
        exclusions: ["test/", "spec/", "__tests__/", ".test.", ".spec."]
      },
      secrets: {
        enabled: true,
        patterns: ["api_key", "apikey", "api-key", "secret", "password", "token", "private_key", "auth"],
        blockOnDetection: true,
        severity: "critical",
        allowEnvVars: true
      },
      dangerousCode: {
        enabled: true,
        patterns: ["eval\\(", "new Function\\(", ".innerHTML.*<script", "document.write", "dangerouslySetInnerHTML"],
        blockOnDetection: true,
        severity: "error"
      },
      scaffolding: {
        enabled: true,
        requireGit: true,
        requireReadme: true,
        requireLicense: false,
        templates: {}
      }
    },
    modelSpecific: {},
    ragIntegration: {
      enabled: false,
      databasePath: "/home/mkinney/repos/Droid-Config/data/memory.db",
      endpoint: "http://localhost:4096/rag",
      contextWindowSize: 5,
      similarityThreshold: 0.7,
      maxContextTokens: 2000
    },
    observability: {
      enabled: true,
      logLevel: "INFO",
      logViolations: true,
      logToDatabase: false
    }
  }

  /**
   * Load configuration from Droid-Config
   */
  export async function loadConfig(): Promise<SafetyConfig> {
    const configPaths = [
      process.env.DROID_SAFETY_CONFIG || "/home/mkinney/repos/Droid-Config/config/safety/opencode.json",
      "/home/mkinney/repos/Droid-Config/config/safety/default.json"
    ]

    for (const configPath of configPaths) {
      try {
        const fs = await import("fs")
        if (fs.existsSync(configPath)) {
          const content = await fs.promises.readFile(configPath, "utf-8")
          const config = JSON.parse(content) as SafetyConfig
          log.info("Loaded safety configuration from Droid-Config", { configPath })
          return config
        }
      } catch (error) {
        log.debug("Could not load config from path", { configPath, error })
      }
    }

    log.info("Using default safety configuration")
    return DEFAULT_CONFIG
  }

  /**
   * Get model-specific safety guidelines
   */
  export function getModelSafetyRules(modelId: string): {
    safetyLevel: string
    allowedOperations: string[]
    maxFileSize: number
  } {
    // Default rules
    const defaults = {
      safetyLevel: "standard",
      allowedOperations: ["write", "edit", "bash", "read"],
      maxFileSize: 10 * 1024 * 1024
    }

    // Model-specific rules
    if (modelId.startsWith("zai-glm47")) {
      return {
        safetyLevel: "strict",
        allowedOperations: ["write", "edit", "bash", "read"],
        maxFileSize: 10 * 1024 * 1024
      }
    }

    if (modelId.startsWith("zai-glm46v")) {
      return {
        safetyLevel: "moderate",
        allowedOperations: ["write", "edit", "read"],
        maxFileSize: 50 * 1024 * 1024
      }
    }

    if (modelId.startsWith("google-gemma") || modelId.startsWith("gemini")) {
      return {
        safetyLevel: "standard",
        allowedOperations: ["write", "edit", "bash", "read"],
        maxFileSize: 10 * 1024 * 1024
      }
    }

    if (modelId.startsWith("nanogpt")) {
      return {
        safetyLevel: "standard",
        allowedOperations: ["write", "edit"],
        maxFileSize: 10 * 1024 * 1024
      }
    }

    return defaults
  }
}
