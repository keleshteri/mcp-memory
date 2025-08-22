# MCP Memory Server - Project Rules

## Project Overview

This is an MCP (Model Context Protocol) server that provides AI coding assistants with memory management, file approval tracking, and changelog functionality. The project uses TypeScript and follows strict file modification control patterns.

## Core Architecture

### 1. Framework and Dependencies
- **Runtime**: Node.js with TypeScript
- **MCP SDK**: @modelcontextprotocol/sdk for server implementation
- **File System**: fs-extra for enhanced file operations
- **Utilities**: chalk for console output, glob for file pattern matching

### 2. Project Structure
```
src/
├── index.ts              # Main MCP server implementation
├── memory-manager.ts     # Core memory and session management
├── changelog-manager.ts  # Changelog generation and tracking
├── metadata-parser.ts    # AI metadata parsing and validation
├── rule-engine.ts        # File modification rules engine
└── types.ts             # TypeScript interfaces and types
```

### 3. Key Components
- **MCPMemoryServer**: Main server class handling MCP protocol
- **MemoryManager**: Manages project memory, sessions, and approvals
- **ChangelogManager**: Handles automatic changelog generation
- **MetadataParser**: Parses and validates @ai-metadata headers
- **RuleEngine**: Enforces file modification rules and permissions

## Development Standards

### 1. File Modification Control

**CRITICAL**: All file modifications must follow the AI metadata system:

```typescript
// Before modifying any file:
1. Check for @ai-metadata header
2. Call check_before_modification(filePath)
3. Respect edit-permissions and approval requirements
4. Follow breaking-changes-risk protocols
```

### 2. AI Metadata Headers

All TypeScript files should include metadata headers:

```typescript
/**
 * @ai-metadata
 * {
 *   "class": "ComponentName",
 *   "description": "Brief description of functionality",
 *   "stability": "stable|experimental|deprecated",
 *   "editPermissions": "full|add-only|read-only|method-specific",
 *   "breakingChangesRisk": "high|medium|low",
 *   "reviewRequired": true|false,
 *   "dependencies": ["list", "of", "dependencies"],
 *   "tests": ["path/to/test/files"]
 * }
 */
```

### 3. Permission Levels

- **read-only**: No modifications allowed, suggest alternatives
- **add-only**: Only append new code, never modify existing
- **method-specific**: Check individual method permissions
- **full**: Can modify with approval rules applied

### 4. Approval Workflow

**High-Risk Files** (breakingChangesRisk: "high"):
- Require developer approval before modification
- Must call `set_file_approval(filePath, "devApproved", userEmail)`
- Automatic changelog entry generation

**Stable Files** (stability: "stable"):
- Ask for confirmation before modification
- Track all changes in project memory
- Invalidate approvals after modification

## Testing Framework

### 1. Test Structure
- Unit tests for each manager class
- Integration tests for MCP server functionality
- Metadata parsing validation tests
- Rule engine behavior tests

### 2. Test Commands
```bash
npm test          # Run all tests
npm run test:unit # Unit tests only
npm run test:integration # Integration tests
npm run test:watch # Watch mode
```

### 3. Test Coverage Requirements
- Minimum 80% code coverage
- All public methods must have tests
- Critical paths (file modification, approvals) require 100% coverage

## API Design Patterns

### 1. MCP Tool Implementation

