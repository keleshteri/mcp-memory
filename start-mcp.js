#!/usr/bin/env node
/**
 * Smart MCP Server Startup Script
 * Ensures the server runs from the correct directory and validates configuration
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MCPServerStarter {
  constructor() {
    this.mcpServerDir = __dirname;
    this.targetProjectDir = process.cwd();
  }

  /**
   * Validates that we're in the correct MCP server directory
   */
  validateMCPServerDirectory() {
    const packageJsonPath = path.join(this.mcpServerDir, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.error(chalk.red('❌ Error: package.json not found in MCP server directory'));
      console.error(chalk.yellow(`Expected: ${packageJsonPath}`));
      process.exit(1);
    }

    const packageJson = fs.readJsonSync(packageJsonPath);
    if (packageJson.name !== 'mcp-memory-server') {
      console.error(chalk.red('❌ Error: Not in the correct MCP server directory'));
      console.error(chalk.yellow(`Found package: ${packageJson.name}`));
      console.error(chalk.yellow(`Expected: mcp-memory-server`));
      process.exit(1);
    }

    console.log(chalk.green('✅ MCP server directory validated'));
    return true;
  }

  /**
   * Validates the target project directory
   */
  validateTargetProject() {
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
      const indicatorPath = path.join(this.targetProjectDir, indicator);
      if (fs.existsSync(indicatorPath)) {
        foundIndicator = indicator;
        break;
      }
    }

    if (foundIndicator) {
      console.log(chalk.green(`🎯 Target project detected: ${this.targetProjectDir}`));
      console.log(chalk.blue(`📁 Project indicator: ${foundIndicator}`));
    } else {
      console.log(chalk.yellow(`⚠️  No project indicators found in: ${this.targetProjectDir}`));
      console.log(chalk.yellow('   Server will use current directory as project root'));
    }

    return true;
  }

  /**
   * Checks if the server is built
   */
  checkBuild() {
    const distPath = path.join(this.mcpServerDir, 'dist', 'index.js');
    
    if (!fs.existsSync(distPath)) {
      console.log(chalk.yellow('🔨 Building MCP server...'));
      return this.buildServer();
    }

    // Check if source is newer than build
    const srcPath = path.join(this.mcpServerDir, 'src', 'index.ts');
    const srcStats = fs.statSync(srcPath);
    const distStats = fs.statSync(distPath);

    if (srcStats.mtime > distStats.mtime) {
      console.log(chalk.yellow('🔨 Source files updated, rebuilding...'));
      return this.buildServer();
    }

    console.log(chalk.green('✅ MCP server build is up to date'));
    return Promise.resolve();
  }

  /**
   * Builds the server
   */
  buildServer() {
    return new Promise((resolve, reject) => {
      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: this.mcpServerDir,
        stdio: 'inherit',
        shell: true
      });

      buildProcess.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green('✅ Build completed successfully'));
          resolve();
        } else {
          console.error(chalk.red(`❌ Build failed with code ${code}`));
          reject(new Error(`Build failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Starts the MCP server with proper working directory
   */
  startServer() {
    console.log(chalk.blue('🚀 Starting MCP Memory Server...'));
    console.log(chalk.gray(`   Server directory: ${this.mcpServerDir}`));
    console.log(chalk.gray(`   Working directory: ${this.targetProjectDir}`));
    console.log(chalk.gray('   Press Ctrl+C to stop'));
    console.log('');

    const serverProcess = spawn('node', ['dist/index.js'], {
      cwd: this.mcpServerDir, // Run from MCP server directory where dist/index.js exists
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        TARGET_PROJECT_PATH: this.targetProjectDir // Pass target project path as env var
      }
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n🛑 Stopping MCP server...'));
      serverProcess.kill('SIGINT');
      process.exit(0);
    });

    serverProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(chalk.red(`❌ MCP server exited with code ${code}`));
        process.exit(code);
      }
    });

    serverProcess.on('error', (error) => {
      console.error(chalk.red('❌ Failed to start MCP server:'));
      console.error(error.message);
      process.exit(1);
    });
  }

  /**
   * Shows configuration information
   */
  showConfiguration() {
    console.log(chalk.cyan('📋 MCP Server Configuration:'));
    console.log(chalk.gray(`   Server Location: ${this.mcpServerDir}`));
    console.log(chalk.gray(`   Target Project: ${this.targetProjectDir}`));
    console.log(chalk.gray(`   Memory Storage: ${path.join(this.targetProjectDir, '.ai-memory')}`));
    console.log('');
  }

  /**
   * Main startup routine
   */
  async start() {
    try {
      console.log(chalk.bold.blue('🧠 MCP Memory Server Startup'));
      console.log('');

      // Validate directories
      this.validateMCPServerDirectory();
      this.validateTargetProject();
      
      // Show configuration
      this.showConfiguration();
      
      // Ensure build is up to date
      await this.checkBuild();
      
      // Start the server
      this.startServer();
      
    } catch (error) {
      console.error(chalk.red('❌ Startup failed:'));
      console.error(error.message);
      process.exit(1);
    }
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(chalk.bold('🧠 MCP Memory Server Startup Script'));
  console.log('');
  console.log('Usage:');
  console.log('  node start-mcp.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('  --config, -c   Show configuration only');
  console.log('');
  console.log('Examples:');
  console.log('  # Start server for current project');
  console.log('  cd /path/to/your/project');
  console.log('  node /path/to/mcp-memory/start-mcp.js');
  console.log('');
  console.log('  # Start server from MCP directory');
  console.log('  cd /path/to/mcp-memory');
  console.log('  node start-mcp.js');
  process.exit(0);
}

if (args.includes('--config') || args.includes('-c')) {
  const starter = new MCPServerStarter();
  starter.showConfiguration();
  process.exit(0);
}

// Start the server
const starter = new MCPServerStarter();
starter.start();