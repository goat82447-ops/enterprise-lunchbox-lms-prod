MCP Server: Project Context Integration Guide Overview The MCP (Model Context Protocol) Server provides structured access to your full project for AI-driven healing agents, allowing them to search, analyze, and fix issues with accurate codebase context.

Features

Project Summary Get aggregate statistics about the codebase:
echo '{"method": "project:summary", "params": {}}' | node mcp-server/server.js Response:

{ "success": true, "data": { "frontend": 150, "backend_node": 45, "backend_dotnet": 30, "config_files": 25, "routes": 42, "generated_at": "2026-06-23T11:30:00.000Z" } } 2. File Search Search for files by keyword in filenames and content:

echo '{"method": "project:search", "params": {"keyword": "login", "extensions": ".ts,.tsx"}}' | node mcp-server/server.js 3. Get File Content Retrieve full file content:

echo '{"method": "file:content", "params": {"path": "Frontend/lunchbox-app/src/app/app.routes.ts"}}' | node mcp-server/server.js 4. Chunked File Reading Read large files in chunks (for >1MB files):

echo '{"method": "file:chunked", "params": {"path": "Frontend/lunchbox-app/src/app/features/booking/booking.component.ts", "startLine": 0, "lineCount": 100}}' | node mcp-server/server.js 5. List Sources by Type Get all files of a specific type:

echo '{"method": "sources:list", "params": {"type": "frontend-ts"}}' | node mcp-server/server.js Available types:

frontend-ts - Angular TypeScript components frontend-html - Angular templates frontend-scss - Angular styles backend-node-ts - Node.js microservices backend-dotnet-cs - .NET services config-json - Configuration files 6. Smart Issue Analysis ⭐ NEW Automatically find relevant files based on issue description (searches filenames, paths, AND file contents):

echo '{"method": "issue:analyze", "params": {"title": "Order API returns 500 on missing coupon", "body": "Backend endpoint should treat coupon as optional", "surface": "backend_node"}}' | node mcp-server/server.js Response:

{ "success": true, "data": { "keywords": ["order", "api", "500", "coupon", "backend", "endpoint"], "phrases": ["order api", "missing coupon"], "surfaceHints": ["backend_node"], "confidence": "high", "relevantFiles": [ "Backend/microservices/services/order-service/src/index.js", "Backend/microservices/services/api-gateway/src/index.js" ], "rankedMatches": [ { "path": "Backend/microservices/services/order-service/src/index.js", "score": 62, "surface": "backend_node", "matchedKeywords": ["order", "api", "coupon"], "matchedPhrases": ["missing coupon"], "snippetLineStart": 40, "snippetLineEnd": 60 } ], "fileContents": [ { "path": "Backend/microservices/services/order-service/src/index.js", "lineStart": 40, "lineEnd": 60, "matchedKeywords": ["order", "api", "coupon"], "content": "..." } ], "analysis": "Found 8 files matching keywords/phrases: order, api, 500, coupon, backend, endpoint" } } How it works:

Extracts keywords from issue title + body (stops words filtered) Extracts short phrases and optional surface hint (frontend/backend/config) Scores files by keyword + phrase matches in: filename, directory path, file content Applies surface-aware ranking and de-prioritizes lock/minified files Returns ranked list of relevant files (top 10 by default) Includes targeted file snippets with line ranges for top matches Healing Agent uses this to find files WITHOUT user specifying paths! 7. Get Healing Context Retrieve key project files for issue analysis:

echo '{"method": "healing:context", "params": {}}' | node mcp-server/server.js Returns:

Main app component Routes configuration Environment configs Package manifests Healing agent workflows Integration with GitHub Workflows Option A: Local Development Start the MCP server:

cd mcp-server npm start Then use in your healing analysis scripts.

Option B: GitHub Actions Integration Add to .github/workflows/openrouter-healing-agent.yml:

name: Start MCP Project Context Server run: | node mcp-server/server.js > /tmp/mcp.log 2>&1 & echo $! > /tmp/mcp.pid sleep 1

name: Enhance context with MCP data run: | python - <<'PY' import json import subprocess

Request from MCP server
req = {"method": "healing:context", "params": {}} proc = subprocess.run( ["node", "mcp-server/server.js"], input=json.dumps(req).encode(), capture_output=True, timeout=5 ) res = json.loads(proc.stdout.decode().strip())

if res["success"]: healing_files = res["data"] print("MCP Context files:", json.dumps(healing_files, indent=2)) PY

name: Cleanup MCP server if: always() run: | if [ -f /tmp/mcp.pid ]; then kill 
(
c
a
t
/
t
m
p
/
m
c
p
.
p
i
d
)
2
>
/
d
e
v
/
n
u
l
l
∣
∣
t
r
u
e
f
i
U
s
a
g
e
i
n
H
e
a
l
i
n
g
A
g
e
n
t
B
e
f
o
r
e
(
w
i
t
h
o
u
t
M
C
P
)
:
/
/
L
i
m
i
t
e
d
c
o
n
t
e
x
t
−
o
n
l
y
i
s
s
u
e
s
n
i
p
p
e
t
c
o
n
s
t
c
o
n
t
e
x
t
=
‘
I
s
s
u
e
:
(cat/tmp/mcp.pid)2>/dev/null∣∣truefiUsageinHealingAgentBefore(withoutMCP)://Limitedcontext−onlyissuesnippetconstcontext=‘Issue:{issueTitle} Body: ${issueBody} `; After (with MCP): // Rich context from full project const fs = require('fs'); const { spawn } = require('child_process');

async function getMCPContext() { return new Promise((resolve) => { const proc = spawn('node', ['mcp-server/server.js']); let result = '';

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
}); }

// Use in healing workflow const mcpContext = await getMCPContext(); const fullContext = ` 
i
s
s
u
e
T
i
t
l
e
issueTitle{issueBody}

Project Summary: 
J
S
O
N
.
s
t
r
i
n
g
i
f
y
(
m
c
p
C
o
n
t
e
x
t
[
0
]
.
d
a
t
a
)
K
e
y
F
i
l
e
s
:
JSON.stringify(mcpContext[0].data)KeyFiles:{JSON.stringify(mcpContext[1].data)} Related Files: ${JSON.stringify(mcpContext[2].data)} `; Performance Notes Caching: File content is cached in memory (cleared on files >1MB) Limits: Search results capped at 100 files, source lists at 200 files Depth: Directory traversal limited to 4-5 levels Ignore Patterns: Automatically skips node_modules, dist, .git, etc. Security Path validation prevents access outside project root All file reads use utf8 with error handling Large files (>1MB) are not cached in memory No write/delete operations exposed Next Steps Test locally:

cd mcp-server npm test Integrate with healing workflow - Add MCP context collection step

Monitor MCP logs:

tail -f /tmp/mcp.log Scale for production - Consider caching frequently accessed files or running as persistent service

Troubleshooting MCP server not responding:

echo '{"method": "project:summary"}' | timeout 5 node mcp-server/server.js Check available types:

node -e "console.log(['frontend-ts', 'frontend-html', 'backend-node-ts', 'backend-dotnet-cs', 'config-json'])" Clear file cache:

Restart the server (cache is in-memory only)
