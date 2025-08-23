# MCP Memory Server - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying and optimizing the MCP Memory Server to ensure it runs correctly and performs optimally across different AI coding environments.

## Quick Start

### 1. Installation

```bash
# Clone or navigate to the mcp-memory project
cd path/to/mcp-memory

# Install dependencies
npm install

# Build the server
npm run build

# Test the configuration
npm run check-config
```

### 2. Smart Startup

**Always use the smart startup script** to ensure proper directory detection:

```bash
# From your target project directory
node /path/to/mcp-memory/start-mcp.js

# Or using npm script from mcp-memory directory
npm run start-smart
```

## Directory Structure Requirements

### MCP Server Directory
```
mcp-memory/
├── dist/                 # Compiled TypeScript
├── src/                  # Source code
├── package.json          # Dependencies and scripts
├── start-mcp.js         # Smart startup script
├── check-config.js      # Configuration checker
└── mcp-client-configs.md # Client configuration examples
```

### Target Project Directory
```
your-project/
├── .ai-memory/          # Created automatically
│   ├── project-memory.json
│   └── *.backup.json    # Automatic backups
├── package.json         # Project indicators
├── .git/               # Git repository
└── src/                # Your project files
```

## Best Practices

### 1. Project Root Detection

The MCP server automatically detects project roots by looking for:
- `package.json` (Node.js projects)
- `.git` directory (Git repositories)
- `pyproject.toml`, `requirements.txt` (Python projects)
- `Cargo.toml` (Rust projects)
- `go.mod` (Go projects)
- `tsconfig.json` (TypeScript projects)
- `yarn.lock`, `pnpm-lock.yaml` (Package managers)

**Recommendation**: Ensure your project has at least one of these indicators.

### 2. Directory Permissions

```bash
# Ensure proper permissions (Unix/Linux/macOS)
chmod 755 /path/to/mcp-memory
chmod 644 /path/to/mcp-memory/package.json

# For Windows, ensure the user has read/write access
# to both the MCP server directory and target project
```

### 3. Memory Management

- The `.ai-memory` directory stores:
  - Project context and metadata
  - Session history and decisions
  - File approval states
  - Automatic backups

- **Backup Strategy**: The server automatically creates backups:
  - `project-memory.backup.{timestamp}.json` for incomplete files
  - `project-memory.corrupted.{timestamp}.json` for corrupted files

### 4. Error Recovery

The server includes automatic recovery mechanisms:
- **Validation**: Checks file structure and permissions
- **Backup**: Preserves existing data before modifications
- **Recovery**: Creates minimal working setup if initialization fails
- **Logging**: Comprehensive error reporting with colored output

## Client Configuration

### Trae AI

```json
{
  "mcpServers": {
    "mcp-memory": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-memory/start-mcp.js"],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```

### Claude Desktop

```json
{
  "mcpServers": {
    "mcp-memory": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-memory/start-mcp.js"],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```

### Cursor IDE

```json
{
  "mcpServers": {
    "mcp-memory": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-memory/start-mcp.js"],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```

## Performance Optimization

### 1. Node.js Configuration

```bash
# Recommended Node.js version
node --version  # Should be 18.0.0 or higher

# For large projects, increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```

### 2. File System Optimization

- **SSD Storage**: Place both MCP server and projects on SSD for faster I/O
- **Path Length**: Keep paths under 260 characters (Windows limitation)
- **File Permissions**: Ensure consistent read/write permissions

### 3. Memory Usage

- **Session Cleanup**: Old sessions are automatically archived
- **File History**: Limited to prevent excessive memory usage
- **Backup Retention**: Automatic cleanup of old backup files

## Troubleshooting

### 1. Configuration Checker

```bash
# Run comprehensive diagnostics
npm run check-config

# Quick validation only
npm run check-config-quick
```

### 2. Common Issues

**Server won't start**:
```bash
# Check Node.js version
node --version

# Rebuild the server
npm run build

# Check for TypeScript errors
npm run dev
```

