/**
 * @ai-metadata
 * @component: FolderMapper
 * @description: Automatically generates and maintains _map.md files for each folder, providing quick overviews of classes, methods, and interfaces
 * @last-update: 2024-01-15
 * @last-editor: Mohammad Mehdi Shaban Keleshteri
 * @changelog: ./CHANGELOG.md
 * @stability: experimental
 * @edit-permissions: full
 * @dependencies: ["fs-extra", "path", "@typescript-eslint/typescript-estree", "./types.js"]
 * @tests: ["./tests/folder-mapper.test.ts"]
 * @breaking-changes-risk: low
 * @review-required: false
 * @ai-context: "New folder mapping functionality to generate _map.md files for better code discovery and AI assistance"
 */

import fs from 'fs-extra';
import * as path from 'path';
import { parse } from '@typescript-eslint/typescript-estree';
import chalk from 'chalk';

export interface FileInfo {
  fileName: string;
  filePath: string;
  exports: ExportInfo[];
  imports: ImportInfo[];
  purpose: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ExportInfo {
  name: string;
  type: 'class' | 'interface' | 'function' | 'type' | 'const' | 'enum';
  methods?: MethodInfo[];
  properties?: PropertyInfo[];
  description?: string;
}

export interface MethodInfo {
  name: string;
  parameters: string[];
  returnType?: string;
  description?: string;
  useCases?: string[];
  isStatic?: boolean;
  isPrivate?: boolean;
}

export interface PropertyInfo {
  name: string;
  type?: string;
  description?: string;
  isOptional?: boolean;
}

export interface ImportInfo {
  source: string;
  imported: string[];
}

export interface FolderMap {
  folderPath: string;
  folderName: string;
  purpose: string;
  files: FileInfo[];
  dependencies: string[];
  tests: string[];
  lastGenerated: string;
  totalClasses: number;
  totalInterfaces: number;
  totalFunctions: number;
}

export class FolderMapper {
  private projectRoot: string;
  private excludePatterns: string[];
  private fileExtensions: string[];

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.excludePatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      '.nuxt',
      'tests',
      '__tests__',
      '.test.',
      '.spec.',
      '_map.md'
    ];
    this.fileExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  }

  /**
   * Generate folder maps for all folders in the project
   */
  async generateAllFolderMaps(): Promise<void> {
    const srcDir = path.join(this.projectRoot, 'src');
    
    if (!await fs.pathExists(srcDir)) {
      console.log(chalk.yellow('⚠️  No src directory found'));
      return;
    }

    await this.generateFolderMapsRecursively(srcDir);
    console.log(chalk.green('✅ All folder maps generated successfully'));
  }

  /**
   * Generate or update a folder map for a specific folder
   */
  async generateFolderMap(folderPath: string): Promise<FolderMap> {
    const folderName = path.basename(folderPath);
    console.log(chalk.blue(`📁 Generating map for: ${folderName}`));

    const files = await this.getFilesInFolder(folderPath);
    const fileInfos: FileInfo[] = [];

    for (const file of files) {
      try {
        const fileInfo = await this.analyzeFile(file);
        if (fileInfo.exports.length > 0) {
          fileInfos.push(fileInfo);
        }
      } catch (error) {
        console.log(chalk.yellow(`⚠️  Could not analyze ${file}: ${error}`));
      }
    }

    const folderMap: FolderMap = {
      folderPath,
      folderName,
      purpose: this.inferFolderPurpose(folderName, fileInfos),
      files: fileInfos,
      dependencies: this.extractUniqueDependencies(fileInfos),
      tests: await this.findRelatedTests(folderPath),
      lastGenerated: new Date().toISOString(),
      totalClasses: this.countByType(fileInfos, 'class'),
      totalInterfaces: this.countByType(fileInfos, 'interface'),
      totalFunctions: this.countByType(fileInfos, 'function')
    };

    await this.writeMapFile(folderPath, folderMap);
    return folderMap;
  }

  /**
   * Update existing folder maps when files change
   */
  async updateFolderMapIfNeeded(filePath: string): Promise<void> {
    const folderPath = path.dirname(filePath);
    const mapPath = path.join(folderPath, '_map.md');

    if (await fs.pathExists(mapPath)) {
      const stats = await fs.stat(filePath);
      const mapStats = await fs.stat(mapPath);

      // If source file is newer than map, regenerate
      if (stats.mtime > mapStats.mtime) {
        console.log(chalk.yellow(`🔄 Updating map for ${path.basename(folderPath)}`));
        await this.generateFolderMap(folderPath);
      }
    }
  }

  /**
   * Find all _map.md files in the project
   */
  async findAllMapFiles(): Promise<string[]> {
    const mapFiles: string[] = [];
    await this.findMapFilesRecursively(this.projectRoot, mapFiles);
    return mapFiles;
  }

  /**
   * Validate that all maps are up-to-date
   */
  async validateAllMaps(): Promise<{ valid: boolean; outdatedMaps: string[] }> {
    const mapFiles = await this.findAllMapFiles();
    const outdatedMaps: string[] = [];

    for (const mapFile of mapFiles) {
      const folderPath = path.dirname(mapFile);
      const sourceFiles = await this.getFilesInFolder(folderPath);
      
      if (sourceFiles.length === 0) continue;

      const mapStats = await fs.stat(mapFile);
      let isOutdated = false;

      for (const sourceFile of sourceFiles) {
        const sourceStats = await fs.stat(sourceFile);
        if (sourceStats.mtime > mapStats.mtime) {
          isOutdated = true;
          break;
        }
      }

      if (isOutdated) {
        outdatedMaps.push(mapFile);
      }
    }

    return {
      valid: outdatedMaps.length === 0,
      outdatedMaps
    };
  }

  private async generateFolderMapsRecursively(dirPath: string): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const hasCodeFiles = await this.hasCodeFiles(dirPath);

    // Generate map for current folder if it has code files
    if (hasCodeFiles) {
      await this.generateFolderMap(dirPath);
    }

    // Recursively process subdirectories
    for (const entry of entries) {
      if (entry.isDirectory() && !this.shouldExcludeFolder(entry.name)) {
        const subDirPath = path.join(dirPath, entry.name);
        await this.generateFolderMapsRecursively(subDirPath);
      }
    }
  }

  private async analyzeFile(filePath: string): Promise<FileInfo> {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    const exports: ExportInfo[] = [];
    const imports: ImportInfo[] = [];

    try {
      const ast = parse(content, {
        loc: true,
        range: true,
        comment: true,
        errorOnUnknownASTType: false
      });

      // Extract exports
      for (const node of ast.body) {
        if (node.type === 'ExportNamedDeclaration' && node.declaration) {
          const exportInfo = this.extractExportInfo(node.declaration);
          if (exportInfo) {
            exports.push(exportInfo);
          }
        } else if (node.type === 'ExportDefaultDeclaration') {
          const exportInfo = this.extractExportInfo(node.declaration);
          if (exportInfo) {
            exportInfo.name = 'default';
            exports.push(exportInfo);
          }
        }
      }

      // Extract imports
      for (const node of ast.body) {
        if (node.type === 'ImportDeclaration') {
          const importInfo = this.extractImportInfo(node);
          if (importInfo) {
            imports.push(importInfo);
          }
        }
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Parse error in ${fileName}: ${error}`));
    }

    return {
      fileName,
      filePath,
      exports,
      imports,
      purpose: this.inferFilePurpose(fileName, exports),
      riskLevel: this.assessFileRisk(fileName, exports)
    };
  }

  private extractExportInfo(node: any): ExportInfo | null {
    switch (node.type) {
      case 'ClassDeclaration':
        return {
          name: node.id?.name || 'UnnamedClass',
          type: 'class',
          methods: this.extractMethods(node),
          properties: this.extractProperties(node),
          description: this.extractDescription(node)
        };

      case 'TSInterfaceDeclaration':
        return {
          name: node.id?.name || 'UnnamedInterface',
          type: 'interface',
          properties: this.extractInterfaceProperties(node),
          description: this.extractDescription(node)
        };

      case 'FunctionDeclaration':
        return {
          name: node.id?.name || 'UnnamedFunction',
          type: 'function',
          description: this.extractDescription(node)
        };

      case 'TSTypeAliasDeclaration':
        return {
          name: node.id?.name || 'UnnamedType',
          type: 'type',
          description: this.extractDescription(node)
        };

      case 'VariableDeclaration':
        if (node.declarations && node.declarations[0]) {
          return {
            name: node.declarations[0].id?.name || 'UnnamedVariable',
            type: 'const',
            description: this.extractDescription(node)
          };
        }
        break;

      case 'TSEnumDeclaration':
        return {
          name: node.id?.name || 'UnnamedEnum',
          type: 'enum',
          description: this.extractDescription(node)
        };
    }

    return null;
  }

  private extractMethods(classNode: any): MethodInfo[] {
    const methods: MethodInfo[] = [];

    if (classNode.body && classNode.body.body) {
      for (const member of classNode.body.body) {
        if (member.type === 'MethodDefinition') {
          methods.push({
            name: member.key?.name || 'unnamed',
            parameters: this.extractParameters(member.value),
            isStatic: member.static,
            isPrivate: member.accessibility === 'private',
            description: this.extractDescription(member)
          });
        }
      }
    }

    return methods;
  }

  private extractProperties(classNode: any): PropertyInfo[] {
    const properties: PropertyInfo[] = [];

    if (classNode.body && classNode.body.body) {
      for (const member of classNode.body.body) {
        if (member.type === 'PropertyDefinition') {
          properties.push({
            name: member.key?.name || 'unnamed',
            type: this.getTypeString(member.typeAnnotation),
            description: this.extractDescription(member)
          });
        }
      }
    }

    return properties;
  }

  private extractInterfaceProperties(interfaceNode: any): PropertyInfo[] {
    const properties: PropertyInfo[] = [];

    if (interfaceNode.body && interfaceNode.body.body) {
      for (const member of interfaceNode.body.body) {
        if (member.type === 'TSPropertySignature') {
          properties.push({
            name: member.key?.name || 'unnamed',
            type: this.getTypeString(member.typeAnnotation),
            isOptional: member.optional,
            description: this.extractDescription(member)
          });
        }
      }
    }

    return properties;
  }

  private extractParameters(functionNode: any): string[] {
    if (!functionNode.params) return [];
    
    return functionNode.params.map((param: any) => {
      if (param.type === 'Identifier') {
        return param.name;
      } else if (param.type === 'ObjectPattern') {
        return '{ ... }';
      } else if (param.type === 'ArrayPattern') {
        return '[ ... ]';
      }
      return 'param';
    });
  }

  private extractImportInfo(node: any): ImportInfo | null {
    if (!node.source || !node.source.value) return null;

    const imported: string[] = [];
    
    if (node.specifiers) {
      for (const spec of node.specifiers) {
        if (spec.type === 'ImportDefaultSpecifier') {
          imported.push('default');
        } else if (spec.type === 'ImportNamespaceSpecifier') {
          imported.push('*');
        } else if (spec.type === 'ImportSpecifier') {
          imported.push(spec.imported?.name || spec.local?.name || 'unknown');
        }
      }
    }

    return {
      source: node.source.value,
      imported
    };
  }

  private extractDescription(node: any): string {
    // Try to extract JSDoc or comment descriptions
    // This is a simplified version - could be enhanced
    return '';
  }

  private getTypeString(typeAnnotation: any): string {
    if (!typeAnnotation || !typeAnnotation.typeAnnotation) return 'unknown';
    
    const type = typeAnnotation.typeAnnotation;
    
    switch (type.type) {
      case 'TSStringKeyword':
        return 'string';
      case 'TSNumberKeyword':
        return 'number';
      case 'TSBooleanKeyword':
        return 'boolean';
      case 'TSTypeReference':
        return type.typeName?.name || 'unknown';
      default:
        return 'unknown';
    }
  }

  private async getFilesInFolder(folderPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(folderPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && this.isCodeFile(entry.name)) {
          files.push(path.join(folderPath, entry.name));
        }
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Cannot read folder ${folderPath}: ${error}`));
    }

    return files;
  }

  private async hasCodeFiles(folderPath: string): Promise<boolean> {
    const files = await this.getFilesInFolder(folderPath);
    return files.length > 0;
  }

  private isCodeFile(fileName: string): boolean {
    return this.fileExtensions.some(ext => fileName.endsWith(ext)) &&
           !this.excludePatterns.some(pattern => fileName.includes(pattern));
  }

  private shouldExcludeFolder(folderName: string): boolean {
    return this.excludePatterns.some(pattern => folderName.includes(pattern));
  }

  private inferFolderPurpose(folderName: string, files: FileInfo[]): string {
    // Map common folder names to purposes
    const folderPurposes: Record<string, string> = {
      'components': 'Reusable UI components and building blocks',
      'services': 'Business logic and external service integrations',
      'utils': 'Shared utility functions and helpers',
      'types': 'TypeScript type definitions and interfaces',
      'hooks': 'Custom React hooks for state and side effects',
      'pages': 'Route components and page-level logic',
      'api': 'API route handlers and endpoint definitions',
      'config': 'Configuration files and environment setup',
      'lib': 'Third-party library wrappers and core utilities',
      'store': 'State management and data stores',
      'models': 'Data models and entity definitions',
      'controllers': 'Request handlers and business logic controllers',
      'middleware': 'Request/response processing middleware',
      'validators': 'Input validation and schema definitions',
      'handlers': 'Event handlers and message processors',
      'managers': 'Resource and lifecycle management',
      'builders': 'Object construction and factory patterns',
      'formatters': 'Data formatting and transformation',
      'parsers': 'Data parsing and interpretation',
      'clients': 'External service clients and API wrappers'
    };

    // Check for exact matches first
    const exactMatch = folderPurposes[folderName.toLowerCase()];
    if (exactMatch) return exactMatch;

    // Try partial matches
    for (const [key, purpose] of Object.entries(folderPurposes)) {
      if (folderName.toLowerCase().includes(key)) {
        return purpose;
      }
    }

    // Infer from file contents
    const hasClasses = files.some(f => f.exports.some(e => e.type === 'class'));
    const hasInterfaces = files.some(f => f.exports.some(e => e.type === 'interface'));
    const hasFunctions = files.some(f => f.exports.some(e => e.type === 'function'));

    if (hasInterfaces && !hasClasses) return 'Type definitions and interfaces';
    if (hasClasses && !hasInterfaces) return 'Class-based components and services';
    if (hasFunctions && !hasClasses && !hasInterfaces) return 'Utility functions and helpers';

    return 'Mixed functionality - see individual files for details';
  }

  private inferFilePurpose(fileName: string, exports: ExportInfo[]): string {
    if (exports.length === 0) return 'Supporting file with no exports';
    
    const hasClasses = exports.some(e => e.type === 'class');
    const hasInterfaces = exports.some(e => e.type === 'interface');
    const hasFunctions = exports.some(e => e.type === 'function');

    if (hasClasses) return 'Class definitions and implementations';
    if (hasInterfaces) return 'Type definitions and interfaces';
    if (hasFunctions) return 'Utility functions and helpers';
    
    return 'Mixed exports';
  }

  private assessFileRisk(fileName: string, exports: ExportInfo[]): 'low' | 'medium' | 'high' {
    // High risk indicators
    if (fileName.includes('config') || fileName.includes('settings')) return 'high';
    if (fileName.includes('security') || fileName.includes('auth')) return 'high';
    if (fileName.includes('database') || fileName.includes('migration')) return 'high';
    
    // Medium risk indicators
    if (fileName.includes('service') || fileName.includes('manager')) return 'medium';
    if (fileName.includes('client') || fileName.includes('api')) return 'medium';
    if (exports.some(e => e.type === 'class')) return 'medium';
    
    return 'low';
  }

  private extractUniqueDependencies(files: FileInfo[]): string[] {
    const deps = new Set<string>();
    
    files.forEach(file => {
      file.imports.forEach(imp => {
        if (imp.source.startsWith('.') || imp.source.startsWith('/')) {
          deps.add(imp.source);
        }
      });
    });

    return Array.from(deps).sort();
  }

  private async findRelatedTests(folderPath: string): Promise<string[]> {
    const folderName = path.basename(folderPath);
    const projectRoot = this.projectRoot;
    const testPatterns = [
      `tests/${folderName}/**/*`,
      `__tests__/${folderName}/**/*`,
      `src/**/*.test.ts`,
      `src/**/*.spec.ts`
    ];

    const testFiles: string[] = [];
    // This is a simplified version - you might want to use glob here
    return testFiles;
  }

  private countByType(files: FileInfo[], type: string): number {
    return files.reduce((count, file) => {
      return count + file.exports.filter(exp => exp.type === type).length;
    }, 0);
  }

  private async writeMapFile(folderPath: string, folderMap: FolderMap): Promise<void> {
    const mapPath = path.join(folderPath, '_map.md');
    const content = this.generateMapMarkdown(folderMap);
    
    await fs.writeFile(mapPath, content, 'utf-8');
    console.log(chalk.green(`✅ Generated map: ${path.relative(this.projectRoot, mapPath)}`));
  }

  private async findMapFilesRecursively(dirPath: string, mapFiles: string[]): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isFile() && entry.name === '_map.md') {
          mapFiles.push(fullPath);
        } else if (entry.isDirectory() && !this.shouldExcludeFolder(entry.name)) {
          await this.findMapFilesRecursively(fullPath, mapFiles);
        }
      }
    } catch (error) {
      // Ignore errors for directories we can't read
    }
  }

  private generateMapMarkdown(folderMap: FolderMap): string {
    const { folderName, purpose, files, dependencies, tests, lastGenerated, totalClasses, totalInterfaces, totalFunctions } = folderMap;
    
    let content = `# ${this.getEmojiForFolder(folderName)} ${folderName} Module Map\n\n`;
    content += `> **Purpose**: ${purpose}\n\n`;
    
    // Statistics
    content += `## 📊 Quick Stats\n`;
    content += `- **Files**: ${files.length}\n`;
    content += `- **Classes**: ${totalClasses}\n`;
    content += `- **Interfaces**: ${totalInterfaces}\n`;
    content += `- **Functions**: ${totalFunctions}\n\n`;
    
    // Files overview
    content += `## 🗂️ Files Overview\n\n`;
    
    for (const file of files) {
      content += `### \`${file.fileName}\`\n`;
      content += `**Purpose**: ${file.purpose} | **Risk**: ${file.riskLevel}\n\n`;
      
      for (const exportItem of file.exports) {
        content += this.generateExportMarkdown(exportItem);
      }
      
      content += `---\n\n`;
    }
    
    // Dependencies
    if (dependencies.length > 0) {
      content += `## 🔗 Dependencies\n`;
      for (const dep of dependencies) {
        content += `- \`${dep}\`\n`;
      }
      content += `\n`;
    }
    
    // Tests
    if (tests.length > 0) {
      content += `## 🧪 Tests\n`;
      for (const test of tests) {
        content += `- \`${test}\`\n`;
      }
      content += `\n`;
    }
    
    // Usage examples section placeholder
    content += `## 📝 Usage Examples\n`;
    content += `\`\`\`typescript\n`;
    content += `// Add usage examples here\n`;
    content += `\`\`\`\n\n`;
    
    // Footer
    content += `---\n`;
    content += `*Generated on: ${new Date(lastGenerated).toLocaleString()}*\n`;
    
    return content;
  }

  private generateExportMarkdown(exportItem: ExportInfo): string {
    let content = `**${exportItem.type.toUpperCase()}**: \`${exportItem.name}\`\n`;
    
    if (exportItem.description) {
      content += `*${exportItem.description}*\n\n`;
    }
    
    if (exportItem.methods && exportItem.methods.length > 0) {
      content += `**Methods**:\n`;
      for (const method of exportItem.methods) {
        const params = method.parameters.join(', ');
        const staticPrefix = method.isStatic ? 'static ' : '';
        const privatePrefix = method.isPrivate ? 'private ' : '';
        content += `- \`${staticPrefix}${privatePrefix}${method.name}(${params})\``;
        if (method.description) {
          content += ` - ${method.description}`;
        }
        content += '\n';
      }
      content += '\n';
    }
    
    if (exportItem.properties && exportItem.properties.length > 0) {
      content += `**Properties**:\n`;
      for (const prop of exportItem.properties) {
        const optional = prop.isOptional ? '?' : '';
        const type = prop.type ? `: ${prop.type}` : '';
        content += `- \`${prop.name}${optional}${type}\``;
        if (prop.description) {
          content += ` - ${prop.description}`;
        }
        content += '\n';
      }
      content += '\n';
    }
    
    return content;
  }

  private getEmojiForFolder(folderName: string): string {
    const emojiMap: Record<string, string> = {
      'api': '🚀',
      'components': '🧩',
      'services': '⚙️',
      'utils': '🛠️',
      'types': '📝',
      'hooks': '🎣',
      'pages': '📄',
      'config': '⚡',
      'lib': '📚',
      'store': '💾',
      'models': '🗄️',
      'controllers': '🎮',
      'middleware': '🔗',
      'validators': '✅',
      'handlers': '📧',
      'managers': '👥',
      'builders': '🏗️',
      'formatters': '📋',
      'parsers': '🔍',
      'clients': '📡'
    };

    const key = folderName.toLowerCase();
    return emojiMap[key] || '📁';
  }
}
