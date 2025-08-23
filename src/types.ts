/**
 * @ai-metadata
 * @class: TypeDefinitions
 * @description: Core TypeScript interfaces and type definitions for AI metadata, project memory, approvals, and system components
 * @last-update: 2024-12-20
 * @last-editor: ai-assistant
 * @changelog: ./CHANGELOG.md
 * @stability: stable
 * @edit-permissions: add-only
 * @method-permissions: {}
 * @dependencies: []
 * @tests: ["./tests/types.test.js"]
 * @breaking-changes-risk: high
 * @review-required: true
 * @ai-context: "This file defines all core data structures and interfaces. Changes here affect the entire system architecture. Only add new interfaces, never modify existing ones without extreme caution."
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
 *   - require-dev-approval-for: ["breaking-changes", "interface-modifications", "type-changes"]
 *   - require-code-review-for: ["all-changes"]
 *   - require-qa-approval-for: ["production-ready"]
 */

export interface AIMetadata {
  class?: string;
  description?: string;
  lastUpdate?: string;
  lastEditor?: string;
  changelog?: string;
  stability?: 'stable' | 'experimental' | 'deprecated';
  editPermissions?: 'full' | 'add-only' | 'read-only' | 'method-specific';
  methodPermissions?: Record<string, 'read-only' | 'allow' | 'restricted'>;
  dependencies?: string[];
  tests?: string[];
  breakingChangesRisk?: 'high' | 'medium' | 'low';
  reviewRequired?: boolean;
  aiContext?: string;
  approvals?: ApprovalStatus;
  approvalRules?: ApprovalRules;
}

export interface ApprovalStatus {
  devApproved?: boolean;
  devApprovedBy?: string;
  devApprovedDate?: string;
  codeReviewApproved?: boolean;
  codeReviewApprovedBy?: string;
  codeReviewDate?: string;
  qaApproved?: boolean;
  qaApprovedBy?: string;
  qaApprovedDate?: string;
}

export interface ApprovalRules {
  requireDevApprovalFor?: string[];
  requireCodeReviewFor?: string[];
  requireQAApprovalFor?: string[];
}

export interface ProjectMemory {
  projectContext: {
    name: string;
    architecture: string;
    techStack: string[];
    codingStandards?: string;
    mainBranch?: string;
  };
  currentSession: {
    sessionId: string;
    task: string;
    started: string;
    completedSteps: SessionStep[];
    nextSteps: string[];
    importantDecisions: Record<string, any>;
    blockers?: string[];
  };
  fileHistory: Record<string, FileHistory>;
  globalDecisions: Decision[];
  approvalStates: Record<string, ApprovalStatus>;
}

export interface SessionStep {
  step: string;
  completed: string;
  filesModified: string[];
  description?: string;
  timeSpent?: number;
}

export interface FileHistory {
  lastAIModification: string;
  modificationCount: number;
  approvalStatus: string;
  riskLevel: 'low' | 'medium' | 'high';
  lastBackup?: string;
}

export interface Decision {
  id: string;
  decision: string;
  reasoning: string;
  impact: string[];
  timestamp: string;
  approvedBy: string;
  relatedFiles: string[];
}

export interface ChangelogEntry {
  version?: string;
  date: string;
  sessionId: string;
  task: string;
  type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
  description: string;
  filesChanged: string[];
  breakingChange: boolean;
  approvals: ApprovalStatus;
  impact: 'major' | 'minor' | 'patch';
}

export interface AIRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  priority: number;
  enabled: boolean;
}

export interface RuleEngine {
  beforeModificationRules: AIRule[];
  afterModificationRules: AIRule[];
  approvalWorkflowRules: AIRule[];
  changelogRules: AIRule[];
}

// Folder Mapping Types
export interface FolderMapEntry {
  folderPath: string;
  folderName: string;
  purpose: string;
  files: FileMapInfo[];
  dependencies: string[];
  tests: string[];
  lastGenerated: string;
  totalClasses: number;
  totalInterfaces: number;
  totalFunctions: number;
}

export interface FileMapInfo {
  fileName: string;
  filePath: string;
  exports: ExportMapInfo[];
  imports: ImportMapInfo[];
  purpose: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ExportMapInfo {
  name: string;
  type: 'class' | 'interface' | 'function' | 'type' | 'const' | 'enum';
  methods?: MethodMapInfo[];
  properties?: PropertyMapInfo[];
  description?: string;
  useCases?: string[];
}

export interface MethodMapInfo {
  name: string;
  parameters: string[];
  returnType?: string;
  description?: string;
  useCases?: string[];
  isStatic?: boolean;
  isPrivate?: boolean;
}

export interface PropertyMapInfo {
  name: string;
  type?: string;
  description?: string;
  isOptional?: boolean;
}

export interface ImportMapInfo {
  source: string;
  imported: string[];
}

export interface FolderMapConfig {
  excludePatterns: string[];
  fileExtensions: string[];
  autoUpdate: boolean;
  generateOnBuild: boolean;
  includePrivateMethods: boolean;
  includeUseCases: boolean;
}