**Wrong project directory**:
```bash
# Verify current working directory
pwd  # Unix/Linux/macOS
echo %cd%  # Windows

# Use absolute paths in client configuration
# Always set 'cwd' to your target project directory
```

**Permission errors**:
```bash
# Check directory permissions
ls -la .ai-memory/  # Unix/Linux/macOS
dir .ai-memory\     # Windows

# Fix permissions if needed
chmod 755 .ai-memory/
chmod 644 .ai-memory/project-memory.json
```

**Memory file corruption**:
- The server automatically detects and recovers from corrupted files
- Backup files are created before any modifications
- Check console output for recovery messages

### 3. Debug Mode

```bash
# Enable verbose logging
DEBUG=mcp-memory-server:* npm run dev

# Or set environment variable
export DEBUG=mcp-memory-server:*
npm start
```

### 4. Log Analysis

The server provides colored console output:
- 🔧 **Blue**: Initialization and setup
- ✅ **Green**: Successful operations
- ⚠️ **Yellow**: Warnings and recoverable issues
- ❌ **Red**: Errors requiring attention
- 📝 **Standard**: Information and progress

## Security Considerations

### 1. File Access

- Server only accesses files within the detected project root
- Path traversal attacks are prevented through validation
- No access to system files or parent directories

### 2. Data Storage

- All data stored in `.ai-memory` directory within project
- No external network connections required
- Sensitive data should not be stored in memory files

### 3. Permissions

- Follow principle of least privilege
- Regular users should have read/write access to project directories
- No administrative privileges required

## Advanced Configuration

### 1. Custom Project Indicators

To add custom project detection logic, modify `detectProjectRoot()` in `src/index.ts`:

```typescript
const indicators = [
  'package.json',
  '.git',
  'your-custom-file.config'
];
```

### 2. Memory Retention Policy

Configure session and backup retention in `src/memory-manager.ts`:

```typescript
const MAX_SESSIONS = 50;
const BACKUP_RETENTION_DAYS = 30;
```

### 3. Custom Validation Rules

Add project-specific validation in `validateProjectRoot()`:

```typescript
// Check for required project structure
if (!await fs.pathExists(path.join(projectRoot, 'src'))) {
  throw new Error('Project must have src/ directory');
}
```

## Deployment Checklist

- [ ] Node.js 18+ installed
- [ ] MCP server built (`npm run build`)
- [ ] Configuration validated (`npm run check-config`)
- [ ] Client configuration uses absolute paths
- [ ] Client configuration sets correct `cwd`
- [ ] Target project has project indicators
- [ ] Directory permissions are correct
- [ ] Smart startup script is used
- [ ] Error recovery tested
- [ ] Backup strategy verified

## Support and Maintenance

### 1. Regular Maintenance

```bash
# Update dependencies
npm update

# Rebuild after updates
npm run build

# Validate configuration
npm run check-config
```

### 2. Monitoring

- Monitor `.ai-memory` directory size
- Check for excessive backup files
- Review error logs regularly
- Validate project memory integrity

### 3. Backup Strategy

```bash
# Manual backup of project memory
cp .ai-memory/project-memory.json .ai-memory/manual-backup-$(date +%Y%m%d).json

# Restore from backup if needed
cp .ai-memory/project-memory.backup.{timestamp}.json .ai-memory/project-memory.json
```

## Version Compatibility

| MCP Server Version | Node.js | TypeScript | MCP SDK |
|-------------------|---------|------------|----------|
| 1.0.x             | 18+     | 5.0+       | Latest   |
| 0.9.x             | 16+     | 4.5+       | 0.5+     |

## Contributing

When contributing to deployment improvements:

1. Test across multiple operating systems
2. Validate with different AI coding assistants
3. Ensure backward compatibility
4. Update documentation and examples
5. Add appropriate error handling and recovery

---

**Remember**: The MCP Memory Server is designed to be smart and self-recovering. When in doubt, use the configuration checker and smart startup script to diagnose and resolve issues automatically.