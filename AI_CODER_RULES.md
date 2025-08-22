# AI Coder Rules for File Modification Control

## CRITICAL RULES - MUST FOLLOW ALWAYS

### 1. **BEFORE ANY FILE MODIFICATION**

```
STEP 1: Check for @ai-metadata header in the file
STEP 2: If metadata exists, call MCP tool: check_before_modification(filePath)
STEP 3: If check returns "allowed: false", STOP and explain why to user
STEP 4: If warnings exist, inform user and ask for confirmation
```

### 2. **PERMISSION SYSTEM ENFORCEMENT**

```
@edit-permissions: "read-only" → NEVER modify, suggest alternatives
@edit-permissions: "add-only" → Only append new code, never modify existing
@edit-permissions: "method-specific" → Check @method-permissions for each method
@edit-permissions: "full" → Can modify with approval rules applied
```

### 3. **APPROVAL REQUIREMENTS**

```
IF @breaking-changes-risk: "high" AND no dev-approved → REQUIRE user approval first
IF @review-required: true AND no code-review-approved → REQUIRE review
IF @stability: "stable" AND no dev-approved → ASK for confirmation
IF @stability: "deprecated" → WARN and suggest alternatives
```

### 4. **AFTER ANY FILE MODIFICATION**

```
STEP 1: Call MCP tool: get_modification_actions(filePath)
STEP 2: Execute all returned actions:
   - invalidate_approvals → Call set_file_approval with false
   - update_last_modified → Update @last-update in metadata
   - add_to_changelog → Call add_changelog_entry
   - require_immediate_review → Notify user
   - run_tests → Suggest running tests
```

## DETAILED WORKFLOW RULES

### A. **Session Management Rules**

```
1. At start of conversation:
   - Call start_session("brief description of task")
   - Get project context with get_project_memory()

2. When completing significant steps:
   - Call add_session_step(step, filesModified, description)
   
3. When making important decisions:
   - Call add_decision(key, value, reasoning)
```

### B. **File Analysis Rules**

```
BEFORE working with any file:

1. Call parse_file_metadata(filePath)
2. Call get_file_approval_status(filePath)
3. Combine results to understand file constraints

NEVER assume a file can be modified without checking!
```

### C. **Approval Workflow Rules**

```
When user says "I approve this":
- Call set_file_approval(filePath, "devApproved", user_email)

When code review is done:
- Call set_file_approval(filePath, "codeReviewApproved", reviewer_email)

When QA approves:
- Call set_file_approval(filePath, "qaApproved", qa_email)
```

### D. **Error Handling Rules**

```
IF MCP tools are not available:
- Warn user that safety checks are disabled
- Proceed with extra caution
- Document all changes manually

IF file has no @ai-metadata:
- Suggest adding metadata header
- Proceed with normal caution
```

## SPECIFIC SCENARIO RULES

### Scenario 1: High-Risk File Modification

```
WHEN: @breaking-changes-risk: "high"
THEN: 
  1. Check if dev-approved exists
  2. If NOT approved, ask user: "This file is high-risk. Do you approve this modification?"
  3. If user approves, set approval and proceed
  4. If user denies, suggest alternatives
```

### Scenario 2: Read-Only File

```
WHEN: @edit-permissions: "read-only"
THEN:
  1. REFUSE modification completely
  2. Explain why file is read-only
  3. Suggest creating new file or module
  4. Show @ai-context if available
```

### Scenario 3: Add-Only Permission

```
WHEN: @edit-permissions: "add-only"
THEN:
  1. Only append new methods/functions/classes
  2. NEVER modify existing code
  3. Can add imports if needed
  4. Update @last-update in metadata
```

### Scenario 4: Method-Specific Permissions

```
WHEN: @edit-permissions: "method-specific"
THEN:
  1. Check @method-permissions for each method being modified
  2. Follow individual method rules:
     - "read-only" → Cannot modify this method
     - "allow" → Can modify this method
     - "restricted" → Ask for permission first
```

### Scenario 5: Deprecated Files

```
WHEN: @stability: "deprecated"
THEN:
  1. Warn user about deprecated status
  2. Ask: "This file is deprecated. Are you sure you want to modify it?"
  3. Suggest modernizing or replacing instead
  4. If user insists, proceed with extra logging
```

## CHANGELOG RULES

### Automatic Changelog Entries

```
ALWAYS call add_changelog_entry with:
- description: Clear description of what changed
- filesChanged: Array of modified file paths
- type: "added" | "changed" | "deprecated" | "removed" | "fixed" | "security"
- breakingChange: true if @breaking-changes-risk is "high"
- impact: "major" | "minor" | "patch"
```

### Changelog Types Guide

```
"added" → New features, methods, classes
"changed" → Modifications to existing functionality
"deprecated" → Marking old code as deprecated
"removed" → Deleting code or features
"fixed" → Bug fixes
"security" → Security-related changes
```

## ERROR MESSAGES TO USE

### Permission Denied Messages

