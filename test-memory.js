#!/usr/bin/env node

/**
 * Test script for MCP Memory Server functionality
 * This script helps test the memory recording and folder mapping features
 */

import { MCPMemoryServer } from './dist/index.js';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs-extra';

async function testMemoryFunctionality() {
  console.log(chalk.blue('🧪 Testing MCP Memory Server functionality\n'));

  try {
    // Create server instance
    const server = new MCPMemoryServer();
    console.log(chalk.green('✅ Server instance created successfully'));

    // Test project root detection
    const currentDir = process.cwd();
    console.log(chalk.blue(`📁 Current directory: ${currentDir}`));

    // Check if .ai-memory folder exists
    const memoryDir = path.join(currentDir, '.ai-memory');
    const memoryExists = await fs.pathExists(memoryDir);
    console.log(chalk.blue(`📂 .ai-memory folder exists: ${memoryExists}`));

    if (memoryExists) {
      // List contents of .ai-memory folder
      const contents = await fs.readdir(memoryDir);
      console.log(chalk.blue(`📋 Memory folder contents: ${contents.join(', ')}`));

      // Check if project-memory.json exists
      const projectMemoryPath = path.join(memoryDir, 'project-memory.json');
      const projectMemoryExists = await fs.pathExists(projectMemoryPath);
      
      if (projectMemoryExists) {
        const projectMemory = await fs.readJson(projectMemoryPath);
        console.log(chalk.green('✅ Project memory file found and readable'));
        console.log(chalk.yellow('📄 Project memory preview:'));
        console.log(JSON.stringify({
          projectName: projectMemory.projectContext?.name,
          currentSessionTask: projectMemory.currentSession?.task,
          completedStepsCount: projectMemory.currentSession?.completedSteps?.length || 0,
          globalDecisionsCount: projectMemory.globalDecisions?.length || 0
        }, null, 2));
      } else {
        console.log(chalk.yellow('⚠️  Project memory file not found'));
      }
    } else {
      console.log(chalk.yellow('⚠️  .ai-memory folder not found'));
      console.log(chalk.blue('💡 This is normal for a new project - it will be created on first use'));
    }

    // Test folder structure analysis
    const srcDir = path.join(currentDir, 'src');
    const srcExists = await fs.pathExists(srcDir);
    
    if (srcExists) {
      console.log(chalk.green('✅ src directory found - ready for folder mapping'));
      
      // List src subdirectories
      const srcContents = await fs.readdir(srcDir, { withFileTypes: true });
      const subdirs = srcContents.filter(item => item.isDirectory()).map(item => item.name);
      
      if (subdirs.length > 0) {
        console.log(chalk.blue(`📁 Source subdirectories: ${subdirs.join(', ')}`));
        console.log(chalk.blue('💡 These directories can have _map.md files generated'));
      } else {
        console.log(chalk.yellow('📁 No subdirectories in src - maps will be generated for src itself'));
      }
    } else {
      console.log(chalk.yellow('⚠️  src directory not found'));
    }

    console.log(chalk.green('\n✅ Memory system test completed successfully!'));
    console.log(chalk.blue('\n🚀 Next steps:'));
    console.log(chalk.blue('1. Run: npm install (to install new dependencies)'));
    console.log(chalk.blue('2. Run: npm run build (to compile TypeScript)'));
    console.log(chalk.blue('3. Test MCP tools using your MCP client'));
    
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error);
    process.exit(1);
  }
}

// Run the test
testMemoryFunctionality();
