/**
 * @ai-metadata
 * @class: MemoryManager
 * @description: Core memory and session management system for AI coding assistants, handling project memory, file approvals, and session tracking
 * @last-update: 2024-12-20
 * @last-editor: ai-assistant
 * @changelog: ./CHANGELOG.md
 * @stability: stable
 * @edit-permissions: method-specific
 * @method-permissions: { "constructor": "read-only", "getProjectMemory": "read-only", "saveProjectMemory": "allow", "startNewSession": "allow", "addSessionStep": "allow", "addImportantDecision": "allow", "setFileApproval": "allow", "getFileApprovalStatus": "read-only", "invalidateFileApprovals": "allow" }
 * @dependencies: ["fs-extra", "path", "glob", "chalk", "./types.js"]
 * @tests: ["./tests/memory-manager.test.js"]
 * @breaking-changes-risk: high
 * @review-required: true
 * @ai-context: "This is the core memory management system. Changes here affect all project memory, session tracking, and file approval workflows. Critical for AI assistant safety."
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
 *   - require-dev-approval-for: ["breaking-changes", "security-related", "approval-workflow"]
 *   - require-code-review-for: ["all-changes"]
 *   - require-qa-approval-for: ["production-ready"]
 */

import fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import {
  AIMetadata,
  ProjectMemory,
  ChangelogEntry,
  Decision,
  ApprovalStatus,
  FileHistory,
  SessionStep
} from './types.js';

export class MemoryManager {
  private projectRoot: string;
  private memoryDir: string;
  private projectMemoryPath: string;
  private changelogPath: string;
  private approvalsPath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.memoryDir = path.join(projectRoot, '.ai-memory');
    this.projectMemoryPath = path.join(this.memoryDir, 'project-memory.json');
    this.changelogPath = path.join(this.memoryDir, 'ai-changelog.json');
    this.approvalsPath = path.join(this.memoryDir, 'approval-states.json');
    
    this.ensureMemoryDir();
  }

  private async ensureMemoryDir(): Promise<void> {
    await fs.ensureDir(this.memoryDir);
  }

  // Project Memory Management
  async getProjectMemory(): Promise<ProjectMemory> {
    try {
      if (await fs.pathExists(this.projectMemoryPath)) {
        return await fs.readJson(this.projectMemoryPath);
      }
      return this.createDefaultProjectMemory();
    } catch (error) {
      console.error(chalk.red('Error reading project memory:'), error);
      return this.createDefaultProjectMemory();
    }
  }

  private createDefaultProjectMemory(): ProjectMemory {
    return {
      projectContext: {
        name: path.basename(this.projectRoot),
        architecture: 'unknown',
        techStack: [],
        codingStandards: './docs/coding-standards.md',
        mainBranch: 'main'
      },
      currentSession: {
        sessionId: this.generateSessionId(),
        task: 'No active task',
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
  }

  async saveProjectMemory(memory: ProjectMemory): Promise<void> {
    try {
      await fs.writeJson(this.projectMemoryPath, memory, { spaces: 2 });
      console.log(chalk.green('✓ Project memory saved'));
    } catch (error) {
      console.error(chalk.red('Error saving project memory:'), error);
    }
  }

  // Session Management
  async startNewSession(task: string): Promise<string> {
    const memory = await this.getProjectMemory();
    const sessionId = this.generateSessionId();
    
    memory.currentSession = {
      sessionId,
      task,
      started: new Date().toISOString(),
      completedSteps: [],
      nextSteps: [],
      importantDecisions: {},
      blockers: []
    };

    await this.saveProjectMemory(memory);
    console.log(chalk.blue(`🚀 Started new session: ${sessionId}`));
    console.log(chalk.blue(`📋 Task: ${task}`));
    return sessionId;
  }

  async addSessionStep(step: string, filesModified: string[], description?: string): Promise<void> {
    const memory = await this.getProjectMemory();
    
    const sessionStep: SessionStep = {
      step,
      completed: new Date().toISOString(),
      filesModified,
      description,
      timeSpent: 0 // Could be calculated if needed
    };

    memory.currentSession.completedSteps.push(sessionStep);
    await this.saveProjectMemory(memory);
    
    console.log(chalk.green(`✅ Step completed: ${step}`));
  }

  async addImportantDecision(key: string, value: any, reasoning: string): Promise<void> {
    const memory = await this.getProjectMemory();
    
    memory.currentSession.importantDecisions[key] = value;
    
    const decision: Decision = {
      id: this.generateId(),
      decision: `${key}: ${JSON.stringify(value)}`,
      reasoning,
      impact: [],
      timestamp: new Date().toISOString(),
      approvedBy: 'system',
      relatedFiles: []
    };

    memory.globalDecisions.push(decision);
    await this.saveProjectMemory(memory);
    
    console.log(chalk.yellow(`💡 Decision recorded: ${key} = ${value}`));
  }

  // File Approval Management
  async setFileApproval(filePath: string, approvalType: keyof ApprovalStatus, approvedBy: string): Promise<void> {
    const memory = await this.getProjectMemory();
    const relativePath = path.relative(this.projectRoot, filePath);
    
    if (!memory.approvalStates[relativePath]) {
      memory.approvalStates[relativePath] = {};
    }

    const approvals = memory.approvalStates[relativePath];
    
    // Set the approval status
    switch (approvalType) {
      case 'devApproved':
        approvals.devApproved = true;
        approvals.devApprovedBy = approvedBy;
        approvals.devApprovedDate = new Date().toISOString();
        break;
      case 'codeReviewApproved':
        approvals.codeReviewApproved = true;
        approvals.codeReviewApprovedBy = approvedBy;
        approvals.codeReviewDate = new Date().toISOString();
        break;
      case 'qaApproved':
        approvals.qaApproved = true;
        approvals.qaApprovedBy = approvedBy;
        approvals.qaApprovedDate = new Date().toISOString();
        break;
    }

    await this.saveProjectMemory(memory);
    
    console.log(chalk.green(`✅ ${approvalType} set for ${relativePath} by ${approvedBy}`));
  }

  async getFileApprovalStatus(filePath: string): Promise<ApprovalStatus | null> {
    const memory = await this.getProjectMemory();
    const relativePath = path.relative(this.projectRoot, filePath);
    return memory.approvalStates[relativePath] || null;
  }

  async invalidateFileApprovals(filePath: string, reason: string = 'file modified'): Promise<void> {
    const memory = await this.getProjectMemory();
    const relativePath = path.relative(this.projectRoot, filePath);
    
    if (memory.approvalStates[relativePath]) {
      memory.approvalStates[relativePath] = {
        devApproved: false,
        codeReviewApproved: false,
        qaApproved: false
      };
      
      await this.saveProjectMemory(memory);
      console.log(chalk.yellow(`⚠️  Approvals invalidated for ${relativePath}: ${reason}`));
    }
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
