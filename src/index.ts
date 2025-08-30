/**
 * @ai-metadata
 * @class: MCPMemoryServer
 * @description: Main MCP server implementation that provides AI coding assistants with memory management, file approval tracking, and changelog functionality
 * @last-update: 2025-08-24T09:47:46.381Z
 * @last-editor: Mohammad Mehdi Shaban Keleshteri
 * @changelog: ./CHANGELOG.md
 * @stability: stable
 * @edit-permissions: method-specific
 * @method-permissions: { "constructor": "read-only", "detectProjectRoot": "read-only", "initializeProject": "add-only", "setupHandlers": "read-only", "run": "read-only" }
 * @dependencies: ["@modelcontextprotocol/sdk", "./memory-manager.js", "./changelog-manager.js", "./metadata-parser.js", "./rule-engine.js", "chalk", "fs-extra", "path"]
 * @tests: ["./tests/index.test.js"]
 * @breaking-changes-risk: low
 * @review-required: false
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
import { FolderMapper } from './folder-mapper.js';
import { GitUtils } from './git-utils.js';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as path from 'path';

class MCPMemoryServer {
  private server: Server;
  private memoryManager: MemoryManager;
  private changelogManager: ChangelogManager;
  private metadataParser: MetadataParser;
  private ruleEngine: RuleEngine;
  private folderMapper: FolderMapper;
  private gitUtils: GitUtils;
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
    this.folderMapper = new FolderMapper(this.projectRoot);
    this.gitUtils = new GitUtils(this.projectRoot);

    this.setupHandlers();
    this.initializeProject();
  }

  /**
   * Detects the project root by looking for common project indicators
   * Traverses up the directory tree from the current working directory
   * Enhanced with validation and error handling
   */
  private detectProjectRoot(): string {
    // Check if target project path is provided via environment variable
    const targetProjectPath = process.env.TARGET_PROJECT_PATH;
    if (targetProjectPath) {
      console.log(chalk.blue(`🎯 Using target project path from environment: ${targetProjectPath}`));
      return this.validateProjectRoot(targetProjectPath);
    }

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
      'CMakeLists.txt',
      'tsconfig.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'requirements.txt',
      'Pipfile',
      '.gitignore'
    ];

    let currentDir = process.cwd();
    const rootDir = path.parse(currentDir).root;
    const startDir = currentDir;
    const visitedDirs: string[] = [];

    console.log(chalk.blue(`🔍 Starting project root detection from: ${startDir}`));

    // Validate starting directory
    try {
      if (!fs.existsSync(currentDir)) {
        throw new Error(`Starting directory does not exist: ${currentDir}`);
      }
      
      const stats = fs.statSync(currentDir);
      if (!stats.isDirectory()) {
        throw new Error(`Starting path is not a directory: ${currentDir}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`❌ Invalid starting directory: ${errorMessage}`));
      throw new Error(`Project root detection failed: ${errorMessage}`);
    }

    while (currentDir !== rootDir) {
      visitedDirs.push(currentDir);
      
      try {
        // Check if directory is accessible
        fs.accessSync(currentDir, fs.constants.R_OK);
        
        // Check if any project indicators exist in current directory
        for (const indicator of projectIndicators) {
          const indicatorPath = path.join(currentDir, indicator);
          
          try {
            if (fs.existsSync(indicatorPath)) {
              // Additional validation for specific indicators
              if (indicator === 'package.json') {
                try {
                  const packageJson = fs.readJsonSync(indicatorPath);
                  if (!packageJson.name) {
                    console.log(chalk.yellow(`⚠️  Found package.json without name at: ${currentDir}`));
                  } else {
                    console.log(chalk.green(`🎯 Detected project root: ${currentDir}`));
                    console.log(chalk.blue(`📁 Found indicator: ${indicator} (${packageJson.name})`));
                    console.log(chalk.gray(`   Searched ${visitedDirs.length} directories`));
                    return this.validateProjectRoot(currentDir);
                  }
                } catch (jsonError) {
                  console.log(chalk.yellow(`⚠️  Found invalid package.json at: ${currentDir}`));
                }
              } else if (indicator === '.git') {
                const gitConfigPath = path.join(indicatorPath, 'config');
                if (fs.existsSync(gitConfigPath)) {
                  console.log(chalk.green(`🎯 Detected project root: ${currentDir}`));
                  console.log(chalk.blue(`📁 Found indicator: ${indicator} (git repository)`));
                  console.log(chalk.gray(`   Searched ${visitedDirs.length} directories`));
                  return this.validateProjectRoot(currentDir);
                }
              } else {
                console.log(chalk.green(`🎯 Detected project root: ${currentDir}`));
                console.log(chalk.blue(`📁 Found indicator: ${indicator}`));
                console.log(chalk.gray(`   Searched ${visitedDirs.length} directories`));
                return this.validateProjectRoot(currentDir);
              }
            }
          } catch (indicatorError) {
            const indicatorErrorMessage = indicatorError instanceof Error ? indicatorError.message : String(indicatorError);
            console.log(chalk.gray(`   Skipping ${indicator}: ${indicatorErrorMessage}`));
          }
        }
      } catch (accessError) {
        const accessErrorMessage = accessError instanceof Error ? accessError.message : String(accessError);
        console.log(chalk.yellow(`⚠️  Cannot access directory: ${currentDir} (${accessErrorMessage})`));
      }
      
      // Move up one directory
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        // Reached filesystem root
        break;
      }
      currentDir = parentDir;
      
      // Prevent infinite loops
      if (visitedDirs.length > 20) {
        console.log(chalk.yellow(`⚠️  Stopped after searching 20 directories`));
        break;
      }
    }

    // If no project indicators found, use current working directory with validation
    const fallbackDir = process.cwd();
    console.log(chalk.yellow(`⚠️  No project indicators found after searching ${visitedDirs.length} directories`));
    console.log(chalk.yellow(`   Using current directory as fallback: ${fallbackDir}`));
    console.log(chalk.gray(`   Searched path: ${startDir} → ${currentDir}`));
    
    return this.validateProjectRoot(fallbackDir);
  }

  /**
   * Validates the detected project root and ensures it's usable
   */
  private validateProjectRoot(projectRoot: string): string {
    try {
      // Ensure the directory exists and is accessible
      const stats = fs.statSync(projectRoot);
      if (!stats.isDirectory()) {
        throw new Error(`Project root is not a directory: ${projectRoot}`);
      }

      // Check write permissions
      fs.accessSync(projectRoot, fs.constants.W_OK);
      
      // Resolve to absolute path
      const absolutePath = path.resolve(projectRoot);
      
      console.log(chalk.green(`✅ Project root validated: ${absolutePath}`));
      return absolutePath;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`❌ Project root validation failed: ${errorMessage}`));
      
      // Try to use a safe fallback
      const safeFallback = process.cwd();
      console.log(chalk.yellow(`🔄 Attempting safe fallback: ${safeFallback}`));
      
      try {
        fs.accessSync(safeFallback, fs.constants.W_OK);
        console.log(chalk.green(`✅ Safe fallback validated: ${safeFallback}`));
        return path.resolve(safeFallback);
      } catch (fallbackError) {
        const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        throw new Error(`Cannot establish valid project root. Original: ${errorMessage}, Fallback: ${fallbackErrorMessage}`);
      }
    }
  }

  /**
   * Initializes the project by ensuring .ai-memory folder exists
   * Enhanced with validation, error handling, and recovery mechanisms
   */
  private async initializeProject(): Promise<void> {
    const memoryDir = path.join(this.projectRoot, '.ai-memory');
    const projectMemoryPath = path.join(memoryDir, 'project-memory.json');
    
    console.log(chalk.blue(`🔧 Initializing project at: ${this.projectRoot}`));
    
    try {
      // Validate project root accessibility
      await fs.access(this.projectRoot, fs.constants.R_OK | fs.constants.W_OK);
      
      // Check if memory directory exists and is accessible
      if (await fs.pathExists(memoryDir)) {
        try {
          await fs.access(memoryDir, fs.constants.R_OK | fs.constants.W_OK);
          console.log(chalk.green(`✅ Memory directory exists: ${memoryDir}`));
        } catch (accessError) {
          const accessErrorMessage = accessError instanceof Error ? accessError.message : String(accessError);
          console.error(chalk.red(`❌ Cannot access memory directory: ${accessErrorMessage}`));
          throw new Error(`Memory directory access denied: ${memoryDir}`);
        }
      } else {
        // Create memory directory with proper error handling
        try {
          await fs.ensureDir(memoryDir);
          console.log(chalk.green(`✨ Created .ai-memory folder at: ${memoryDir}`));
          
          // Verify the directory was created successfully
          if (!await fs.pathExists(memoryDir)) {
            throw new Error('Directory creation appeared to succeed but directory does not exist');
          }
        } catch (createError) {
          const createErrorMessage = createError instanceof Error ? createError.message : String(createError);
          console.error(chalk.red(`❌ Failed to create memory directory: ${createErrorMessage}`));
          throw new Error(`Cannot create memory directory: ${createErrorMessage}`);
        }
      }
      
      // Handle project memory file
      if (await fs.pathExists(projectMemoryPath)) {
        try {
          // Validate existing project memory
          const existingMemory = await fs.readJson(projectMemoryPath);
          
          // Check if the memory file has required structure
          if (!existingMemory.projectContext || !existingMemory.currentSession) {
            console.log(chalk.yellow(`⚠️  Project memory file is incomplete, backing up and recreating`));
            
            // Backup the existing file
            const backupPath = path.join(memoryDir, `project-memory.backup.${Date.now()}.json`);
            await fs.copy(projectMemoryPath, backupPath);
            console.log(chalk.blue(`📋 Backed up existing memory to: ${backupPath}`));
            
            // Create new memory with any salvageable data
            const newMemory = await this.createInitialMemory(existingMemory);
            await this.writeProjectMemory(projectMemoryPath, newMemory);
          } else {
            console.log(chalk.green(`✅ Project memory file validated: ${projectMemoryPath}`));
            
            // Update project context if needed
            const currentProjectName = path.basename(this.projectRoot);
            if (existingMemory.projectContext.name !== currentProjectName) {
              console.log(chalk.blue(`🔄 Updating project name: ${existingMemory.projectContext.name} → ${currentProjectName}`));
              existingMemory.projectContext.name = currentProjectName;
              existingMemory.projectContext.lastUpdated = new Date().toISOString();
              await this.writeProjectMemory(projectMemoryPath, existingMemory);
            }
          }
        } catch (readError) {
          const readErrorMessage = readError instanceof Error ? readError.message : String(readError);
          console.error(chalk.red(`❌ Failed to read project memory: ${readErrorMessage}`));
          
          // Backup corrupted file and create new one
          const corruptedBackupPath = path.join(memoryDir, `project-memory.corrupted.${Date.now()}.json`);
          try {
            await fs.copy(projectMemoryPath, corruptedBackupPath);
            console.log(chalk.yellow(`📋 Backed up corrupted memory to: ${corruptedBackupPath}`));
          } catch (backupError) {
            const errorMessage = backupError instanceof Error ? backupError.message : String(backupError);
            console.log(chalk.yellow(`⚠️  Could not backup corrupted file: ${errorMessage}`));
          }
          
          // Create fresh memory
          const newMemory = await this.createInitialMemory();
          await this.writeProjectMemory(projectMemoryPath, newMemory);
        }
      } else {
        // Create initial project memory
        console.log(chalk.blue(`📝 Creating initial project memory...`));
        const initialMemory = await this.createInitialMemory();
        await this.writeProjectMemory(projectMemoryPath, initialMemory);
      }
      
      console.log(chalk.green(`🎉 Project initialization completed successfully`));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`❌ Project initialization failed: ${errorMessage}`));
      
      // Attempt recovery
      const errorObj = error instanceof Error ? error : new Error(String(error));
      await this.attemptProjectRecovery(memoryDir, projectMemoryPath, errorObj);
    }
  }
  
  /**
   * Creates initial memory structure with optional existing data
   */
  private async createInitialMemory(existingData?: any): Promise<any> {
    const projectName = path.basename(this.projectRoot);
    
    // Detect project type and tech stack
    const projectInfo = await this.detectProjectInfo();
    
    const initialMemory = {
      projectContext: {
        name: projectName,
        architecture: projectInfo.architecture,
        techStack: projectInfo.techStack,
        codingStandards: './docs/coding-standards.md',
        mainBranch: 'main',
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        ...existingData?.projectContext
      },
      currentSession: {
        sessionId: this.generateSessionId(),
        task: 'Project initialized',
        started: new Date().toISOString(),
        completedSteps: [],
        nextSteps: [],
        importantDecisions: {},
        blockers: [],
        ...existingData?.currentSession
      },
      fileHistory: existingData?.fileHistory || {},
      globalDecisions: existingData?.globalDecisions || [],
      approvalStates: existingData?.approvalStates || {},
      sessions: existingData?.sessions || []
    };
    
    return initialMemory;
  }
  
  /**
   * Detects project information from available files
   */
  private async detectProjectInfo(): Promise<{ architecture: string; techStack: string[] }> {
    const techStack: string[] = [];
    let architecture = 'unknown';
    
    try {
      // Check for package.json (Node.js/JavaScript/TypeScript)
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        techStack.push('Node.js');
        
        if (packageJson.dependencies || packageJson.devDependencies) {
          const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          
          if (allDeps.typescript || allDeps['@types/node']) techStack.push('TypeScript');
          if (allDeps.react) techStack.push('React');
          if (allDeps.vue) techStack.push('Vue.js');
          if (allDeps.angular) techStack.push('Angular');
          if (allDeps.express) techStack.push('Express.js');
          if (allDeps.next) techStack.push('Next.js');
          if (allDeps.nuxt) techStack.push('Nuxt.js');
        }
        
        architecture = 'web-application';
      }
      
      // Check for Python files
      if (await fs.pathExists(path.join(this.projectRoot, 'requirements.txt')) ||
          await fs.pathExists(path.join(this.projectRoot, 'pyproject.toml')) ||
          await fs.pathExists(path.join(this.projectRoot, 'Pipfile'))) {
        techStack.push('Python');
        architecture = 'python-application';
      }
      
      // Check for other languages
      if (await fs.pathExists(path.join(this.projectRoot, 'Cargo.toml'))) {
        techStack.push('Rust');
        architecture = 'rust-application';
      }
      
      if (await fs.pathExists(path.join(this.projectRoot, 'go.mod'))) {
        techStack.push('Go');
        architecture = 'go-application';
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(chalk.gray(`   Could not detect project info: ${errorMessage}`));
    }
    
    return { architecture, techStack };
  }
  
  /**
   * Safely writes project memory with validation
   */
  private async writeProjectMemory(filePath: string, memory: any): Promise<void> {
    try {
      // Validate memory structure
      if (!memory.projectContext || !memory.currentSession) {
        throw new Error('Invalid memory structure: missing required sections');
      }
      
      // Write to temporary file first
      const tempPath = filePath + '.tmp';
      await fs.writeJson(tempPath, memory, { spaces: 2 });
      
      // Verify the written file
      const written = await fs.readJson(tempPath);
      if (!written.projectContext) {
        throw new Error('Written file validation failed');
      }
      
      // Move temp file to final location
      await fs.move(tempPath, filePath, { overwrite: true });
      console.log(chalk.green(`📝 Project memory saved successfully`));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`❌ Failed to write project memory: ${errorMessage}`));
      
      // Clean up temp file if it exists
      const tempPath = filePath + '.tmp';
      if (await fs.pathExists(tempPath)) {
        await fs.remove(tempPath);
      }
      
      throw error;
    }
  }
  
  /**
   * Attempts to recover from project initialization failures
   */
  private async attemptProjectRecovery(memoryDir: string, projectMemoryPath: string, originalError: Error): Promise<void> {
    console.log(chalk.yellow(`🔄 Attempting project recovery...`));
    
    try {
      // Try to create a minimal working setup
      const minimalMemory = {
        projectContext: {
          name: path.basename(this.projectRoot),
          architecture: 'unknown',
          techStack: [],
          created: new Date().toISOString()
        },
        currentSession: {
          sessionId: this.generateSessionId(),
          task: 'Recovery initialization',
          started: new Date().toISOString(),
          completedSteps: [],
          nextSteps: [],
          importantDecisions: {},
          blockers: []
        },
        fileHistory: {},
        globalDecisions: [],
        approvalStates: {},
        sessions: []
      };
      
      // Ensure directory exists
      await fs.ensureDir(memoryDir);
      
      // Write minimal memory
      await fs.writeJson(projectMemoryPath, minimalMemory, { spaces: 2 });
      
      console.log(chalk.green(`✅ Recovery successful: minimal project setup created`));
      console.log(chalk.yellow(`⚠️  Original error: ${originalError.message}`));
      
    } catch (recoveryError) {
      const recoveryErrorMessage = recoveryError instanceof Error ? recoveryError.message : String(recoveryError);
      console.error(chalk.red(`❌ Recovery failed: ${recoveryErrorMessage}`));
      throw new Error(`Project initialization failed and recovery unsuccessful. Original: ${originalError.message}, Recovery: ${recoveryErrorMessage}`);
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
        },
        
        // Folder Mapping Tools  
        {
          name: 'generate_folder_map',
          description: 'Generate or update a _map.md file for a specific folder',
          inputSchema: {
            type: 'object',
            properties: {
              folderPath: { type: 'string', description: 'Path to the folder to generate map for' }
            },
            required: ['folderPath']
          }
        },
        {
          name: 'generate_all_folder_maps', 
          description: 'Generate _map.md files for all folders in the project',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },

        // Git Tools
        {
          name: 'update_last_editor',
          description: 'Update @last-editor field in a file with Git author information',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'Path to the file to update' }
            },
            required: ['filePath']
          }
        },
        {
          name: 'update_all_last_editors',
          description: 'Update @last-editor fields in all files with Git author information',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'get_file_last_editor',
          description: 'Get the last editor of a file from Git history',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'Path to the file' }
            },
            required: ['filePath']
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

          // Folder Mapping Tools
          case 'generate_folder_map': {
            const folderPath = args.folderPath as string;
            const folderMap = await this.folderMapper.generateFolderMap(folderPath);
            return { content: [{ type: 'text', text: `Folder map generated successfully for: ${folderPath}` }] };
          }

          case 'generate_all_folder_maps': {
            await this.folderMapper.generateAllFolderMaps();
            return { content: [{ type: 'text', text: 'All folder maps generated successfully' }] };
          }

          // Git Tools
          case 'update_last_editor': {
            const filePath = args.filePath as string;
            const result = await this.gitUtils.updateLastEditorInFile(filePath);
            if (result.success) {
              return { content: [{ type: 'text', text: `Last editor updated successfully for: ${filePath}. New editor: ${result.newEditor}` }] };
            } else {
              return { content: [{ type: 'text', text: `Failed to update last editor for: ${filePath}. Reason: ${result.reason}` }] };
            }
          }

          case 'update_all_last_editors': {
            const results = await this.gitUtils.updateAllLastEditors();
            const summary = {
              updated: results.filter(r => r.success).length,
              skipped: results.filter(r => !r.success).length,
              details: results
            };
            return { content: [{ type: 'text', text: `Updated ${summary.updated} files, skipped ${summary.skipped} files. Details: ${JSON.stringify(summary.details, null, 2)}` }] };
          }

          case 'get_file_last_editor': {
            const filePath = args.filePath as string;
            const lastEditor = await this.gitUtils.getFileLastEditor(filePath);
            if (lastEditor) {
              return { content: [{ type: 'text', text: `Last editor of ${filePath}: ${lastEditor}` }] };
            } else {
              return { content: [{ type: 'text', text: `Could not determine last editor for: ${filePath}` }] };
            }
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
