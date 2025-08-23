# MCP Client Configuration Guide

This guide shows how to configure different AI coding assistants to use the MCP Memory Server correctly.

## 🎯 Key Principles

1. **Always run the server from your TARGET PROJECT directory**
2. **Use the smart startup script for best results**
3. **Verify the server detects the correct project root**
4. **Check that `.ai-memory` folder is created in your project**

---

## 🚀 Quick Start (Recommended)

### Step 1: Navigate to Your Project
```bash
cd /path/to/your/project
```

### Step 2: Start MCP Server with Smart Script
```bash
# Option A: From your project directory
node /path/to/mcp-memory/start-mcp.js

# Option B: From MCP directory (will detect your current project)
cd /path/to/mcp-memory
node start-mcp.js

# Option C: Using npm script
cd /path/to/mcp-memory
npm run start-smart
```

### Step 3: Verify Configuration
```bash
# Check configuration without starting
node /path/to/mcp-memory/start-mcp.js --config
```

---

## 🔧 IDE-Specific Configurations

### Trae AI (Current Setup)

**Recommended Configuration:**
```json
{
  "mcpServers": {
    "mcp-memory": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-memory/start-mcp.js"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

**Alternative (Direct):**
```json
{
  "mcpServers": {
    "mcp-memory": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-memory/dist/index.js"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

### Claude Desktop

**Configuration File:** `~/.claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "mcp-memory": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-memory/start-mcp.js"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

**Windows Example:**
```json
{
  "mcpServers": {
    "mcp-memory": {
      "command": "node",
      "args": ["D:\\Development\\Projects\\AI\\MCP\\mcp-memory\\start-mcp.js"],
      "cwd": "D:\\Development\\Projects\\MyProject"
    }
  }
}
```

### Cursor IDE

**Configuration File:** `.cursor/mcp_config.json` in your project root

```json
{
  "mcpServers": {
    "mcp-memory": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-memory/start-mcp.js"],
      "cwd": "."
    }
  }
}
```

**Global Configuration:** `~/.cursor/mcp_config.json`

```json
{
  "mcpServers": {
    "mcp-memory": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-memory/start-mcp.js"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

### Windsurf IDE

**Configuration File:** `windsurf.config.js` in your project root

```javascript
module.exports = {
  mcpServers: {
    'mcp-memory': {
      command: 'node',
      args: ['/absolute/path/to/mcp-memory/start-mcp.js'],
      cwd: process.cwd()
    }
  },
  aiRules: {
    beforeModification: 'check_before_modification',
    afterModification: 'get_modification_actions',
    mcpServer: 'mcp-memory',
    enforceApprovals: true,
    autoChangelog: true
  }
};
```

### Continue.dev

**Configuration File:** `.continue/config.json`

```json
{
  "mcpServers": [
    {
      "name": "mcp-memory",
      "command": "node",
      "args": ["/absolute/path/to/mcp-memory/start-mcp.js"],
      "cwd": "."
    }
  ]
}
```

### Codeium

**Configuration File:** `.codeium/mcp.json`

```json
{
  "servers": {
    "mcp-memory": {
      "command": ["node", "/absolute/path/to/mcp-memory/start-mcp.js"],
      "workingDirectory": "."
    }
  }
}
```

---

## 🛠️ Advanced Configurations

### Development Mode (Auto-rebuild)

```json
{
  "mcpServers": {
    "mcp-memory-dev": {
      "command": "npm",
      "args": ["run", "watch"],
      "cwd": "/absolute/path/to/mcp-memory",
      "env": {
        "TARGET_PROJECT": "${workspaceFolder}"
      }
    }
  }
}
```

### Multiple Projects

```json
{
  "mcpServers": {
    "mcp-memory-project1": {
      "command": "node",
      "args": ["/path/to/mcp-memory/start-mcp.js"],
      "cwd": "/path/to/project1"
    },
    "mcp-memory-project2": {
      "command": "node",
      "args": ["/path/to/mcp-memory/start-mcp.js"],
      "cwd": "/path/to/project2"
    }
  }
}
```

### With Environment Variables

```json
{
  "mcpServers": {
    "mcp-memory": {
      "command": "node",
      "args": ["/path/to/mcp-memory/start-mcp.js"],
      "cwd": "${workspaceFolder}",
      "env": {
        "DEBUG": "mcp-memory-server:*",
        "NODE_ENV": "development",
        "MCP_LOG_LEVEL": "verbose"
      }
    }
  }
}
```

---

## 🔍 Troubleshooting

### Problem: Server connects to wrong project

**Solution:**
1. Use the smart startup script: `node start-mcp.js`
2. Ensure `cwd` is set to your target project directory
3. Check server logs for "Detected project root" message

### Problem: Memory not saved to project

**Check:**
```bash
# Verify project root detection
node /path/to/mcp-memory/start-mcp.js --config

# Check if .ai-memory folder exists in your project
ls -la /path/to/your/project/.ai-memory
```

**Fix:**
```bash
# Stop current server and restart with correct directory
cd /path/to/your/project
node /path/to/mcp-memory/start-mcp.js
```

### Problem: Server won't start

**Check build:**
```bash
cd /path/to/mcp-memory
npm run build
```

**Check dependencies:**
```bash
cd /path/to/mcp-memory
npm install
```

### Problem: Permission errors

**Windows:**
```powershell
# Run as administrator or check file permissions
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Unix/macOS:**
```bash
# Make script executable
chmod +x /path/to/mcp-memory/start-mcp.js
```

---

## 📋 Configuration Validation

### Test Your Configuration

```bash
# 1. Test server startup
node /path/to/mcp-memory/start-mcp.js --config

# 2. Test from your project directory
cd /path/to/your/project
node /path/to/mcp-memory/start-mcp.js

# 3. Check memory storage location
ls -la .ai-memory/
```

### Expected Output

```
🧠 MCP Memory Server Startup

✅ MCP server directory validated
🎯 Target project detected: /path/to/your/project
📁 Project indicator: package.json

📋 MCP Server Configuration:
   Server Location: /path/to/mcp-memory
   Target Project: /path/to/your/project
   Memory Storage: /path/to/your/project/.ai-memory

✅ MCP server build is up to date
🚀 Starting MCP Memory Server...
```

---

## 🎯 Best Practices

### 1. **Always Use Absolute Paths**
```json
// ✅ Good
"args": ["/absolute/path/to/mcp-memory/start-mcp.js"]

// ❌ Bad
"args": ["./start-mcp.js"]
```

### 2. **Set Correct Working Directory**
```json
// ✅ Good - Server runs from your project
"cwd": "${workspaceFolder}"

// ❌ Bad - Server runs from MCP directory
"cwd": "/path/to/mcp-memory"
```

### 3. **Use Smart Startup Script**
```json
// ✅ Good - Validates configuration
"args": ["/path/to/mcp-memory/start-mcp.js"]

// ⚠️ OK - Direct but no validation
"args": ["/path/to/mcp-memory/dist/index.js"]
```

### 4. **Test Configuration**
```bash
# Always test before using with AI
node /path/to/mcp-memory/start-mcp.js --config
```

### 5. **Monitor Server Logs**
```bash
# Look for these key messages:
# ✅ "Detected project root: /your/project"
# ✅ "Initialized .ai-memory folder"
# ✅ "MCP Memory Server ready"
```

---

## 🔄 Migration from Old Setup

If you were using the old configuration:

### Step 1: Stop Current Server
```bash
# Stop any running MCP servers
pkill -f "mcp-memory"
```

### Step 2: Update Configuration
```json
// Old
{
  "command": "node",
  "args": ["/path/to/mcp-memory/dist/index.js"]
}

// New
{
  "command": "node",
  "args": ["/path/to/mcp-memory/start-mcp.js"],
  "cwd": "${workspaceFolder}"
}
```

### Step 3: Test New Configuration
```bash
node /path/to/mcp-memory/start-mcp.js --config
```

### Step 4: Restart AI Client
Restart your AI coding assistant to pick up the new configuration.

---

## 📞 Support

If you encounter issues:

1. **Check the logs** - Server outputs detailed information
2. **Validate paths** - Ensure all paths are absolute and correct
3. **Test manually** - Run the startup script directly
4. **Check permissions** - Ensure Node.js can access all directories
5. **Verify build** - Run `npm run build` in MCP directory

For more help, check the main README.md and AI_CODER_RULES.md files.