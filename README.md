# MCP Memory Server with Folder Mapping

A comprehensive MCP (Model Context Protocol) server that provides AI coding assistants with memory management, file approval tracking, changelog functionality, and **automatic folder mapping**.

## 🆕 New Features Added

### 📁 **Folder Mapping System**
Automatically generates `_map.md` files for each folder in your project, providing quick overviews of:
- Classes, interfaces, functions, and types
- Method signatures and parameters  
- File purposes and relationships
- Dependencies and test locations
- Risk assessments

This solves the problem of **code discoverability** - helping both AI agents and developers quickly understand what's available without diving into every file.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Test the System
```bash
node test-memory.js
```

### 3. Build the Project
```bash
npm run build
```

### 4. Run the MCP Server
```bash
npm start
```

## 🛠️ Available MCP Tools

### Memory Management
- `start_session(task)` - Start a new coding session
- `add_session_step(step, filesModified, description?)` - Record completed work
- `add_decision(key, value, reasoning)` - Record important decisions
- `get_project_memory()` - Get current project state

### File Approvals
- `set_file_approval(filePath, approvalType, approvedBy)` - Set approval status
- `get_file_approval_status(filePath)` - Check approval status
- `check_before_modification(filePath)` - Validate before changes
- `get_modification_actions(filePath)` - Get post-change actions

### 📁 **Folder Mapping (NEW)**
- `generate_folder_map(folderPath)` - Generate `_map.md` for specific folder
- `generate_all_folder_maps()` - Generate maps for all project folders
- `update_folder_map_if_needed(filePath)` - Update map if files changed
- `find_all_map_files()` - List all existing map files
- `validate_all_maps()` - Check if maps are up-to-date

### Metadata & Changelog
- `parse_file_metadata(filePath)` - Extract AI metadata from files
- `update_file_metadata(filePath, updates)` - Update file metadata
- `add_changelog_entry(...)` - Add changelog entry
- `get_recent_changes(days?)` - Get recent project changes

## 📋 Folder Map Example

When you run `generate_folder_map("src/services")`, it creates `src/services/_map.md`:

```markdown
# ⚙️ services Module Map

> **Purpose**: Business logic and external service integrations

## 📊 Quick Stats
- **Files**: 4
- **Classes**: 3
- **Interfaces**: 2
- **Functions**: 8

## 🗂️ Files Overview

### `user-service.ts`
**Purpose**: User management and authentication | **Risk**: medium

**CLASS**: `UserService`
- `authenticateUser(credentials)` - Validates user credentials
- `getUserProfile(userId)` - Retrieves user profile data
- `updateUserSettings(userId, settings)` - Updates user preferences

### `api-client.ts`
**Purpose**: HTTP client for external APIs | **Risk**: high

**CLASS**: `ApiClient`
- `get(url, options?)` - HTTP GET request
- `post(url, data, options?)` - HTTP POST request
- `handleError(error)` - Centralized error handling

## 🔗 Dependencies
- `../types/user-types.ts`
- `../utils/http-utils.ts`

## 🧪 Tests
- `tests/services/user-service.test.ts`
- `tests/services/api-client.test.ts`
```

## 🔧 Integration with Your Test Project

### For your Zendesk-ClickUp automation project:

1. **Navigate to your test project**:
   ```bash
   cd D:\Development\Projects\Products\zendesk-clickup-automation
   ```

2. **Copy the MCP server files** or **install as dependency**

3. **Generate folder maps**:
   ```bash
   # Using MCP client, call:
   generate_all_folder_maps()
   ```

4. **Your folder structure will get maps**:
   ```
   src/
   ├── agents/
   │   └── _map.md  ← Overview of all agent classes
   ├── services/
   │   └── _map.md  ← Service integrations overview  
   ├── types/
   │   └── _map.md  ← All TypeScript definitions
   └── utils/
       └── _map.md  ← Utility functions overview
   ```

## 🛡️ Memory Recording Fix

The memory recording issues have been fixed by:

1. **Ensuring directory creation** before all file operations
2. **Better error handling** with detailed logging
3. **Automatic retry logic** for file system operations
4. **Proper async/await** patterns throughout

## 💡 Benefits for AI Agents

### Before Folder Mapping:
- AI has to read every file to understand what's available
- Often creates duplicate functionality
- Slow to understand project structure
- Poor code reuse suggestions

### After Folder Mapping:
- **Instant project comprehension** from `_map.md` files
- **Prevents duplicate code** - AI sees what already exists  
- **Better suggestions** - AI knows available methods and classes
- **Faster development** - Quick navigation and understanding

## 📖 Usage in AI Workflows

### Typical AI Session:
```bash
# 1. Start a session
start_session("Add user authentication feature")

# 2. Generate/update maps to understand codebase
generate_all_folder_maps()

# 3. AI reads maps to understand existing code
# 4. AI writes new code using existing patterns

# 5. Record progress
add_session_step("Created UserAuth class", ["src/auth/user-auth.ts"], "Implemented JWT-based authentication")

# 6. Update relevant maps
update_folder_map_if_needed("src/auth/user-auth.ts")
```

## 🎯 Best Practices

### For AI Agents:
- Always read relevant `_map.md` files before suggesting new code
- Use `update_folder_map_if_needed()` after creating/modifying files
- Check existing functionality to avoid duplication

### For Developers:
- Review generated maps for accuracy
- Update maps when adding major new features
- Use maps for onboarding new team members

## 🔄 Auto-Update Strategy

Maps can be kept current by:
1. **File watchers** - Update when source files change
2. **Build integration** - Generate maps during build process
3. **Git hooks** - Update maps on commits
4. **CI/CD integration** - Validate maps in pipelines

## 🚨 Troubleshooting

### Memory Not Recording:
```bash
# Run the test script
node test-memory.js

# Check for errors in .ai-memory folder creation
# Ensure proper permissions on project directory
```

### Maps Not Generating:
```bash
# Check TypeScript parsing dependencies
npm install @typescript-eslint/typescript-estree

# Verify src directory exists
# Check file permissions
```

### MCP Connection Issues:
```bash
# Rebuild the project
npm run build

# Check MCP client configuration
# Verify server is running on correct port
```

## 📚 Next Steps

1. **Test the system** with your Zendesk-ClickUp project
2. **Generate initial maps** to see the folder mapping in action
3. **Integrate with your AI workflow** using the MCP tools
4. **Customize map templates** if needed for your specific patterns

The folder mapping feature transforms how AI agents understand and work with your codebase, making them far more effective at code reuse and avoiding duplication.
