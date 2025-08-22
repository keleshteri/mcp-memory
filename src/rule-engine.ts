import chalk from 'chalk';
import { AIMetadata, ApprovalStatus, AIRule } from './types.js';

export class RuleEngine {
  private rules: AIRule[];

  constructor() {
    this.rules = this.getDefaultRules();
  }

  async checkBeforeModification(filePath: string, metadata: AIMetadata | null, approvals: ApprovalStatus | null): Promise<{
    allowed: boolean;
    reasons: string[];
    warnings: string[];
  }> {
    const result = {
      allowed: true,
      reasons: [] as string[],
      warnings: [] as string[]
    };

    if (!metadata) {
      result.warnings.push('No @ai-metadata found in file');
      return result;
    }

    // Check edit permissions
    if (metadata.editPermissions === 'read-only') {
      result.allowed = false;
      result.reasons.push('File is marked as read-only');
    }

    // Check if file requires dev approval
    if (metadata.breakingChangesRisk === 'high' && (!approvals?.devApproved)) {
      result.allowed = false;
      result.reasons.push('High-risk file requires dev approval before modification');
    }

    // Check if review is required
    if (metadata.reviewRequired && (!approvals?.codeReviewApproved)) {
      result.allowed = false;
      result.reasons.push('File requires code review approval before modification');
    }

    // Check stability
    if (metadata.stability === 'deprecated') {
      result.warnings.push('This file is deprecated - consider if modification is necessary');
    }

    // Apply custom rules
    for (const rule of this.rules.filter(r => r.enabled)) {
      const ruleResult = this.evaluateRule(rule, metadata, approvals, filePath);
      if (!ruleResult.passed) {
        if (rule.priority > 8) {
          result.allowed = false;
          result.reasons.push(ruleResult.message);
        } else {
          result.warnings.push(ruleResult.message);
        }
      }
    }

    return result;
  }

  getActionsAfterModification(filePath: string, metadata: AIMetadata | null): string[] {
    const actions: string[] = [
      'invalidate_approvals',
      'update_last_modified',
      'add_to_changelog'
    ];

    if (metadata?.breakingChangesRisk === 'high') {
      actions.push('require_immediate_review');
    }

    if (metadata?.tests && metadata.tests.length > 0) {
      actions.push('run_tests');
    }

    return actions;
  }

  private evaluateRule(rule: AIRule, metadata: AIMetadata, approvals: ApprovalStatus | null, filePath: string): {
    passed: boolean;
    message: string;
  } {
    try {
      // Simple rule evaluation - in a real implementation, you might use a proper expression evaluator
      const context = {
        metadata,
        approvals: approvals || {},
        filePath,
        // Helper functions
        hasApproval: (type: string) => {
          if (!approvals) return false;
          return (approvals as any)[`${type}Approved`] === true;
        },
        isHighRisk: () => metadata.breakingChangesRisk === 'high',
        isReadOnly: () => metadata.editPermissions === 'read-only',
        isDeprecated: () => metadata.stability === 'deprecated'
      };

      // Basic rule evaluation (you could use a more sophisticated expression evaluator)
      const passed = this.evaluateCondition(rule.condition, context);
      
      return {
        passed,
        message: rule.action
      };
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not evaluate rule ${rule.id}: ${error}`));
      return { passed: true, message: '' };
    }
  }

  private evaluateCondition(condition: string, context: any): boolean {
    // Simple condition evaluator - replace with a proper one for production
    try {
      // Create a safe evaluation context
      const evalContext = {
        ...context,
        // Prevent access to dangerous functions
        eval: undefined,
        Function: undefined,
        require: undefined,
        process: undefined,
        global: undefined,
        window: undefined
      };

      // Use Function constructor for safe evaluation (still be careful in production)
      const func = new Function(...Object.keys(evalContext), `return ${condition}`);
      return func(...Object.values(evalContext));
    } catch (error) {
      console.warn(chalk.yellow(`Could not evaluate condition: ${condition}`));
      return true; // Default to allowing if we can't evaluate
    }
  }

  private getDefaultRules(): AIRule[] {
    return [
      {
        id: 'no-modify-read-only',
        name: 'Prevent Read-Only Modifications',
        condition: 'isReadOnly()',
        action: 'File is marked as read-only and cannot be modified',
        priority: 10,
        enabled: true
      },
      {
        id: 'high-risk-needs-approval',
        name: 'High Risk Needs Approval',
        condition: 'isHighRisk() && !hasApproval("dev")',
        action: 'High-risk file requires developer approval',
        priority: 9,
        enabled: true
      },
      {
        id: 'deprecated-warning',
        name: 'Deprecated File Warning',
        condition: 'isDeprecated()',
        action: 'Consider if modifying deprecated file is necessary',
        priority: 5,
        enabled: true
      },
      {
        id: 'review-required',
        name: 'Review Required',
        condition: 'metadata.reviewRequired && !hasApproval("codeReview")',
        action: 'File requires code review before modification',
        priority: 8,
        enabled: true
      },
      {
        id: 'stable-code-protection',
        name: 'Stable Code Protection',
        condition: 'metadata.stability === "stable" && !hasApproval("dev")',
        action: 'Stable code should be reviewed before modification',
        priority: 6,
        enabled: true
      }
    ];
  }

  addCustomRule(rule: AIRule): void {
    this.rules.push(rule);
    console.log(chalk.blue(`➕ Added custom rule: ${rule.name}`));
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
    console.log(chalk.blue(`➖ Removed rule: ${ruleId}`));
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = true;
      console.log(chalk.green(`✅ Enabled rule: ${ruleId}`));
    }
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = false;
      console.log(chalk.yellow(`⏸️  Disabled rule: ${ruleId}`));
    }
  }

  listRules(): AIRule[] {
    return [...this.rules];
  }
}
