#!/usr/bin/env node

/**
 * CLI tool for testing MCP Memory Server functionality
 * Usage: node cli-test.js [command] [args...]
 */

import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs-extra';
import { FolderMapper } from './dist/folder-mapper.js';
import { MemoryManager } from './dist/memory-manager.js';

const commands = {
  'test-memory': testMemorySystem,
  'generate-map': generateSingleMap,
  'generate-all-maps': generateAllMaps,
  'list-maps': listAllMaps,
  'validate-maps': validateAllMaps,
  'start-session': startTestSession,
  'help': showHelp
};

async function main() {
  const [,, command, ...args] = process.argv;
  
  if (!command || command === 'help') {
    showHelp();
    return;
  }

  const handler = commands[command];
  if (!handler) {
    console.error(chalk.red(`❌ Unknown command: ${command}`));
    showHelp();
    process.exit(1);
  }

  try {
    await handler(...args);
  } catch (error) {
    console.error(chalk.red('❌ Command failed:'), error);
    process.exit(1);
  }
}

function showHelp() {
  console.log(chalk.blue('🛠️  MCP Memory Server CLI Test Tool\n'));
  console.log(chalk.yellow('Commands:'));
  console.log('  test-memory              Test memory system functionality');
  console.log('  generate-map <folder>    Generate _map.md for specific folder');
  console.log('  generate-all-maps        Generate _map.md for all folders');
  console.log('  list-maps               List all existing _map.md files');
  console.log('  validate-maps           Check if maps are up-to-date');
  console.log('  start-session <task>    Start a test session');
  console.log('  help                    Show this help');
  console.log();
  console.log(chalk.blue('Examples:'));
  console.log('  node cli-test.js generate-map src/services');
  console.log('  node cli-test.js start-session "Testing folder mapping"');
  console.log('  node cli-test.js generate-all-maps');
}

async function testMemorySystem() {
  console.log(chalk.blue('🧪 Testing Memory System\n'));
  
  const projectRoot = process.cwd();
  const memoryManager = new MemoryManager(projectRoot);
  
  // Test memory creation and retrieval
  const memory = await memoryManager.getProjectMemory();
  console.log(chalk.green('✅ Memory system working'));
  console.log(chalk.blue('📋 Project info:'));
  console.log(`   Name: ${memory.projectContext.name}`);
  console.log(`   Current task: ${memory.currentSession.task}`);
  console.log(`   Completed steps: ${memory.currentSession.completedSteps.length}`);
  
  // Test session step
  await memoryManager.addSessionStep(
    'CLI test completed',
    ['cli-test.js'],
    'Testing memory functionality via CLI'
  );
  
  console.log(chalk.green('✅ Session step added successfully'));
}

async function generateSingleMap(folderPath) {
  if (!folderPath) {
    console.error(chalk.red('❌ Please provide a folder path'));
    console.log(chalk.blue('Usage: node cli-test.js generate-map src/services'));
    return;
  }

  console.log(chalk.blue(`🗺️  Generating map for: ${folderPath}\n`));
  
  const projectRoot = process.cwd();
  const folderMapper = new FolderMapper(projectRoot);
  
  const fullPath = path.resolve(folderPath);
  
  if (!await fs.pathExists(fullPath)) {
    console.error(chalk.red(`❌ Folder not found: ${fullPath}`));
    return;
  }

  const folderMap = await folderMapper.generateFolderMap(fullPath);
  
  console.log(chalk.green(`✅ Map generated for ${folderMap.folderName}`));
  console.log(chalk.blue(`📁 Files analyzed: ${folderMap.files.length}`));
  console.log(chalk.blue(`🏗️  Classes: ${folderMap.totalClasses}`));
  console.log(chalk.blue(`📝 Interfaces: ${folderMap.totalInterfaces}`));
  console.log(chalk.blue(`⚡ Functions: ${folderMap.totalFunctions}`));
  
  const mapPath = path.join(fullPath, '_map.md');
  console.log(chalk.yellow(`📄 Map file created: ${path.relative(projectRoot, mapPath)}`));
}

async function generateAllMaps() {
  console.log(chalk.blue('🗺️  Generating maps for all folders\n'));
  
  const projectRoot = process.cwd();
  const folderMapper = new FolderMapper(projectRoot);
  
  await folderMapper.generateAllFolderMaps();
  
  console.log(chalk.green('✅ All folder maps generated successfully'));
}

async function listAllMaps() {
  console.log(chalk.blue('📋 Listing all _map.md files\n'));
  
  const projectRoot = process.cwd();
  const folderMapper = new FolderMapper(projectRoot);
  
  const mapFiles = await folderMapper.findAllMapFiles();
  
  if (mapFiles.length === 0) {
    console.log(chalk.yellow('📄 No _map.md files found'));
    console.log(chalk.blue('💡 Run "generate-all-maps" to create them'));
    return;
  }

  console.log(chalk.green(`📄 Found ${mapFiles.length} map files:`));
  mapFiles.forEach(mapFile => {
    const relativePath = path.relative(projectRoot, mapFile);
    console.log(chalk.blue(`   ${relativePath}`));
  });
}

async function validateAllMaps() {
  console.log(chalk.blue('✅ Validating all maps\n'));
  
  const projectRoot = process.cwd();
  const folderMapper = new FolderMapper(projectRoot);
  
  const validation = await folderMapper.validateAllMaps();
  
  if (validation.valid) {
    console.log(chalk.green('✅ All maps are up-to-date'));
  } else {
    console.log(chalk.yellow(`⚠️  ${validation.outdatedMaps.length} maps need updating:`));
    validation.outdatedMaps.forEach(mapFile => {
      const relativePath = path.relative(projectRoot, mapFile);
      console.log(chalk.yellow(`   ${relativePath}`));
    });
    console.log(chalk.blue('\n💡 Run "generate-all-maps" to update them'));
  }
}

async function startTestSession(task) {
  if (!task) {
    console.error(chalk.red('❌ Please provide a task description'));
    console.log(chalk.blue('Usage: node cli-test.js start-session "Your task description"'));
    return;
  }

  console.log(chalk.blue(`🚀 Starting test session: "${task}"\n`));
  
  const projectRoot = process.cwd();
  const memoryManager = new MemoryManager(projectRoot);
  
  const sessionId = await memoryManager.startNewSession(task);
  
  console.log(chalk.green(`✅ Session started: ${sessionId}`));
  console.log(chalk.blue('📋 You can now:'));
  console.log(chalk.blue('   - Generate folder maps'));
  console.log(chalk.blue('   - Record session steps'));
  console.log(chalk.blue('   - Make important decisions'));
}

// Run the CLI
main();
