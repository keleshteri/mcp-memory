@echo off
echo 🚀 Installing MCP Memory Server...

REM Install dependencies
call npm install

REM Build TypeScript
echo 🔨 Building TypeScript...
call npm run build

REM Create example configuration
echo 📝 Creating example files...

REM Create example project structure
if not exist "example-project\src" mkdir example-project\src
if not exist "example-project\.ai-memory" mkdir example-project\.ai-memory

REM Create example file with metadata (Windows version)
echo /**> example-project\src\UserService.js
echo  * @ai-metadata>> example-project\src\UserService.js
echo  * @class: UserService>> example-project\src\UserService.js
echo  * @description: Handles user registration, authentication, and profile management>> example-project\src\UserService.js
echo  * @last-update: 2024-08-21T10:30:00Z>> example-project\src\UserService.js
echo  * @last-editor: developer@example.com>> example-project\src\UserService.js
echo  * @stability: stable>> example-project\src\UserService.js
echo  * @edit-permissions: method-specific>> example-project\src\UserService.js
echo  * @method-permissions: { "login": "read-only", "register": "allow" }>> example-project\src\UserService.js
echo  * @breaking-changes-risk: high>> example-project\src\UserService.js
echo  * @review-required: true>> example-project\src\UserService.js
echo  * @ai-context: "Core user management - login is critical">> example-project\src\UserService.js
echo  */>> example-project\src\UserService.js
echo.>> example-project\src\UserService.js
echo class UserService {>> example-project\src\UserService.js
echo   async login(email, password) {>> example-project\src\UserService.js
echo     // Critical method - read-only>> example-project\src\UserService.js
echo     return await this.db.findUser({ email, password });>> example-project\src\UserService.js
echo   }>> example-project\src\UserService.js
echo }>> example-project\src\UserService.js

echo ✅ MCP Memory Server installation complete!
echo.
echo 📋 Next steps:
echo 1. Set PROJECT_ROOT environment variable:
echo    set PROJECT_ROOT=C:\path\to\your\project
echo.
echo 2. Start the MCP server:
echo    npm start
echo.
echo 3. Configure your AI coder to use the MCP server
echo.
echo 4. See AI_CODER_RULES.md for complete integration guide
echo.
echo 📁 Example project created in: .\example-project\
echo 🔧 Server files in: .\src\
echo 📖 Documentation: .\README.md and .\AI_CODER_RULES.md

pause