All MCP tools follow this pattern:

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'tool_name':
        // Validate input
        // Execute logic
        // Return structured response
        break;
    }
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, error.message);
  }
});
```

### 2. Error Handling

- Use McpError for MCP-specific errors
- Provide clear, actionable error messages
- Log errors with chalk for console visibility
- Never expose internal paths or sensitive data

### 3. Response Format

All tool responses should be consistent:

```typescript
interface ToolResponse {
  success: boolean;
  data?: any;
  message?: string;
  warnings?: string[];
  errors?: string[];
}
```

## Security Guidelines

### 1. File System Access
- Always validate file paths are within project root
- Use path.resolve() and path.relative() for path validation
- Never allow access to system files or parent directories

### 2. Input Validation
- Validate all MCP tool arguments
- Sanitize file paths and user inputs
- Check file permissions before operations

### 3. Approval System
- Track all approval states in secure storage
- Validate approval signatures and timestamps
- Implement approval expiration for high-risk changes

## Performance Considerations

### 1. File Operations
- Use fs-extra for atomic operations
- Implement file locking for concurrent access
- Cache frequently accessed metadata

### 2. Memory Management
- Limit session history size
- Implement cleanup for old approval states
- Use streaming for large file operations

### 3. MCP Protocol
- Keep tool responses under 1MB
- Implement pagination for large datasets
- Use efficient JSON serialization

## Deployment and Build

### 1. Build Process
```bash
npm run build     # Compile TypeScript
npm run dev       # Development mode with watch
npm start         # Production mode
```

### 2. Environment Setup
- Node.js 18+ required
- TypeScript 5.0+ for compilation
- MCP client for testing (Claude Desktop, Cursor, etc.)

### 3. Installation Scripts
- `install.sh` for Unix systems
- `install.bat` for Windows
- Automatic project root detection

## Code Quality Standards

### 1. TypeScript Configuration
- Strict mode enabled
- No implicit any types
- Explicit return types for public methods
- Import/export using ES modules

### 2. Code Style
- 2-space indentation
- Semicolons required
- Single quotes for strings
- Trailing commas in objects/arrays

### 3. Documentation
- JSDoc comments for all public methods
- README.md with setup instructions
- FEATURE_ROADMAP.md for planned features
- Inline comments for complex logic

## Integration Guidelines

### 1. MCP Client Integration

**For Cursor IDE**:
```json
{
  "mcpServers": {
    "mcp-memory": {
      "command": "node",
      "args": ["path/to/mcp-memory/dist/index.js"]
    }
  }
}
```

**For Claude Desktop**:
```json
{
  "mcpServers": {
    "mcp-memory": {
      "command": "npm",
      "args": ["start"],
      "cwd": "path/to/mcp-memory"
    }
  }
}
```

### 2. AI Assistant Rules

When working with AI assistants:

1. **Always check metadata before file modification**
2. **Use MCP tools for approval tracking**
3. **Generate changelog entries automatically**
4. **Respect permission levels strictly**
5. **Ask for user approval on high-risk changes**

### 3. Workflow Integration

```typescript
// Standard workflow for AI assistants:

// 1. Start session
await mcp.call('start_session', { task: 'Description of work' });

// 2. Before modifying files
const canModify = await mcp.call('check_before_modification', { filePath });
if (!canModify.allowed) {
  // Handle permission denial
  return;
}

// 3. After modifications
await mcp.call('add_session_step', {
  step: 'Description of what was done',
  filesModified: ['list', 'of', 'files'],
  description: 'Detailed description'
});

// 4. Record important decisions
await mcp.call('add_decision', {
  key: 'decision_name',
  value: 'decision_value',
  reasoning: 'Why this decision was made'
});
```

## Troubleshooting

### 1. Common Issues

**Server won't start**:
- Check Node.js version (18+ required)
- Verify TypeScript compilation: `npm run build`
- Check project root detection in console output

**Permission denied errors**:
- Verify @ai-metadata headers are properly formatted
- Check approval status: `get_file_approval_status`
- Ensure user has provided necessary approvals

**Metadata parsing fails**:
- Validate JSON syntax in @ai-metadata blocks
- Check for missing required fields
- Verify file encoding (UTF-8 required)

### 2. Debug Mode

Enable verbose logging:
```bash
DEBUG=mcp-memory-server:* npm run dev
```

### 3. Reset Project State

To reset all memory and approvals:
```bash
rm -rf .ai-memory
npm run dev  # Will recreate with defaults
```

## Contributing Guidelines

### 1. Pull Request Process
1. Create feature branch from main
2. Add/update tests for new functionality
3. Update documentation and type definitions
4. Ensure all tests pass and coverage requirements met
5. Add changelog entry for significant changes

### 2. Code Review Requirements
- All changes to core managers require review
- Security-related changes require security team approval
- Breaking changes require architecture team approval

### 3. Release Process
1. Update version in package.json
2. Generate changelog entry
3. Create release tag
4. Update documentation
5. Notify MCP client maintainers of changes

---

**Remember**: This project implements safety controls for AI coding assistants. Always prioritize safety and user consent over convenience.