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
