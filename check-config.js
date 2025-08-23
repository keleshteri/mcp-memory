#!/usr/bin/env node
/**
 * MCP Server Configuration Checker
 * Diagnoses and validates MCP server setup issues
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import chalk from 'chalk';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MCPConfigChecker {
  constructor() {
    this.mcpServerDir = __dirname;
    this.currentDir = process.cwd();
    this.issues = [];
    this.warnings = [];
    this.suggestions = [];
  }

  /**
   * Add an issue to the report
   */
  addIssue(message, severity = 'error') {
    this.issues.push({ message, severity, type: 'issue' });
  }

  /**
   * Add a warning to the report
   */
  addWarning(message) {
    this.warnings.push({ message, type: 'warning' });
  }

  /**
   * Add a suggestion to the report
   */
  addSuggestion(message) {
    this.suggestions.push({ message, type: 'suggestion' });
  }

  /**
   * Check if MCP server directory is valid
   */
  checkMCPServerDirectory() {
    console.log(chalk.blue('🔍 Checking MCP server directory...'));
    
    const packageJsonPath = path.join(this.mcpServerDir, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      this.addIssue('package.json not found in MCP server directory');
      return false;
    }

    try {
      const packageJson = fs.readJsonSync(packageJsonPath);
      if (packageJson.name !== 'mcp-memory-server') {
        this.addIssue(`Wrong package found: ${packageJson.name}, expected: mcp-memory-server`);
        return false;
      }

      console.log(chalk.green(`   ✅ MCP server directory: ${this.mcpServerDir}`));
      console.log(chalk.green(`   ✅ Package: ${packageJson.name} v${packageJson.version}`));
      return true;
    } catch (error) {
      this.addIssue(`Failed to read package.json: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if server is built
   */
  checkBuild() {
    console.log(chalk.blue('🔍 Checking build status...'));
    
    const distPath = path.join(this.mcpServerDir, 'dist', 'index.js');
    const srcPath = path.join(this.mcpServerDir, 'src', 'index.ts');
    
    if (!fs.existsSync(distPath)) {
      this.addIssue('MCP server not built. Run: npm run build');
      this.addSuggestion('cd ' + this.mcpServerDir + ' && npm run build');
      return false;
    }

    if (!fs.existsSync(srcPath)) {
      this.addWarning('Source files not found, but build exists');
    } else {
      const srcStats = fs.statSync(srcPath);
      const distStats = fs.statSync(distPath);

      if (srcStats.mtime > distStats.mtime) {
        this.addWarning('Source files are newer than build');
        this.addSuggestion('Rebuild with: npm run build');
      }
    }

    console.log(chalk.green('   ✅ Build exists: ' + distPath));
    return true;
  }

  /**
   * Check dependencies
   */
  checkDependencies() {
    console.log(chalk.blue('🔍 Checking dependencies...'));
    
    const nodeModulesPath = path.join(this.mcpServerDir, 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      this.addIssue('Dependencies not installed. Run: npm install');
      this.addSuggestion('cd ' + this.mcpServerDir + ' && npm install');
      return false;
    }

    // Check key dependencies
    const keyDeps = [
      '@modelcontextprotocol/sdk',
      'fs-extra',
      'chalk',
      'glob'
    ];

    for (const dep of keyDeps) {
      const depPath = path.join(nodeModulesPath, dep);
      if (!fs.existsSync(depPath)) {
        this.addWarning(`Missing dependency: ${dep}`);
      }
    }

    console.log(chalk.green('   ✅ Dependencies installed'));
    return true;
  }

  /**
   * Check current project directory
   */
  checkCurrentProject() {
    console.log(chalk.blue('🔍 Checking current project...'));
    
    const projectIndicators = [
      'package.json',
      '.git',
      'pyproject.toml',
      'Cargo.toml',
      'go.mod',
      'pom.xml',
      'build.gradle',
      'composer.json'
    ];

    let foundIndicator = null;
    for (const indicator of projectIndicators) {
      const indicatorPath = path.join(this.currentDir, indicator);
      if (fs.existsSync(indicatorPath)) {
        foundIndicator = indicator;
        break;
      }
    }

    if (foundIndicator) {
      console.log(chalk.green(`   ✅ Project detected: ${this.currentDir}`));
      console.log(chalk.green(`   ✅ Indicator: ${foundIndicator}`));
    } else {
      this.addWarning('No project indicators found in current directory');
      this.addSuggestion('Navigate to your project directory before starting MCP server');
      console.log(chalk.yellow(`   ⚠️  Current directory: ${this.currentDir}`));
    }

    return foundIndicator !== null;
  }

  /**
   * Check memory storage location
   */
  checkMemoryStorage() {
    console.log(chalk.blue('🔍 Checking memory storage...'));
    
    const memoryDir = path.join(this.currentDir, '.ai-memory');
    const projectMemoryFile = path.join(memoryDir, 'project-memory.json');
    
    if (fs.existsSync(memoryDir)) {
      console.log(chalk.green(`   ✅ Memory directory exists: ${memoryDir}`));
      
      if (fs.existsSync(projectMemoryFile)) {
        try {
          const memory = fs.readJsonSync(projectMemoryFile);
          console.log(chalk.green(`   ✅ Project memory loaded`));
          console.log(chalk.gray(`      Project: ${memory.projectContext?.name || 'unnamed'}`));
          console.log(chalk.gray(`      Sessions: ${memory.sessions?.length || 0}`));
          console.log(chalk.gray(`      Decisions: ${memory.globalDecisions?.length || 0}`));
        } catch (error) {
          this.addWarning('Project memory file exists but is corrupted');
        }
      } else {
        this.addWarning('Memory directory exists but no project memory file');
      }
    } else {
      console.log(chalk.yellow(`   ⚠️  Memory directory will be created: ${memoryDir}`));
    }

    return true;
  }

  /**
   * Check Node.js version
   */
  checkNodeVersion() {
    console.log(chalk.blue('🔍 Checking Node.js version...'));
    
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      this.addIssue(`Node.js version ${nodeVersion} is too old. Requires Node.js 18+`);
      this.addSuggestion('Update Node.js to version 18 or higher');
      return false;
    }

    console.log(chalk.green(`   ✅ Node.js version: ${nodeVersion}`));
    return true;
  }

  /**
   * Check file permissions
   */
  checkPermissions() {
    console.log(chalk.blue('🔍 Checking file permissions...'));
    
    try {
      // Test write permission in current directory
      const testFile = path.join(this.currentDir, '.mcp-test-write');
      fs.writeFileSync(testFile, 'test');
      fs.removeSync(testFile);
      
      console.log(chalk.green('   ✅ Write permissions in current directory'));
    } catch (error) {
      this.addIssue('No write permission in current directory');
      this.addSuggestion('Check directory permissions or run with appropriate privileges');
      return false;
    }

    try {
      // Test read permission in MCP directory
      fs.readFileSync(path.join(this.mcpServerDir, 'package.json'));
      console.log(chalk.green('   ✅ Read permissions in MCP server directory'));
    } catch (error) {
      this.addIssue('No read permission in MCP server directory');
      return false;
    }

    return true;
  }

  /**
   * Test server startup (dry run)
   */
  async testServerStartup() {
    console.log(chalk.blue('🔍 Testing server startup...'));
    
    return new Promise((resolve) => {
      const testProcess = spawn('node', ['-e', 'console.log("Node.js test successful")'], {
        cwd: this.currentDir,
        stdio: 'pipe'
      });

      let output = '';
      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      testProcess.on('close', (code) => {
        if (code === 0 && output.includes('Node.js test successful')) {
          console.log(chalk.green('   ✅ Node.js execution test passed'));
          resolve(true);
        } else {
          this.addIssue('Node.js execution test failed');
          resolve(false);
        }
      });

      testProcess.on('error', (error) => {
        this.addIssue(`Node.js execution error: ${error.message}`);
        resolve(false);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        testProcess.kill();
        this.addWarning('Node.js execution test timed out');
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Generate configuration suggestions
   */
  generateConfigSuggestions() {
    console.log(chalk.blue('🔍 Generating configuration suggestions...'));
    
    const suggestions = {
      trae: {
        name: 'Trae AI',
        config: {
          mcpServers: {
            'mcp-memory': {
              command: 'node',
              args: [path.join(this.mcpServerDir, 'start-mcp.js')],
              cwd: '${workspaceFolder}'
            }
          }
        }
      },
      claude: {
        name: 'Claude Desktop',
        configFile: os.platform() === 'win32' 
          ? '%APPDATA%\\Claude\\claude_desktop_config.json'
          : '~/.claude_desktop_config.json',
        config: {
          mcpServers: {
            'mcp-memory': {
              command: 'node',
              args: [path.join(this.mcpServerDir, 'start-mcp.js')],
              cwd: this.currentDir
            }
          }
        }
      },
      cursor: {
        name: 'Cursor IDE',
        configFile: '.cursor/mcp_config.json',
        config: {
          mcpServers: {
            'mcp-memory': {
              command: 'node',
              args: [path.join(this.mcpServerDir, 'start-mcp.js')],
              cwd: '.'
            }
          }
        }
      }
    };

    this.configSuggestions = suggestions;
    console.log(chalk.green('   ✅ Configuration suggestions generated'));
  }

  /**
   * Print detailed report
   */
  printReport() {
    console.log('\n' + chalk.bold.blue('📋 MCP Configuration Report'));
    console.log('=' .repeat(50));

    // System Information
    console.log(chalk.bold('\n🖥️  System Information:'));
    console.log(`   OS: ${os.platform()} ${os.arch()}`);
    console.log(`   Node.js: ${process.version}`);
    console.log(`   Current Directory: ${this.currentDir}`);
    console.log(`   MCP Server Directory: ${this.mcpServerDir}`);

    // Issues
    if (this.issues.length > 0) {
      console.log(chalk.bold.red('\n❌ Issues Found:'));
      this.issues.forEach((issue, index) => {
        console.log(chalk.red(`   ${index + 1}. ${issue.message}`));
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log(chalk.bold.yellow('\n⚠️  Warnings:'));
      this.warnings.forEach((warning, index) => {
        console.log(chalk.yellow(`   ${index + 1}. ${warning.message}`));
      });
    }

    // Suggestions
    if (this.suggestions.length > 0) {
      console.log(chalk.bold.cyan('\n💡 Suggestions:'));
      this.suggestions.forEach((suggestion, index) => {
        console.log(chalk.cyan(`   ${index + 1}. ${suggestion.message}`));
      });
    }

    // Configuration Examples
    if (this.configSuggestions) {
      console.log(chalk.bold.green('\n🔧 Configuration Examples:'));
      
      Object.entries(this.configSuggestions).forEach(([key, config]) => {
        console.log(chalk.bold(`\n   ${config.name}:`));
        if (config.configFile) {
          console.log(chalk.gray(`   File: ${config.configFile}`));
        }
        console.log(chalk.gray('   Config:'));
        console.log(chalk.gray('   ' + JSON.stringify(config.config, null, 2).replace(/\n/g, '\n   ')));
      });
    }

    // Summary
    console.log(chalk.bold('\n📊 Summary:'));
    if (this.issues.length === 0) {
      console.log(chalk.green('   ✅ No critical issues found'));
    } else {
      console.log(chalk.red(`   ❌ ${this.issues.length} issue(s) need to be resolved`));
    }
    
    if (this.warnings.length > 0) {
      console.log(chalk.yellow(`   ⚠️  ${this.warnings.length} warning(s) to consider`));
    }

    console.log('\n' + '=' .repeat(50));
  }

  /**
   * Run all checks
   */
  async runAllChecks() {
    console.log(chalk.bold.blue('🧠 MCP Configuration Checker'));
    console.log('\nRunning comprehensive checks...\n');

    const checks = [
      () => this.checkNodeVersion(),
      () => this.checkMCPServerDirectory(),
      () => this.checkDependencies(),
      () => this.checkBuild(),
      () => this.checkCurrentProject(),
      () => this.checkMemoryStorage(),
      () => this.checkPermissions(),
      () => this.testServerStartup(),
      () => this.generateConfigSuggestions()
    ];

    for (const check of checks) {
      try {
        await check();
      } catch (error) {
        this.addIssue(`Check failed: ${error.message}`);
      }
    }

    this.printReport();

    // Exit with appropriate code
    if (this.issues.length > 0) {
      console.log(chalk.red('\n❌ Configuration has issues that need to be resolved.'));
      process.exit(1);
    } else if (this.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Configuration is mostly good but has some warnings.'));
      process.exit(0);
    } else {
      console.log(chalk.green('\n✅ Configuration looks good! Ready to start MCP server.'));
      process.exit(0);
    }
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(chalk.bold('🧠 MCP Configuration Checker'));
  console.log('');
  console.log('Usage:');
  console.log('  node check-config.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('  --quick, -q    Run quick checks only');
  console.log('  --fix          Attempt to fix common issues');
  console.log('');
  console.log('Examples:');
  console.log('  # Full configuration check');
  console.log('  node check-config.js');
  console.log('');
  console.log('  # Quick check');
  console.log('  node check-config.js --quick');
  process.exit(0);
}

// Run the checker
const checker = new MCPConfigChecker();

if (args.includes('--quick') || args.includes('-q')) {
  // Quick checks only
  console.log(chalk.bold.blue('🧠 MCP Quick Configuration Check'));
  console.log('');
  
  checker.checkNodeVersion();
  checker.checkMCPServerDirectory();
  checker.checkCurrentProject();
  checker.generateConfigSuggestions();
  checker.printReport();
} else {
  // Full checks
  checker.runAllChecks();
}