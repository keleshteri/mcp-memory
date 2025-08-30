/**
 * @ai-metadata
 * @class: ChangelogManager
 * @description: Manages automatic changelog generation and tracking for AI coding sessions, handling both JSON and Markdown changelog formats
 * @last-update: 2024-12-20
 * @last-editor: Mohammad Mehdi Shaban Keleshteri
 * @changelog: ./CHANGELOG.md
 * @stability: stable
 * @edit-permissions: method-specific
 * @method-permissions: { "constructor": "read-only", "addChangelogEntry": "allow", "getChangelog": "read-only", "getChangelogForFile": "read-only", "getRecentChanges": "read-only", "updateMarkdownChangelog": "read-only", "addQuickEntry": "allow" }
 * @dependencies: ["fs-extra", "path", "chalk", "./types.js"]
 * @tests: ["./tests/changelog-manager.test.js"]
 * @breaking-changes-risk: medium
 * @review-required: false
 * @ai-context: "This manages changelog generation and tracking. Changes here affect how project history is recorded and displayed. Generally safe to modify with proper testing."
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
 *   - require-dev-approval-for: ["breaking-changes"]
 *   - require-code-review-for: ["major-changes"]
 *   - require-qa-approval-for: ["production-ready"]
 */

import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { ChangelogEntry, ApprovalStatus } from './types.js';

export class ChangelogManager {
  private projectRoot: string;
  private changelogPath: string;
  private markdownChangelogPath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.changelogPath = path.join(projectRoot, '.ai-memory', 'ai-changelog.json');
    this.markdownChangelogPath = path.join(projectRoot, 'CHANGELOG.md');
  }

  async addChangelogEntry(entry: Omit<ChangelogEntry, 'date'>): Promise<void> {
    try {
      const changelog = await this.getChangelog();
      
      const newEntry: ChangelogEntry = {
        ...entry,
        date: new Date().toISOString()
      };

      changelog.unshift(newEntry); // Add to beginning
      
      await fs.writeJson(this.changelogPath, changelog, { spaces: 2 });
      await this.updateMarkdownChangelog(changelog);
      
      console.log(chalk.green(`📝 Changelog entry added: ${entry.description}`));
    } catch (error) {
      console.error(chalk.red('Error adding changelog entry:'), error);
    }
  }

  async getChangelog(): Promise<ChangelogEntry[]> {
    try {
      if (await fs.pathExists(this.changelogPath)) {
        return await fs.readJson(this.changelogPath);
      }
      return [];
    } catch (error) {
      console.error(chalk.red('Error reading changelog:'), error);
      return [];
    }
  }

  async getChangelogForFile(filePath: string): Promise<ChangelogEntry[]> {
    const changelog = await this.getChangelog();
    const relativePath = path.relative(this.projectRoot, filePath);
    
    return changelog.filter(entry => 
      entry.filesChanged.some(file => file === relativePath)
    );
  }

  async getRecentChanges(days: number = 7): Promise<ChangelogEntry[]> {
    const changelog = await this.getChangelog();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return changelog.filter(entry => 
      new Date(entry.date) > cutoffDate
    );
  }

  private async updateMarkdownChangelog(changelog: ChangelogEntry[]): Promise<void> {
    try {
      let markdown = '# Changelog\n\n';
      markdown += 'All notable changes to this project will be documented in this file.\n\n';
      
      // Group by date
      const groupedByDate = this.groupChangelogByDate(changelog);
      
      for (const [date, entries] of Object.entries(groupedByDate)) {
        markdown += `## [${date}]\n\n`;
        
        // Group by type
        const groupedByType = this.groupChangelogByType(entries);
        
        for (const [type, typeEntries] of Object.entries(groupedByType)) {
          if (typeEntries.length > 0) {
            markdown += `### ${this.capitalizeFirst(type)}\n`;
            
            for (const entry of typeEntries) {
              markdown += `- ${entry.description}`;
              
              if (entry.breakingChange) {
                markdown += ' **[BREAKING CHANGE]**';
              }
              
              if (entry.filesChanged.length > 0) {
                markdown += ` (${entry.filesChanged.join(', ')})`;
              }
              
              markdown += '\n';
            }
            markdown += '\n';
          }
        }
      }

      await fs.writeFile(this.markdownChangelogPath, markdown);
      console.log(chalk.green('📄 Markdown changelog updated'));
    } catch (error) {
      console.error(chalk.red('Error updating markdown changelog:'), error);
    }
  }

  private groupChangelogByDate(changelog: ChangelogEntry[]): Record<string, ChangelogEntry[]> {
    const grouped: Record<string, ChangelogEntry[]> = {};
    
    for (const entry of changelog) {
      const date = entry.date.split('T')[0]; // Get YYYY-MM-DD part
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    }
    
    return grouped;
  }

  private groupChangelogByType(entries: ChangelogEntry[]): Record<string, ChangelogEntry[]> {
    const grouped: Record<string, ChangelogEntry[]> = {
      added: [],
      changed: [],
      deprecated: [],
      removed: [],
      fixed: [],
      security: []
    };
    
    for (const entry of entries) {
      grouped[entry.type].push(entry);
    }
    
    return grouped;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  async addQuickEntry(
    description: string, 
    filesChanged: string[], 
    type: ChangelogEntry['type'] = 'changed',
    sessionId?: string
  ): Promise<void> {
    await this.addChangelogEntry({
      sessionId: sessionId || 'manual',
      task: 'Manual entry',
      type,
      description,
      filesChanged,
      breakingChange: false,
      approvals: {},
      impact: 'minor'
    });
  }
}
