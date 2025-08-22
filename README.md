# 🧠 MCP Memory Server

**A comprehensive Model Context Protocol (MCP) server that gives AI coding assistants memory, safety controls, and project awareness.**

## 🎯 What This Does

This server acts as a **"memory brain"** for AI coding assistants like Claude, Cursor, or Windsurf. It:

- 🧠 **Remembers** your coding sessions, decisions, and project context
- 🛡️ **Protects** critical files from accidental AI modifications
- 📝 **Tracks** all changes with automatic changelog generation
- ⚖️ **Enforces** approval workflows for high-risk code changes
- 🏷️ **Manages** AI metadata headers in your code files

## 🚀 Quick Start

### Option 1: Easy Install (Recommended)

**Windows:**
```bash
git clone <your-repo>
cd mcp-memory
install.bat
```

**Linux/Mac:**
```bash
git clone <your-repo>
cd mcp-memory
chmod +x install.sh
./install.sh
```

### Option 2: Manual Install

```bash
npm install
npm run build
npm start
```

## 🔧 Setup & Configuration

### 1. Automatic Project Detection

The MCP Memory Server automatically detects your project root by looking for common project indicators like:
- `package.json` (Node.js/npm projects)
- `.git` (Git repositories)
- `pyproject.toml` (Python projects)
- `Cargo.toml` (Rust projects)
- `go.mod` (Go projects)
- `pom.xml` (Maven projects)
- And many more...

Simply run the server from anywhere within your project directory:

**Windows:**
```cmd
npm start
```

**Linux/Mac:**
```bash
npm start
```

### 2. Configure Your AI Assistant

Add this to your AI assistant's configuration:

**For Claude Desktop:**
```json
{
  "mcpServers": {
    "mcp-memory": {
      "command": "node",
      "args": ["D:\\Development\\Projects\\AI\\MCP\\mcp-memory\\dist\\index.js"]
    }
  }
}
```

**Note:** The server will automatically detect and initialize your project when you start using it. No environment variables needed!

**For Cursor IDE:**
Add to `.cursorrules`:
```
Use MCP Memory Server for:
- Checking file permissions before modification
- Recording coding decisions and session progress
- Managing file approvals and changelog entries
```

## 🛠️ Available Tools

### 🧠 **Memory Management**
| Tool | Purpose | Example |
|------|---------|---------|
| `start_session` | Begin new coding session | `start_session("Add user authentication")` |
| `add_session_step` | Record completed work | `add_session_step("Created login API", ["auth.js"])` |
| `add_decision` | Log important choices | `add_decision("database", "PostgreSQL", "Better JSON support")` |
| `get_project_memory` | Get current session state | Returns full project context |

### 🛡️ **Safety & Approvals**
| Tool | Purpose | Example |
|------|---------|---------|
| `check_before_modification` | Verify file can be changed | `check_before_modification("src/auth.js")` |
| `set_file_approval` | Grant modification permission | `set_file_approval("auth.js", "devApproved", "john@company.com")` |
| `get_file_approval_status` | Check current approvals | Returns approval status object |
| `get_modification_actions` | Get post-change requirements | Returns required actions after editing |

### 🏷️ **Metadata Management**
| Tool | Purpose | Example |
|------|---------|---------|
| `parse_file_metadata` | Read @ai-metadata headers | `parse_file_metadata("src/auth.js")` |
| `update_file_metadata` | Modify file metadata | `update_file_metadata("auth.js", {stability: "stable"})` |
| `find_files_with_metadata` | Find all tracked files | `find_files_with_metadata("*.js")` |

### 📝 **Changelog & History**
| Tool | Purpose | Example |
|------|---------|---------|
| `add_changelog_entry` | Record changes | `add_changelog_entry("Added OAuth", ["auth.js"], "added")` |
| `get_file_changelog` | Get file history | `get_file_changelog("src/auth.js")` |
| `get_recent_changes` | Get recent activity | `get_recent_changes(7)` - last 7 days |

## 🏷️ AI Metadata Headers Explained

Add these special comments to your files to control how AI assistants can modify them:

### **Basic Example**
```javascript
/**
 * @ai-metadata
 * @class: UserService
 * @description: Handles user authentication and registration
 * @stability: stable
 * @edit-permissions: method-specific
 * @method-permissions: { "login": "read-only", "register": "allow" }
 * @breaking-changes-risk: high
 * @review-required: true
 * @ai-context: "Critical auth system - login method must not be modified"
 */

class UserService {
  // This method is protected from AI modification
  async login(email, password) { /* ... */ }

  // This method can be modified by AI
  async register(userData) { /* ... */ }
}
```

### **Permission Levels**
| Permission | What AI Can Do | Use Case |
|------------|----------------|----------|
| `full` | Modify anything | New/draft files |
| `add-only` | Only add new code | Stable files that can grow |
| `read-only` | Cannot modify at all | Critical/legacy files |
| `method-specific` | Check individual methods | Mixed permission files |

### **Risk Levels**
| Risk | When AI Modifies | Required Approval |
|------|------------------|-------------------|
| `high` | Must ask permission first | Developer approval |
| `medium` | Shows warning | User confirmation |
| `low` | Proceeds normally | None |

### **Complete Metadata Template**
```javascript
/**
 * @ai-metadata
 * @class: YourClassName
 * @description: What this file does
 * @last-update: 2024-08-21T10:30:00Z
 * @last-editor: developer@example.com
 * @stability: stable | experimental | deprecated
 * @edit-permissions: full | add-only | read-only | method-specific
 * @method-permissions: { "methodName": "read-only" | "allow" | "restricted" }
 * @breaking-changes-risk: high | medium | low
 * @review-required: true | false
 * @ai-context: "Important context for AI to understand"
 * @dependencies: ["file1.js", "file2.js"]
 * @tests: ["./tests/file.test.js"]
 */
```