```
"❌ Cannot modify file: Read-only permissions set"
"❌ High-risk file requires developer approval first"
"❌ This file requires code review before modification"
"⚠️  File is deprecated - consider alternatives"
"⚠️  Stable code modification requires approval"
```

### Success Messages

```
"✅ File approved for modification"
"✅ Changes logged to changelog"
"✅ Session step recorded"
"✅ Approvals updated"
```

## MCP TOOL CALL EXAMPLES

### Example 1: Check Before Modification

```javascript
// Before modifying any file
const result = await mcp.call("check_before_modification", {
  filePath: "/src/auth/UserAuth.js"
});

if (!result.allowed) {
  console.log("❌ Cannot modify file:");
  result.reasons.forEach(reason => console.log(`  - ${reason}`));
  return; // STOP here
}

if (result.warnings.length > 0) {
  console.log("⚠️  Warnings:");
  result.warnings.forEach(warning => console.log(`  - ${warning}`));
  // Ask user for confirmation
}
```

### Example 2: After Modification Workflow

```javascript
// After modifying a file
const actions = await mcp.call("get_modification_actions", {
  filePath: "/src/auth/UserAuth.js"
});

for (const action of actions) {
  switch (action) {
    case 'invalidate_approvals':
      await mcp.call("set_file_approval", {
        filePath: "/src/auth/UserAuth.js",
        approvalType: "devApproved",
        approvedBy: "system-invalidated"
      });
      break;
      
    case 'add_to_changelog':
      await mcp.call("add_changelog_entry", {
        description: "Updated authentication logic",
        filesChanged: ["/src/auth/UserAuth.js"],
        type: "changed",
        breakingChange: false,
        impact: "minor"
      });
      break;
      
    case 'require_immediate_review':
      console.log("🔍 This file requires immediate review due to high risk");
      break;
  }
}
```

### Example 3: Session Management

```javascript
// Start of coding session
await mcp.call("start_session", {
  task: "Implementing payment integration with Stripe"
});

// After completing a step
await mcp.call("add_session_step", {
  step: "Created Stripe payment service",
  filesModified: ["/src/payments/StripeService.js", "/src/config/stripe.js"],
  description: "Set up basic Stripe integration with webhook handling"
});

// Record important decision
await mcp.call("add_decision", {
  key: "payment_provider",
  value: "stripe",
  reasoning: "Chosen for better international support and webhook reliability"
});
```

### Example 4: User Approval Flow

```javascript
// When user gives approval
if (userInput.includes("I approve")) {
  await mcp.call("set_file_approval", {
    filePath: "/src/core/SecurityManager.js",
    approvalType: "devApproved",
    approvedBy: "john.doe@company.com" // Get from user context
  });
  
  console.log("✅ Developer approval recorded");
}
```

## INTEGRATION WITH AI CODERS

### For Cursor IDE

```javascript
// Add to Cursor's .cursorrules file
/*
AI Coder Rules:

1. ALWAYS check @ai-metadata before file modification
2. Use MCP memory server for approval tracking
3. Follow permission system strictly
4. Auto-generate changelog entries
5. Respect breaking-changes-risk levels

MCP Server: mcp-memory-server
Project Root: ${PROJECT_ROOT}
*/
```

### For Windsurf

```javascript
// Add to windsurf.config.js
module.exports = {
  aiRules: {
    beforeModification: "check_before_modification",
    afterModification: "get_modification_actions",
    mcpServer: "mcp-memory-server",
    enforceApprovals: true,
    autoChangelog: true
  }
};
```

### For Claude.ai Desktop/API

```
System Prompt Addition:

You are an AI coding assistant with strict file modification controls. 

CRITICAL: Before modifying any file, you MUST:
1. Check for @ai-metadata header
2. Use MCP tools to verify permissions
3. Follow approval workflows
4. Update changelog after changes

Never bypass these safety checks. If MCP tools fail, warn user and proceed with extreme caution.
```

## QUICK REFERENCE COMMANDS

```bash
# Essential MCP Commands for AI Coders

# Before file modification
check_before_modification(filePath)

# After file modification  
get_modification_actions(filePath)
add_changelog_entry(description, filesChanged, type)

# Session management
start_session(task)
add_session_step(step, filesModified)

# Approval management
set_file_approval(filePath, approvalType, approvedBy)
get_file_approval_status(filePath)

# Metadata management
parse_file_metadata(filePath)
update_file_metadata(filePath, updates)
```

## TROUBLESHOOTING

### Common Issues

1. **MCP Server Not Responding**
   - Check if server is running: `npm start`
   - Verify PROJECT_ROOT environment variable
   - Check network connectivity

2. **Permission Denied Errors**
   - Check @ai-metadata header format
   - Verify approval status with get_file_approval_status
   - Ask user for explicit approval

3. **Metadata Parsing Fails**
   - Ensure @ai-metadata block is properly formatted
   - Check for syntax errors in metadata
   - Validate JSON objects in metadata

### Debug Mode

```javascript
// Enable verbose logging
process.env.DEBUG = "mcp-memory-server:*";
```

---

**REMEMBER: These rules are designed to prevent AI from making destructive changes to important code. Always err on the side of caution!**
