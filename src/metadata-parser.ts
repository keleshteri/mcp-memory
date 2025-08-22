import fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { AIMetadata } from './types.js';

export class MetadataParser {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async parseFileMetadata(filePath: string): Promise<AIMetadata | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.extractMetadataFromContent(content);
    } catch (error) {
      console.error(chalk.red(`Error reading file ${filePath}:`), error);
      return null;
    }
  }

  extractMetadataFromContent(content: string): AIMetadata | null {
    // Look for @ai-metadata block
    const metadataRegex = /\/\*\*[\s\S]*?@ai-metadata[\s\S]*?\*\//;
    const match = content.match(metadataRegex);
    
    if (!match) {
      return null;
    }

    const metadataBlock = match[0];
    const metadata: AIMetadata = {};

    // Parse each field
    this.parseField(metadataBlock, '@class:', (value) => metadata.class = value);
    this.parseField(metadataBlock, '@description:', (value) => metadata.description = value);
    this.parseField(metadataBlock, '@last-update:', (value) => metadata.lastUpdate = value);
    this.parseField(metadataBlock, '@last-editor:', (value) => metadata.lastEditor = value);
    this.parseField(metadataBlock, '@changelog:', (value) => metadata.changelog = value);
    this.parseField(metadataBlock, '@stability:', (value) => metadata.stability = value as any);
    this.parseField(metadataBlock, '@edit-permissions:', (value) => metadata.editPermissions = value as any);
    this.parseField(metadataBlock, '@breaking-changes-risk:', (value) => metadata.breakingChangesRisk = value as any);
    this.parseField(metadataBlock, '@review-required:', (value) => metadata.reviewRequired = value === 'true');
    this.parseField(metadataBlock, '@ai-context:', (value) => metadata.aiContext = value);

    // Parse arrays
    this.parseArrayField(metadataBlock, '@dependencies:', (value) => metadata.dependencies = value);
    this.parseArrayField(metadataBlock, '@tests:', (value) => metadata.tests = value);

    // Parse method permissions (JSON object)
    this.parseJsonField(metadataBlock, '@method-permissions:', (value) => metadata.methodPermissions = value);

    // Parse approvals
    metadata.approvals = this.parseApprovals(metadataBlock);

    return metadata;
  }

  private parseField(content: string, field: string, setter: (value: string) => void): void {
    const regex = new RegExp(`${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*([^\\n\\r]+)`, 'i');
    const match = content.match(regex);
    if (match) {
      setter(match[1].trim().replace(/['"]/g, ''));
    }
  }

  private parseArrayField(content: string, field: string, setter: (value: string[]) => void): void {
    const regex = new RegExp(`${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\[([^\\]]+)\\]`, 'i');
    const match = content.match(regex);
    if (match) {
      const items = match[1].split(',').map(item => item.trim().replace(/['"]/g, ''));
      setter(items);
    }
  }

  private parseJsonField(content: string, field: string, setter: (value: any) => void): void {
    const regex = new RegExp(`${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*({[^}]+})`, 'i');
    const match = content.match(regex);
    if (match) {
      try {
        const jsonStr = match[1].replace(/'/g, '"');
        setter(JSON.parse(jsonStr));
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not parse JSON for ${field}`));
      }
    }
  }

  private parseApprovals(content: string): any {
    const approvals: any = {};
    
    this.parseField(content, '@dev-approved:', (value) => approvals.devApproved = value === 'true');
    this.parseField(content, '@dev-approved-by:', (value) => approvals.devApprovedBy = value);
    this.parseField(content, '@dev-approved-date:', (value) => approvals.devApprovedDate = value);
    this.parseField(content, '@code-review-approved:', (value) => approvals.codeReviewApproved = value === 'true');
    this.parseField(content, '@code-review-approved-by:', (value) => approvals.codeReviewApprovedBy = value);
    this.parseField(content, '@code-review-date:', (value) => approvals.codeReviewDate = value);
    this.parseField(content, '@qa-approved:', (value) => approvals.qaApproved = value === 'true');
    this.parseField(content, '@qa-approved-by:', (value) => approvals.qaApprovedBy = value);
    this.parseField(content, '@qa-approved-date:', (value) => approvals.qaApprovedDate = value);

    return Object.keys(approvals).length > 0 ? approvals : undefined;
  }

  async updateFileMetadata(filePath: string, updates: Partial<AIMetadata>): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const updatedContent = this.updateMetadataInContent(content, updates);
      await fs.writeFile(filePath, updatedContent);
      console.log(chalk.green(`✓ Updated metadata in ${filePath}`));
    } catch (error) {
      console.error(chalk.red(`Error updating metadata in ${filePath}:`), error);
    }
  }

  updateMetadataInContent(content: string, updates: Partial<AIMetadata>): string {
    const metadataRegex = /\/\*\*[\s\S]*?@ai-metadata[\s\S]*?\*\//;
    const match = content.match(metadataRegex);
    
    if (!match) {
      // If no metadata exists, create it
      const newMetadata = this.generateMetadataBlock(updates);
      return newMetadata + '\n' + content;
    }

    // Update existing metadata
    let metadataBlock = match[0];
    
    // Update timestamp
    updates.lastUpdate = new Date().toISOString();
    
    for (const [key, value] of Object.entries(updates)) {
      metadataBlock = this.updateMetadataField(metadataBlock, key, value);
    }

    return content.replace(metadataRegex, metadataBlock);
  }

  private updateMetadataField(metadataBlock: string, key: string, value: any): string {
    const fieldMap: Record<string, string> = {
      lastUpdate: '@last-update:',
      lastEditor: '@last-editor:',
      editPermissions: '@edit-permissions:',
      breakingChangesRisk: '@breaking-changes-risk:',
      reviewRequired: '@review-required:'
    };

    const field = fieldMap[key];
    if (!field) return metadataBlock;

    const regex = new RegExp(`(${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*[^\\n\\r]+`, 'i');
    const replacement = `${field} ${value}`;
    
    if (metadataBlock.match(regex)) {
      return metadataBlock.replace(regex, replacement);
    } else {
      // Add new field before the closing */
      return metadataBlock.replace(/\s*\*\//, `\n * ${replacement}\n */`);
    }
  }

  private generateMetadataBlock(metadata: Partial<AIMetadata>): string {
    let block = '/**\n * @ai-metadata\n';
    
    if (metadata.class) block += ` * @class: ${metadata.class}\n`;
    if (metadata.description) block += ` * @description: ${metadata.description}\n`;
    block += ` * @last-update: ${metadata.lastUpdate || new Date().toISOString()}\n`;
    if (metadata.lastEditor) block += ` * @last-editor: ${metadata.lastEditor}\n`;
    if (metadata.stability) block += ` * @stability: ${metadata.stability}\n`;
    if (metadata.editPermissions) block += ` * @edit-permissions: ${metadata.editPermissions}\n`;
    if (metadata.breakingChangesRisk) block += ` * @breaking-changes-risk: ${metadata.breakingChangesRisk}\n`;
    if (metadata.reviewRequired !== undefined) block += ` * @review-required: ${metadata.reviewRequired}\n`;
    if (metadata.aiContext) block += ` * @ai-context: ${metadata.aiContext}\n`;
    
    block += ' */';
    return block;
  }

  async findFilesWithMetadata(pattern: string = '**/*.{js,ts,jsx,tsx,py,java,cpp,c,h}'): Promise<string[]> {
    try {
      const files = await glob(pattern, { 
        cwd: this.projectRoot,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**']
      });
      
      const filesWithMetadata: string[] = [];
      
      for (const file of files) {
        const metadata = await this.parseFileMetadata(file);
        if (metadata) {
          filesWithMetadata.push(file);
        }
      }
      
      return filesWithMetadata;
    } catch (error) {
      console.error(chalk.red('Error finding files with metadata:'), error);
      return [];
    }
  }
}
