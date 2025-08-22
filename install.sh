#!/bin/bash

echo "🚀 Installing MCP Memory Server..."

# Install dependencies
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Create example configuration
echo "📝 Creating example files..."

# Create example project structure
mkdir -p example-project/src
mkdir -p example-project/.ai-memory

# Create example file with metadata
cat > example-project/src/UserService.js << 'EOF'
/**
 * @ai-metadata
 * @class: UserService
 * @description: Handles user registration, authentication, and profile management
 * @last-update: 2024-08-21T10:30:00Z
 * @last-editor: developer@example.com
 * @changelog: ./docs/changelog/user-service.md
 * @stability: stable
 * @edit-permissions: method-specific
 * @method-permissions: { "login": "read-only", "register": "allow", "updateProfile": "allow" }
 * @dependencies: ["database.js", "encryption.js", "validation.js"]
 * @tests: ["./tests/user-service.test.js"]
 * @breaking-changes-risk: high
 * @review-required: true
 * @ai-context: "Core user management system. Login method is critical - do not modify without security review."
 * 
 * @approvals:
 *   - dev-approved: false
 *   - code-review-approved: false
 *   - qa-approved: false
 */

class UserService {
  constructor(database, encryption) {
    this.db = database;
    this.encrypt = encryption;
  }

  // Critical method - marked as read-only in metadata
  async login(email, password) {
    const hashedPassword = await this.encrypt.hash(password);
    return await this.db.findUser({ email, password: hashedPassword });
  }

  // Allowed for modification
  async register(userData) {
    const hashedPassword = await this.encrypt.hash(userData.password);
    return await this.db.createUser({ ...userData, password: hashedPassword });
  }

  // Allowed for modification  
  async updateProfile(userId, profileData) {
    return await this.db.updateUser(userId, profileData);
  }
}

module.exports = UserService;
EOF

# Create package.json for example project
cat > example-project/package.json << 'EOF'
{
  "name": "example-project",
  "version": "1.0.0",
  "description": "Example project using MCP Memory Server",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js"
  }
}
EOF

echo "✅ MCP Memory Server installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set PROJECT_ROOT environment variable:"
echo "   export PROJECT_ROOT=/path/to/your/project"
echo ""
echo "2. Start the MCP server:"
echo "   npm start"
echo ""
echo "3. Configure your AI coder to use the MCP server"
echo ""
echo "4. See AI_CODER_RULES.md for complete integration guide"
echo ""
echo "📁 Example project created in: ./example-project/"
echo "🔧 Server files in: ./src/"
echo "📖 Documentation: ./README.md and ./AI_CODER_RULES.md"
