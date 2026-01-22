/**
 * Universal Safety Enforcement Plugin for OpenCode
 *
 * This plugin provides:
 * 1. Project scaffolding and templating
 * 2. Code quality enforcement
 * 3. Placeholder/mock data detection
 * 4. Validation of AI-generated content
 * 5. Repository initialization for new projects
 *
 * @author Safety System
 * @version 1.0.0
 */

import type { Hooks, PluginInput } from "@opencode-ai/plugin"
import { Log } from "../../util/log"

namespace SafetyPlugin {
  const log = Log.create({ service: "safety-plugin" })

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  interface SafetyConfig {
    enabled: boolean
    enforceScaffolding: boolean
    detectPlaceholders: boolean
    requireGit: boolean
    requireReadme: boolean
    requireLicense: boolean
    blockDangerousPatterns: boolean
    maxFileSize: number
    allowedDomains: string[]
    templateDir: string
  }

  const DEFAULT_CONFIG: SafetyConfig = {
    enabled: true,
    enforceScaffolding: true,
    detectPlaceholders: true,
    requireGit: true,
    requireReadme: true,
    requireLicense: false,
    blockDangerousPatterns: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedDomains: ["github.com", "gitlab.com", "bitbucket.org"],
    templateDir: "~/.opencode/templates"
  }

  // ============================================================================
  // PLACEHOLDER DETECTION PATTERNS
  // ============================================================================

