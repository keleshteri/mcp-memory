/**
 * @ai-metadata
 * @class: MCPMemoryServer
 * @description: Main MCP server implementation that provides AI coding assistants with memory management, file approval tracking, and changelog functionality
 * @last-update: 2024-12-20
 * @last-editor: ai-assistant
 * @changelog: ./CHANGELOG.md
 * @stability: stable
 * @edit-permissions: method-specific
 * @method-permissions: { "constructor": "read-only", "detectProjectRoot": "read-only", "initializeProject": "add-only", "setupHandlers": "read-only", "run": "read-only" }
 * @dependencies: ["@modelcontextprotocol/sdk", "./memory-manager.js", "./changelog-manager.js", "./metadata-parser.js", "./rule-engine.js", "chalk", "fs-extra", "path"]
 * @tests: ["./tests/index.test.js"]
 * @breaking-changes-risk: high
 * @review-required: true
 * @ai-context: "This is the core MCP server implementation. Changes here affect all MCP protocol interactions and tool availability. Handle with extreme care."
 *
 * @approvals:
 *   - dev-approved: false
 *   - dev-approved-by: ""
 *   - dev-approved-date: ""
 *   - code-review-approved: false
 *   - code-review-approved-by: ""
 *   - code-review-date: ""
 *   - qa-approved: false
 *   - qa-approved-by: ""
 *   - qa-approved-date: ""
 *
 * @approval-rules:
 *   - require-dev-approval-for: ["breaking-changes", "security-related", "protocol-changes"]
 *   - require-code-review-for: ["all-changes"]
 *   - require-qa-approval-for: ["production-ready"]
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { MemoryManager } from './memory-manager.js';
import { ChangelogManager } from './changelog-manager.js';
import { MetadataParser } from './metadata-parser.js';
import { RuleEngine } from './rule-engine.js';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as path from 'path';

class MCPMemoryServer {
  private server: Server;
  private memoryManager: MemoryManager;
  private changelogManager: ChangelogManager;
  private metadataParser: MetadataParser;
  private ruleEngine: RuleEngine;
  private projectRoot: string;

  constructor() {
    this.projectRoot = this.detectProjectRoot();
    this.server = new Server({
      name: 'mcp-memory-server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
        logging: {}
      }
    });

    this.memoryManager = new MemoryManager(this.projectRoot);
    this.changelogManager = new ChangelogManager(this.projectRoot);
    this.metadataParser = new MetadataParser(this.projectRoot);
    this.ruleEngine = new RuleEngine();

    this.setupHandlers();
    this.initializeProject();
  }

  /**
   * Detects the project root by looking for common project indicators
   * Traverses up the directory tree from the current working directory
   */
  private detectProjectRoot(): string {
    const projectIndicators = [
      'package.json',
      '.git',
      'pyproject.toml',
      'Cargo.toml',
      'go.mod',
      'pom.xml',
      'build.gradle',
      'composer.json',
      '.project',
      'Makefile',
      'CMakeLists.txt'
    ];

    let currentDir = process.cwd();
    const rootDir = path.parse(currentDir).root;

    while (currentDir !== rootDir) {
      // Check if any project indicators exist in current directory
      for (const indicator of projectIndicators) {
        const indicatorPath = path.join(currentDir, indicator);
        if (fs.existsSync(indicatorPath)) {
          console.log(chalk.green(`🎯 Detected project root: ${currentDir}`));
          console.log(chalk.blue(`📁 Found indicator: ${indicator}`));
          return currentDir;
        }
      }
      
      // Move up one directory
      currentDir = path.dirname(currentDir);
    }

    // If no project indicators found, use current working directory
    const fallbackDir = process.cwd();
    console.log(chalk.yellow(`⚠️  No project indicators found, using current directory: ${fallbackDir}`));
    return fallbackDir;
  }

  /**
   * Initializes the project by ensuring .ai-memory folder exists
   */
  private async initializeProject(): Promise<void> {
    try {
      const memoryDir = path.join(this.projectRoot, '.ai-memory');
      
      if (!await fs.pathExists(memoryDir)) {
        await fs.ensureDir(memoryDir);
        console.log(chalk.green(`✨ Initialized .ai-memory folder at: ${memoryDir}`));
        
        // Create initial project memory if it doesn't exist
        const projectMemoryPath = path.join(memoryDir, 'project-memory.json');
        if (!await fs.pathExists(projectMemoryPath)) {
          const initialMemory = {
            projectContext: {
              name: path.basename(this.projectRoot),
              architecture: 'unknown',
              techStack: [],
              codingStandards: './docs/coding-standards.md',
              mainBranch: 'main'
            },
            currentSession: {
              sessionId: this.generateSessionId(),
              task: 'Project initialized',
              started: new Date().toISOString(),
              completedSteps: [],
              nextSteps: [],
              importantDecisions: {},
              blockers: []
            },
            fileHistory: {},
            globalDecisions: [],
            approvalStates: {}
          };
          
          await fs.writeJson(projectMemoryPath, initialMemory, { spaces: 2 });
          console.log(chalk.green(`📝 Created initial project memory`));
        }
      } else {
        console.log(chalk.blue(`📁 Using existing .ai-memory folder at: ${memoryDir}`));
      }
      
      console.log(chalk.green(`🚀 MCP Memory Server ready for project: ${path.basename(this.projectRoot)}`));
    } catch (error) {
      console.error(chalk.red('❌ Error initializing project:'), error);
    }
  }

  /**
   * Generates a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Memory Management Tools
        {
          name: 'start_session',
          description: 'Start a new AI coding session with a specific task',
          inputSchema: {
            type: 'object',
            properties: {
              task: { type: 'string', description: 'Description of the task to work on' }
            },
            required: ['task']
          }
        },
        {
          name: 'add_session_step',
          description: 'Record completion of a step in the current session',
          inputSchema: {
            type: 'object',
            properties: {
              step: { type: 'string', description: 'Description of the completed step' },
              filesModified: { type: 'array', items: { type: 'string' }, description: 'List of files that were modified' },
              description: { type: 'string', description: 'Optional detailed description' }
            },
            required: ['step', 'filesModified']
          }
        },
        {
          name: 'add_decision',
          description: 'Record an important technical decision',
          inputSchema: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Decision key/name' },
              value: { type: 'string', description: 'Decision value' },
              reasoning: { type: 'string', description: 'Reasoning behind the decision' }
            },
            required: ['key', 'value', 'reasoning']
          }
        },
        {
          name: 'get_project_memory',
          description: 'Get current project memory and session state',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },

        // Approval Management Tools
        {
          name: 'set_file_approval',
          description: 'Set approval status for a file',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'Path to the file' },
              approvalType: { type: 'string', enum: ['devApproved', 'codeReviewApproved', 'qaApproved'] },
              approvedBy: { type: 'string', description: 'Who approved it' }
            },
            required: ['filePath', 'approvalType', 'approvedBy']
          }
        },
        {
          name: 'get_file_approval_status',
          description: 'Get approval status for a file',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'Path to the file' }
            },
            required: ['filePath']
          }
        },

        // Rule Engine Tools
        {
          name: 'check_before_modification',
          description: 'Check if a file can be modified according to AI metadata rules',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'Path to the file to check' }
            },
            required: ['filePath']
          }
        },
        {
          name: 'get_modification_actions',
          description: 'Get actions that should be taken after modifying a file',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'Path to the file' }
            },
            required: ['filePath']
          }
        },

        // Metadata Tools
        {
          name: 'parse_file_metadata',
          description: 'Parse AI metadata from a file',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'Path to the file' }
            },
            required: ['filePath']
          }
        },
        {
          name: 'update_file_metadata',
          description: 'Update AI metadata in a file',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'Path to the file' },
              updates: { type: 'object', description: 'Metadata updates to apply' }
            },
            required: ['filePath', 'updates']
          }
        },
        {
          name: 'find_files_with_metadata',
          description: 'Find all files that contain AI metadata',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: { type: 'string', description: 'File pattern to search (optional)' }
            }
          }
        },

        // Changelog Tools
        {
          name: 'add_changelog_entry',
          description: 'Add an entry to the project changelog',
          inputSchema: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'Description of the change' },
              filesChanged: { type: 'array', items: { type: 'string' }, description: 'Files that were changed' },
              type: { type: 'string', enum: ['added', 'changed', 'deprecated', 'removed', 'fixed', 'security'] },
              breakingChange: { type: 'boolean', description: 'Whether this is a breaking change' },
              impact: { type: 'string', enum: ['major', 'minor', 'patch'] }
            },
            required: ['description', 'filesChanged', 'type']
          }
        },
        {
          name: 'get_file_changelog',
          description: 'Get changelog entries for a specific file',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'Path to the file' }
            },
            required: ['filePath']
          }
        },
        {
          name: 'get_recent_changes',
          description: 'Get recent changelog entries',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'number', description: 'Number of days to look back (default: 7)' }
            }
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
      }

      try {
        switch (name) {
          // Memory Management
          case 'start_session': {
            const task = args.task as string;
            const sessionId = await this.memoryManager.startNewSession(task);
            return { content: [{ type: 'text', text: `Started session: ${sessionId}` }] };
          }

          case 'add_session_step': {
            const step = args.step as string;
            const filesModified = args.filesModified as string[];
            const description = args.description as string | undefined;
            await this.memoryManager.addSessionStep(step, filesModified, description);
            return { content: [{ type: 'text', text: 'Session step added successfully' }] };
          }

          case 'add_decision': {
            const key = args.key as string;
            const value = args.value as any;
            const reasoning = args.reasoning as string;
            await this.memoryManager.addImportantDecision(key, value, reasoning);
            return { content: [{ type: 'text', text: 'Decision recorded successfully' }] };
          }

          case 'get_project_memory': {
            const projectMemory = await this.memoryManager.getProjectMemory();
            return { content: [{ type: 'text', text: JSON.stringify(projectMemory, null, 2) }] };
          }

          // Approval Management
          case 'set_file_approval': {
            const filePath = args.filePath as string;
            const approvalType = args.approvalType as keyof import('./types').ApprovalStatus;
            const approvedBy = args.approvedBy as string;
            await this.memoryManager.setFileApproval(filePath, approvalType, approvedBy);
            return { content: [{ type: 'text', text: 'File approval set successfully' }] };
          }

          case 'get_file_approval_status': {
            const filePath = args.filePath as string;
            const approval = await this.memoryManager.getFileApprovalStatus(filePath);
            return { content: [{ type: 'text', text: JSON.stringify(approval, null, 2) }] };
          }

          // Rule Engine
          case 'check_before_modification': {
            const filePath = args.filePath as string;
            const metadata = await this.metadataParser.parseFileMetadata(filePath);
            const approvals = await this.memoryManager.getFileApprovalStatus(filePath);
            const checkResult = await this.ruleEngine.checkBeforeModification(filePath, metadata, approvals);
            return { content: [{ type: 'text', text: JSON.stringify(checkResult, null, 2) }] };
          }

          case 'get_modification_actions': {
            const filePath = args.filePath as string;
            const fileMetadata = await this.metadataParser.parseFileMetadata(filePath);
            const actions = this.ruleEngine.getActionsAfterModification(filePath, fileMetadata);
            return { content: [{ type: 'text', text: JSON.stringify(actions, null, 2) }] };
          }

          // Metadata Tools
          case 'parse_file_metadata': {
            const filePath = args.filePath as string;
            const parsedMetadata = await this.metadataParser.parseFileMetadata(filePath);
            return { content: [{ type: 'text', text: JSON.stringify(parsedMetadata, null, 2) }] };
          }

          case 'update_file_metadata': {
            const filePath = args.filePath as string;
            const updates = args.updates as any;
            await this.metadataParser.updateFileMetadata(filePath, updates);
            return { content: [{ type: 'text', text: 'File metadata updated successfully' }] };
          }

          case 'find_files_with_metadata': {
            const pattern = args.pattern as string | undefined;
            const files = await this.metadataParser.findFilesWithMetadata(pattern);
            return { content: [{ type: 'text', text: JSON.stringify(files, null, 2) }] };
          }

          // Changelog Tools
          case 'add_changelog_entry': {
            const currentMemory = await this.memoryManager.getProjectMemory();
            const description = args.description as string;
            const filesChanged = args.filesChanged as string[];
            const type = args.type as 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
            const breakingChange = (args.breakingChange as boolean) || false;
            const impact = (args.impact as 'major' | 'minor' | 'patch') || 'minor';

            await this.changelogManager.addChangelogEntry({
              sessionId: currentMemory.currentSession.sessionId,
              task: currentMemory.currentSession.task,
              type,
              description,
              filesChanged,
              breakingChange,
              approvals: {},
              impact
            });
            return { content: [{ type: 'text', text: 'Changelog entry added successfully' }] };
          }

          case 'get_file_changelog': {
            const filePath = args.filePath as string;
            const fileChangelog = await this.changelogManager.getChangelogForFile(filePath);
            return { content: [{ type: 'text', text: JSON.stringify(fileChangelog, null, 2) }] };
          }

          case 'get_recent_changes': {
            const days = (args.days as number) || 7;
            const recentChanges = await this.changelogManager.getRecentChanges(days);
            return { content: [{ type: 'text', text: JSON.stringify(recentChanges, null, 2) }] };
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(chalk.red(`Error in tool ${name}:`), error);
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error}`);
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log(chalk.green('🚀 MCP Memory Server is running!'));
    console.log(chalk.blue(`📁 Project root: ${this.projectRoot}`));
  }
}

// Start the server
// Check if this file is being run directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('index.js');
if (isMainModule) {
  const server = new MCPMemoryServer();
  server.run().catch((error) => {
    console.error(chalk.red('Failed to start server:'), error);
    process.exit(1);
  });
}

export { MCPMemoryServer };
