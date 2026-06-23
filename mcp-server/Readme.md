MCP Server: Project Context Integration Guide
Overview
The MCP (Model Context Protocol) Server provides structured access to your full project for AI-driven healing agents, allowing them to search, analyze, and fix issues with accurate codebase context.

Features
1. Project Summary
Get aggregate statistics about the codebase:

echo '{"method": "project:summary", "params": {}}' | node mcp-server/server.js
Response:

{
  "success": true,
  "data": {
    "frontend": 150,
    "backend_node": 45,
    "backend_dotnet": 30,
    "config_files": 25,
    "routes": 42,
    "generated_at": "2026-06-23T11:30:00.000Z"
  }
}
2. File Search
Search for files by keyword in filenames and content:

echo '{"method": "project:search", "params": {"keyword": "login", "extensions": ".ts,.tsx"}}' | node mcp-server/server.js
3. Get File Content
Retrieve full file content:

echo '{"method": "file:content", "params": {"path": "Frontend/lunchbox-app/src/app/app.routes.ts"}}' | node mcp-server/server.js
4. Chunked File Reading
Read large files in chunks (for >1MB files):

echo '{"method": "file:chunked", "params": {"path": "Frontend/lunchbox-app/src/app/features/booking/booking.component.ts", "startLine": 0, "lineCount": 100}}' | node mcp-server/server.js
5. List Sources by Type
Get all files of a specific type:

echo '{"method": "sources:list", "params": {"type": "frontend-ts"}}' | node mcp-server/server.js
Available types:

frontend-ts - Angular TypeScript components
frontend-html - Angular templates
frontend-scss - Angular styles
backend-node-ts - Node.js microservices
backend-dotnet-cs - .NET services
config-json - Configuration files
6. Get Healing Context
Retrieve key project files for issue analysis:

echo '{"method": "healing:context", "params": {}}' | node mcp-server/server.js
Returns:

Main app component
Routes configuration
Environment configs
Package manifests
Healing agent workflows
Integration with GitHub Workflows
Option A: Local Development
Start the MCP server:

cd mcp-server
npm start
Then use in your healing analysis scripts.

Option B: GitHub Actions Integration
Add to .github/workflows/openrouter-healing-agent.yml:

- name: Start MCP Project Context Server
  run: |
    node mcp-server/server.js > /tmp/mcp.log 2>&1 &
    echo $! > /tmp/mcp.pid
    sleep 1

- name: Enhance context with MCP data
  run: |
    python - <<'PY'
    import json
    import subprocess
    
    # Request from MCP server
    req = {"method": "healing:context", "params": {}}
    proc = subprocess.run(
      ["node", "mcp-server/server.js"],
      input=json.dumps(req).encode(),
      capture_output=True,
      timeout=5
    )
    res = json.loads(proc.stdout.decode().strip())
    
    if res["success"]:
      healing_files = res["data"]
      print("MCP Context files:", json.dumps(healing_files, indent=2))
    PY

- name: Cleanup MCP server
  if: always()
  run: |
    if [ -f /tmp/mcp.pid ]; then
      kill $(cat /tmp/mcp.pid) 2>/dev/null || true
    fi
Usage in Healing Agent
Before (without MCP):
// Limited context - only issue snippet
const context = `
Issue: ${issueTitle}
Body: ${issueBody}
`;
After (with MCP):
// Rich context from full project
const fs = require('fs');
const { spawn } = require('child_process');

async function getMCPContext() {
  return new Promise((resolve) => {
    const proc = spawn('node', ['mcp-server/server.js']);
    let result = '';

    proc.stdout.on('data', (data) => {
      result += data.toString();
    });

    // Request project summary + healing files
    const requests = [
      { method: 'project:summary', params: {} },
      { method: 'healing:context', params: {} },
      { method: 'project:search', params: { keyword: 'login' } }
    ];

    for (const req of requests) {
      proc.stdin.write(JSON.stringify(req) + '\n');
    }

    setTimeout(() => {
      proc.kill();
      const responses = result
        .trim()
        .split('\n')
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(r => r && r.success);

      resolve(responses);
    }, 2000);
  });
}

// Use in healing workflow
const mcpContext = await getMCPContext();
const fullContext = `
${issueTitle}
${issueBody}

Project Summary: ${JSON.stringify(mcpContext[0].data)}
Key Files: ${JSON.stringify(mcpContext[1].data)}
Related Files: ${JSON.stringify(mcpContext[2].data)}
`;
Performance Notes
Caching: File content is cached in memory (cleared on files >1MB)
Limits: Search results capped at 100 files, source lists at 200 files
Depth: Directory traversal limited to 4-5 levels
Ignore Patterns: Automatically skips node_modules, dist, .git, etc.
Security
Path validation prevents access outside project root
All file reads use utf8 with error handling
Large files (>1MB) are not cached in memory
No write/delete operations exposed
Next Steps
Test locally:

cd mcp-server
npm test
Integrate with healing workflow - Add MCP context collection step

Monitor MCP logs:

tail -f /tmp/mcp.log
Scale for production - Consider caching frequently accessed files or running as persistent service

Troubleshooting
MCP server not responding:

echo '{"method": "project:summary"}' | timeout 5 node mcp-server/server.js
Check available types:

node -e "console.log(['frontend-ts', 'frontend-html', 'backend-node-ts', 'backend-dotnet-cs', 'config-json'])"
Clear file cache:

Restart the server (cache is in-memory only)