  const PLACEHOLDER_PATTERNS = {
    // Comments
    TODO: /\/\/\s*TODO[:\s]|\/\*[\s\S]*?\*[\s\S]*?TODO[:\s]/gi,
    FIXME: /\/\/\s*FIXME[:\s]|\/\*[\s\S]*?\*[\s\S]*?FIXME[:\s]/gi,
    XXX: /\/\/\s*XXX[:\s]|\/\*[\s\S]*?\*[\s\S]*?XXX[:\s]/gi,
    HACK: /\/\/\s*HACK[:\s]|\/\*[\s\S]*?\*[\s\S]*?HACK[:\s]/gi,

    // Values
    PLACEHOLDER_STRINGS: /("|')([Tt][Oo] *[Bb]e] *[Dd]etermined|[Tt][Bb][Dd]|[Tt][Bb][Cc]|[Nn]/[Aa]|[Tt][Oo][Dd][Oo]|[Ff][Ii][Xx][Mm][Ee]|[Xx][Xx]|[Ll][Oo][Rr][Ee][Mm] *\s*[Ii][Pp][Ss][Uu][Mm])\1/g,
    MOCK_VALUE: /("|')(mock|test|dummy|fake|placeholder|sample).*?data?\1/gi,
    LOREM_IPSUM: /lorem\s+ipsum/gi,

    // URLs/Endpoints
    PLACEHOLDER_URL: /(https?:\/\/)(example\.com|localhost|127\.0\.0\.1|0\.0\.0\.0|test\.api)/gi,

    // IDs
    PLACEHOLDER_ID: /("|')(undefined|null|NaN|infinity|test-?\d*|sample-?\d*|dummy-?\d*|placeholder-?\d*)\1/gi,
  }

  const DANGEROUS_PATTERNS = {
    // Security risks
    API_KEY: /("|')[A-Za-z0-9_]*[Aa][Pp][Ii][_ -]?[Kk][Ee][Yy].*?\1\s*[:=]\s*("|')(.*?)\1/g,
    SECRET: /("|')[A-Za-z0-9_]*[Ss][Ee][Cc][Rr][Ee][Tt].*?\1\s*[:=]\s*("|')(.*?)\1/g,
    PASSWORD: /("|')[A-Za-z0-9_]*[Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd].*?\1\s*[:=]\s*("|')(.*?)\1/g,
    TOKEN: /("|')[A-Za-z0-9_]*[Tt][Oo][Kk][Ee][Nn].*?\1\s*[:=]\s*("|')(.*?)\1/g,

    // Eval usage
    EVAL: /eval\s*\(|new\s+Function\s*\(/gi,
    DANGEROUS_INNER_HTML: /\.innerHTML\s*=\s*.*?<(?:script|iframe)/gi,

    // Hardcoded credentials
    CREDENTIALS: /("|')(?:ftp|http|smtp|imap|pop3)s?:\/\/.*?:.*?@\1/gi,
  }

  // ============================================================================
  // DETECTION FUNCTIONS
  // ============================================================================

  interface DetectionResult {
    hasPlaceholders: boolean
    hasDangerousPatterns: boolean
    placeholders: Array<{ type: string; line: number; match: string }>
    dangerous: Array<{ type: string; line: number; match: string }>
  }

  function detectIssues(content: string, filepath: string): DetectionResult {
    const result: DetectionResult = {
      hasPlaceholders: false,
      hasDangerousPatterns: false,
      placeholders: [],
      dangerous: []
    }

    const lines = content.split('\n')

    // Check for placeholders
    for (const [key, pattern] of Object.entries(PLACEHOLDER_PATTERNS)) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        const lineIndex = content.substring(0, match.index!).split('\n').length - 1
        result.placeholders.push({
          type: key,
          line: lineIndex + 1,
          match: match[0]!.substring(0, 100)
        })
        result.hasPlaceholders = true
      }
    }

    // Check for dangerous patterns (only in source files)
    const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.rb', '.go', '.rs']
    if (sourceExtensions.some(ext => filepath.endsWith(ext))) {
      for (const [key, pattern] of Object.entries(DANGEROUS_PATTERNS)) {
        const matches = content.matchAll(pattern)
        for (const match of matches) {
          const lineIndex = content.substring(0, match.index!).split('\n').length - 1
          // Don't flag if it's obviously commented out or a variable name
          const lineContent = lines[lineIndex] || ''
          if (!lineContent.trim().startsWith('//') && !lineContent.trim().startsWith('#')) {
            result.dangerous.push({
              type: key,
              line: lineIndex + 1,
              match: match[0]!.substring(0, 100)
            })
            result.hasDangerousPatterns = true
          }
        }
      }
    }

    return result
  }

  // ============================================================================
  // SCAFFOLDING SYSTEM
  // ============================================================================

  interface ProjectTemplate {
    name: string
    description: string
    files: Record<string, string>
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    scripts?: Record<string, string>
  }

  const TEMPLATES: Record<string, ProjectTemplate> = {
    "typescript-node": {
      name: "TypeScript Node.js",
      description: "Modern Node.js project with TypeScript",
      files: {
        "README.md": `# Project Name

## Description
A brief description of what this project does and how it helps.

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`bash
npm start
\`\`\`

## Development
\`\`\`bash
npm run dev
npm test
\`\`\`

## License
MIT`,
        ".gitignore": `# Dependencies
node_modules/

# Build output
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Testing
coverage/
.nyc_output/
`,
        "tsconfig.json": JSON.stringify({
          compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            outDir: "./dist",
            rootDir: "./src",
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            declaration: true,
            declarationMap: true,
            sourceMap: true
          },
          include: ["src/**/*"],
          exclude: ["node_modules", "dist"]
        }, null, 2),
        "package.json": JSON.stringify({
          name: "project-name",
          version: "1.0.0",
          description: "A brief description",
          main: "dist/index.js",
          type: "module",
          scripts: {
            build: "tsc",
            start: "node dist/index.js",
            dev: "tsc --watch",
            test: "echo \"Run tests here\"",
            lint: "echo \"Run linting here\""
          },
          keywords: [],
          author: "",
          license: "MIT"
        }, null, 2),
        "src/index.ts": `/**
 * Main entry point for the application
 */

export function main() {
  console.log('Hello, World!');
}

// Only run if this is the main module
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  main();
}
`
      },
      dependencies: {},
      devDependencies: {
        "@types/node": "latest",
        "typescript": "latest"
      },
      scripts: {
        build: "tsc",
        start: "node dist/index.js",
        dev: "tsc --watch"
      }
    },

    "react-app": {
      name: "React Application",
      description: "Modern React application with Vite",
      files: {
        "README.md": `# React App

## Getting Started
\`\`\`bash
npm install
npm run dev
\`\`\`

## Building
\`\`\`bash
npm run build
npm run preview
\`\`\`

## Testing
\`\`\`bash
npm test
\`\`\`
`,
        ".gitignore": `# Dependencies
node_modules/

# Build output
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
`,
        "vite.config.ts": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  }
})
`,
        "tsconfig.json": JSON.stringify({
          compilerOptions: {
            target: "ES2020",
            useDefineForClassFields: true,
            lib: ["ES2020", "DOM", "DOM.Iterable"],
            module: "ESNext",
            skipLibCheck: true,
            moduleResolution: "bundler",
            allowImportingTsExtensions: true,
            resolve: {
              JSON: true
            },
            isolatedModules: true,
            noEmit: true,
            jsx: "react-jsx",
            strict: true,
            noUnusedLocals: true,
            noUnusedParameters: true,
            noFallthroughCasesInSwitch: true
          },
          include: ["src"],
          references: [{ path: "./tsconfig.node.json" }]
        }, null, 2),
        "tsconfig.node.json": JSON.stringify({
          compilerOptions: {
            composite: true,
            skipLibCheck: true,
            module: "ESNext",
            moduleResolution: "bundler",
            allowSyntheticDefaultImports: true
          },
          include: ["vite.config.ts"]
        }, null, 2),
        "package.json": JSON.stringify({
          name: "react-app",
          version: "1.0.0",
          type: "module",
          scripts: {
            dev: "vite",
            build: "tsc && vite build",
            preview: "vite preview",
            lint: "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
          }
        }, null, 2),
        "index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
        "src/main.tsx": `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import App from './App'
import { worker } from './mocks/browser'

worker.start()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`,
        "src/App.tsx": `import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
    </div>
  )
}

export default App
`,
        "src/index.css": `:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}
a:hover {
  color: #535bf2;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: #646cff;
}
button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

@media (prefers-color-scheme: dark) {
  a:hover {
    color: #24c8db;
  }
  button {
    background-color: #f9f9f9;
  }
}

#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
`,
        "src/App.css": `.App {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  padding: 2em;
}
`
      },
      dependencies: {
        "react": "^18.3.1",
        "react-dom": "^18.3.1"
      },
      devDependencies: {
        "@types/react": "^18.3.12",
        "@types/react-dom": "^18.3.1",
        "@vitejs/plugin-react": "^4.3.4",
        "vite": "^6.0.7"
      },
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        preview: "vite preview"
      }
    }
  }

  async function initializeGitRepo(directory: string, projectName: string): Promise<boolean> {
    const { $ } = await import()

    try {
      log.info("Initializing git repository", { directory })

      await $`cd ${directory} && git init`
      await $`cd ${directory} && git add .`
      await $`cd ${directory} && git commit -m "Initial commit from OpenCode Safety System"`

      log.info("Git repository initialized successfully")
      return true
    } catch (error) {
      log.error("Failed to initialize git repository", { error })
      return false
    }
  }

  async function applyTemplate(
    directory: string,
    projectName: string,
    templateName: string
  ): Promise<boolean> {
    const template = TEMPLATES[templateName]
    if (!template) {
      log.error("Template not found", { templateName })
      return false
    }

    const { $ } = await import()
    const fs = await import("fs")
    const path = await import("path")

    try {
      log.info("Applying template", { template: templateName, directory, projectName })

      // Create directory structure
      const srcDir = path.join(directory, "src")
      await fs.promises.mkdir(srcDir, { recursive: true })

      // Write files
      for (const [filepath, content] of Object.entries(template.files)) {
        const fullPath = path.join(directory, filepath)
        const dir = path.dirname(fullPath)

        await fs.promises.mkdir(dir, { recursive: true })
        await fs.promises.writeFile(fullPath, content, "utf-8")
        log.info("Created file", { filepath: fullPath })
      }

      // Initialize package.json if not exists
      const packageJsonPath = path.join(directory, "package.json")
      if (fs.existsSync(packageJsonPath)) {
        const existing = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
        const newPackageJson = {
          ...existing,
          ...JSON.parse(template.files["package.json"]!),
          dependencies: {
            ...existing.dependencies,
            ...template.dependencies
          },
          devDependencies: {
            ...existing.devDependencies,
            ...template.devDependencies
          }
        }
        await fs.promises.writeFile(
          packageJsonPath,
          JSON.stringify(newPackageJson, null, 2),
          "utf-8"
        )
      }

      // Install dependencies
      log.info("Installing dependencies")
      await $`cd ${directory} && bun install`

      // Initialize git if required
      if (DEFAULT_CONFIG.requireGit) {
        await initializeGitRepo(directory, projectName)
      }

      log.info("Template applied successfully", { template: templateName })
      return true
    } catch (error) {
      log.error("Failed to apply template", { error })
      return false
    }
  }

  // ============================================================================
  // MAIN PLUGIN EXPORT
  // ============================================================================

  export const plugin: Hooks = {
    name: "@opencode/safety-enforcement",

    // Tool execution hook - validate before running tools
    "tool.execute.before": async ({ tool, sessionID, callID }, { args }) => {
      if (!DEFAULT_CONFIG.enabled) return

      log.debug("Tool execution before hook", { tool, callID })

      // Check for file write operations
      if (tool === "write" || tool === "edit") {
        const filepath = args.filepath || args.path
        const content = args.content || args.text

        if (filepath && content) {
          const detection = detectIssues(content, filepath)

          if (detection.hasPlaceholders && DEFAULT_CONFIG.detectPlaceholders) {
            log.warn("Placeholder content detected", {
              filepath,
              placeholders: detection.placeholders
            })

            // For now, just warn - don't block
            // In production, this could be configured to block
          }

          if (detection.hasDangerousPatterns && DEFAULT_CONFIG.blockDangerousPatterns) {
            log.error("Dangerous patterns detected", {
              filepath,
              dangerous: detection.dangerous
            })

            // Block dangerous operations
            throw new Error(
              `Blocked dangerous content in ${filepath}:\n` +
              detection.dangerous.map(d => `  - ${d.type} at line ${d.line}`).join('\n')
            )
          }
        }
      }

      // Check file size
      if (tool === "read" && args.filepath) {
        const fs = await import("fs")
        try {
          const stats = await fs.promises.stat(args.filepath)
          if (stats.size > DEFAULT_CONFIG.maxFileSize) {
            log.warn("File size exceeds limit", {
              filepath: args.filepath,
              size: stats.size,
              limit: DEFAULT_CONFIG.maxFileSize
            })
          }
        } catch {
          // File might not exist, that's okay
        }
      }
    },

    // Tool execution after hook - validate results
    "tool.execute.after": async ({ tool, sessionID, callID }, { output }) => {
      if (!DEFAULT_CONFIG.enabled) return

      log.debug("Tool execution after hook", { tool, callID })

      // Validate write operations succeeded
      if ((tool === "write" || tool === "edit") && output.metadata?.error) {
        log.error("Tool execution failed", {
          tool,
          callID,
          error: output.metadata.error
        })
      }
    },

    // Chat message hook - intercept and validate
    "chat.message": async ({ sessionID, agent, model, messageID, variant }, { message, parts }) => {
      if (!DEFAULT_CONFIG.enabled) return

      log.debug("Chat message hook", { sessionID, agent, messageID })

      // Check if user is asking to create a new project
      const userText = parts.map((p: any) => p.text || "").join(" ").toLowerCase()

      if (userText.includes("create new project") || userText.includes("initialize project") || userText.includes("scaffold")) {
        log.info("New project request detected", { userText })

        // Add a system message to guide the AI
        parts.push({
          type: "text",
          text: `\n\n[Safety System]: When creating a new project:
1. Always initialize a git repository
2. Create a proper README.md with project description
3. Set up proper project structure (src/, tests/, etc.)
4. Configure appropriate tooling (TypeScript, ESLint, Prettier, etc.)
5. Create .gitignore file
6. Use project templates from: ${Object.keys(TEMPLATES).join(", ")}
7. Never use placeholder data (TODO, FIXME, XXX, etc.)
8. Never use mock/example data in production code
9. Always create meaningful, realistic example code
10. Follow security best practices

Available templates: ${Object.keys(TEMPLATES).map(t => `- ${t}: ${TEMPLATES[t].description}`).join("\n")}

Before creating files, ask the user which template they want to use.`
        })
      }

      // Check for placeholder requests
      if (userText.includes("placeholder") || userText.includes("mock data") || userText.includes("sample data")) {
        log.warn("Placeholder/mock data request detected", { userText })

        parts.push({
          type: "text",
          text: `\n\n[Safety System Warning]:
- Do NOT use placeholder data (TODO, FIXME, XXX, etc.)
- Do NOT use mock/sample data in production code
- Create realistic, meaningful example code instead
- If testing is needed, use proper test fixtures and factories`
        })
      }
    },

    // Modify chat parameters to inject safety guidelines
    "chat.params": async ({ sessionID, agent, model, provider, message }, { temperature, topP, topK, options }) => {
      if (!DEFAULT_CONFIG.enabled) return

      // Add safety system instructions to the options
      options.safetySystem = {
        enabled: true,
        detectPlaceholders: DEFAULT_CONFIG.detectPlaceholders,
        blockDangerousPatterns: DEFAULT_CONFIG.blockDangerousPatterns,
        requireScaffolding: DEFAULT_CONFIG.enforceScaffolding,
        templates: Object.keys(TEMPLATES)
      }

      log.debug("Chat params modified", { sessionID, options })
    },

    // Config hook - initialize safety settings
    config: async (config) => {
      log.info("Safety enforcement plugin configured", { config: DEFAULT_CONFIG })
    }
  }
}

export default SafetyPlugin.plugin
