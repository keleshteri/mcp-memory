/**
 * @ai-metadata
 * @class: GitUtils
 * @description: Utility functions for extracting git information like last editor, commit details
 * @last-update: 2024-12-20
 * @last-editor: ai-assistant
 * @changelog: ./CHANGELOG.md
 * @stability: stable
 * @edit-permissions: full
 * @dependencies: ["child_process", "path"]
 * @tests: ["./tests/git-utils.test.js"]
 * @breaking-changes-risk: low
 * @review-required: false
 * @ai-context: "Utility functions for git operations to get accurate contributor information"
 */

import { execSync } from 'child_process';
import * as path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';

export class GitUtils {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Get the last editor of a specific file from git blame/log
   * @param filePath - The file path relative to project root
   * @returns The name of the last editor or 'unknown' if not found
   */
  async getLastEditor(filePath: string): Promise<string> {
    try {
      const absolutePath = path.resolve(this.projectRoot, filePath);
      const relativePath = path.relative(this.projectRoot, absolutePath);
      
      // Use git log to get the last author who modified the file
      const command = `git log -1 --pretty=format:"%an" -- "${relativePath}"`;
      const result = execSync(command, { 
        cwd: this.projectRoot, 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      
      return result || 'unknown';
    } catch (error) {
      console.warn(`Could not get git information for ${filePath}:`, error);
      return 'unknown';
    }
  }

  /**
   * Get the last commit date for a specific file
   * @param filePath - The file path relative to project root
   * @returns The last commit date or current date if not found
   */
  async getLastCommitDate(filePath: string): Promise<string> {
    try {
      const absolutePath = path.resolve(this.projectRoot, filePath);
      const relativePath = path.relative(this.projectRoot, absolutePath);
      
      const command = `git log -1 --pretty=format:"%ci" -- "${relativePath}"`;
      const result = execSync(command, { 
        cwd: this.projectRoot, 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      
      if (result) {
        return new Date(result).toISOString().split('T')[0];
      }
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.warn(`Could not get git commit date for ${filePath}:`, error);
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Check if the current directory is a git repository
   * @returns true if it's a git repository, false otherwise
   */
  isGitRepository(): boolean {
    try {
      execSync('git rev-parse --git-dir', { 
        cwd: this.projectRoot, 
        stdio: ['pipe', 'pipe', 'pipe'] 
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current git user name
   * @returns The configured git user name or 'unknown'
   */
  getCurrentGitUser(): string {
    try {
      const result = execSync('git config user.name', { 
        cwd: this.projectRoot, 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      return result || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get the last editor of a file (wrapper for convenience)
   * @param filePath - The file path relative to project root
   * @returns The name of the last editor
   */
  async getFileLastEditor(filePath: string): Promise<string> {
    if (!this.isGitRepository()) {
      return 'unknown';
    }
    return await this.getLastEditor(filePath);
  }

  /**
   * Update the @last-editor field in a file's metadata header
   * @param filePath - The absolute path to the file
   * @returns Object with success status and details
   */
  async updateLastEditorInFile(filePath: string): Promise<{success: boolean, newEditor?: string, reason?: string}> {
    try {
      const relativePath = path.relative(this.projectRoot, filePath);
      const lastEditor = await this.getFileLastEditor(relativePath);
      
      if (lastEditor === 'unknown') {
        return { success: false, reason: 'Could not determine last editor from Git' };
      }
      
      const content = await fs.readFile(filePath, 'utf8');
      const updatedContent = content.replace(
        /^(\s*\*\s*@last-editor:\s*).*$/m,
        `$1${lastEditor}`
      );
      
      if (content !== updatedContent) {
        await fs.writeFile(filePath, updatedContent, 'utf8');
        return { success: true, newEditor: lastEditor };
      }
      
      return { success: false, reason: 'File already up to date' };
    } catch (error) {
      console.error(`Error updating last editor in ${filePath}:`, error);
      return { success: false, reason: `Error: ${error}` };
    }
  }

  /**
   * Update @last-editor fields in all TypeScript files in the project
   * @returns Array of results for each file processed
   */
  async updateAllLastEditors(): Promise<Array<{file: string, success: boolean, newEditor?: string, reason?: string}>> {
    try {
      // Find all TypeScript files with @last-editor
      const pattern = path.join(this.projectRoot, '**/*.ts');
      const files = glob.sync(pattern, { ignore: ['**/node_modules/**', '**/dist/**'] });
      
      const results = [];
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf8');
          if (content.includes('@last-editor')) {
            const result = await this.updateLastEditorInFile(file);
            results.push({
              file: path.relative(this.projectRoot, file),
              ...result
            });
          }
        } catch (error) {
          results.push({
            file: path.relative(this.projectRoot, file),
            success: false,
            reason: `Error reading file: ${error}`
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error updating all last editors:', error);
      return [{ file: 'all', success: false, reason: `Error: ${error}` }];
    }
  }
}

/**
 * Convenience function to get the last editor of a file
 * @param projectRoot - The project root directory
 * @param filePath - The file path relative to project root
 * @returns The name of the last editor
 */
export async function getFileLastEditor(projectRoot: string, filePath: string): Promise<string> {
  const gitUtils = new GitUtils(projectRoot);
  
  if (!gitUtils.isGitRepository()) {
    return 'unknown';
  }
  
  return await gitUtils.getLastEditor(filePath);
}

/**
 * Update the @last-editor field in a file's metadata header
 * @param filePath - The absolute path to the file
 * @param projectRoot - The project root directory
 * @returns true if updated successfully, false otherwise
 */
export async function updateLastEditorInFile(filePath: string, projectRoot: string): Promise<boolean> {
  try {
    const fs = await import('fs-extra');
    const relativePath = path.relative(projectRoot, filePath);
    const lastEditor = await getFileLastEditor(projectRoot, relativePath);
    
    if (lastEditor === 'unknown') {
      return false;
    }
    
    const content = await fs.readFile(filePath, 'utf8');
    const updatedContent = content.replace(
      /^(\s*\*\s*@last-editor:\s*).*$/m,
      `$1${lastEditor}`
    );
    
    if (content !== updatedContent) {
      await fs.writeFile(filePath, updatedContent, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error updating last editor in ${filePath}:`, error);
    return false;
  }
}