## 🎬 How It Works

### **1. AI Starts Coding Session**
```
AI: "I need to add user authentication"
→ Calls: start_session("Add user authentication")
→ Server: Creates session, tracks task
```

### **2. AI Wants to Modify File**
```
AI: "I'll modify src/auth.js"
→ Calls: check_before_modification("src/auth.js")
→ Server: Checks @ai-metadata, returns permission
→ AI: Proceeds only if allowed
```

### **3. AI Makes Changes**
```
AI: Modifies the file
→ Calls: get_modification_actions("src/auth.js")
→ Server: Returns required actions (update changelog, invalidate approvals, etc.)
→ AI: Executes all required actions
```

### **4. Session Tracking**
```
AI: "I completed the login feature"
→ Calls: add_session_step("Implemented login", ["auth.js", "login.js"])
→ Server: Records progress in project memory
```

## 🔍 Real-World Example

**Scenario**: AI wants to modify a critical authentication file

```javascript
// File: src/auth.js has this metadata:
/**
 * @ai-metadata
 * @edit-permissions: method-specific
 * @method-permissions: { "login": "read-only", "register": "allow" }
 * @breaking-changes-risk: high
 * @review-required: true
 */
```

**What happens:**
1. AI calls `check_before_modification("src/auth.js")`
2. Server responds: `{ allowed: false, reasons: ["login method is read-only"] }`
3. AI tells user: "❌ Cannot modify login method - it's protected"
4. AI suggests: "I can modify the register method or create a new file"

## 🛠️ Development

```bash
# Development mode with auto-reload
npm run dev

# Build TypeScript
npm run build

# Watch mode for development
npm run watch

# Start production server
npm start
```

## 📁 Project Structure

```
mcp-memory/
├── 📄 install.bat/install.sh    # Easy installation scripts
├── 📄 AI_CODER_RULES.md        # Complete integration guide
├── 📄 README.md                # This file
├── 📂 src/                     # TypeScript source code
│   ├── index.ts                # Main MCP server
│   ├── types.ts                # TypeScript interfaces
│   ├── memory-manager.ts       # Session & memory management
│   ├── changelog-manager.ts    # Automatic changelog generation
│   ├── metadata-parser.ts      # Parse @ai-metadata headers
│   └── rule-engine.ts          # Permission & approval rules
├── 📂 dist/                    # Compiled JavaScript (auto-generated)
├── 📂 example-project/         # Created by install scripts
│   ├── src/UserService.js      # Example file with metadata
│   └── .ai-memory/             # Where server stores data
└── 📂 node_modules/            # Dependencies
```

## 🚨 Important Notes

### **Do I Need the Install Scripts?**

**YES, use them!** The install scripts (`install.bat` for Windows, `install.sh` for Linux/Mac) do more than just `npm install`:

✅ **What install scripts do:**
- Install dependencies (`npm install`)
- Build TypeScript (`npm run build`)
- Create example project with sample metadata
- Create proper directory structure
- Show you exactly how to configure everything

✅ **What manual install misses:**
- No example files to learn from
- No sample metadata headers
- No automatic project setup
- No example project structure

**Recommendation**: Always use the install scripts for the best experience!

## 🔧 Troubleshooting

### **Server Won't Start**
```bash
# Check if TypeScript compiled
npm run build

# Make sure you're in a valid project directory
pwd  # Check current directory
ls   # Look for project indicators (package.json, .git, etc.)

# Start with debug info
DEBUG=* npm start
```

### **AI Assistant Can't Connect**
1. Make sure server is running (`npm start`)
2. Check MCP configuration in your AI assistant
3. Verify the server detected the correct project root (check console output)
4. Check firewall/antivirus isn't blocking the connection

### **Permission Errors**
```bash
# Check file metadata
node -e "
const { MetadataParser } = require('./dist/metadata-parser.js');
const parser = new MetadataParser('.');
parser.parseFileMetadata('your-file.js').then(console.log);
"
```

### **Memory Files Not Created**
The server creates a `.ai-memory/` folder in your detected project root. If it's missing:
1. Check the detected project directory is writable
2. Check disk space
3. Run with elevated permissions if needed
4. Verify the server detected the correct project root from console output

## 🎯 Next Steps

### **1. Try the Example Project**
After running the install script:
```bash
cd example-project
# Look at src/UserService.js to see metadata in action
# The .ai-memory/ folder shows how data is stored
```

### **2. Add Metadata to Your Files**
Start with one important file:
```javascript
/**
 * @ai-metadata
 * @description: What this file does
 * @edit-permissions: full
 * @breaking-changes-risk: low
 */
```

### **3. Configure Your AI Assistant**
- **Claude Desktop**: Add to MCP servers config
- **Cursor**: Add rules to `.cursorrules` file
- **Windsurf**: Configure in settings
- **Other**: See `AI_CODER_RULES.md` for complete guide

### **4. Start a Coding Session**
Tell your AI assistant:
```
"Start a new coding session for implementing user authentication.
Use the MCP memory server to track our progress."
```

## 📚 Additional Resources

- 📖 **[AI_CODER_RULES.md](./AI_CODER_RULES.md)** - Complete integration guide for AI assistants
- 🔧 **[example-project/](./example-project/)** - Working example with sample metadata
- 💻 **[src/types.ts](./src/types.ts)** - All TypeScript interfaces and data structures
- 🧪 **Test the server**: Use any MCP-compatible client to test the tools

## 🤝 Contributing

Found a bug or want to add features?
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📄 License

MIT License - feel free to use in your projects!

---

**🎉 You're all set!** Your AI coding assistant now has memory, safety controls, and project awareness. Happy coding! 🚀
