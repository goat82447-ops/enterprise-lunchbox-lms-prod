#!/usr/bin/env node
/**
 * MCP Server: Enterprise Lunchbox LMS Project Context
 * 
 * Exposes project structure, file search, and content retrieval
 * for AI-driven healing agents and analysis workflows.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

class ProjectContextMCPServer {
  constructor() {
    this.cache = {
      fileTree: null,
      fileContent: {},
    };
  }

  /**
   * Build a hierarchical file tree of the project
   */
  buildFileTree(dir = PROJECT_ROOT, depth = 0, maxDepth = 4) {
    if (depth > maxDepth) return [];

    const entries = [];
    try {
      const files = fs.readdirSync(dir, { withFileTypes: true });

      for (const file of files) {
        if (this.shouldIgnore(file.name, dir)) continue;

        const fullPath = path.join(dir, file.name);
        const relPath = path.relative(PROJECT_ROOT, fullPath);

        if (file.isDirectory()) {
          entries.push({
            type: 'directory',
            name: file.name,
            path: relPath,
            children: this.buildFileTree(fullPath, depth + 1, maxDepth),
          });
        } else if (file.isFile()) {
          entries.push({
            type: 'file',
            name: file.name,
            path: relPath,
            size: fs.statSync(fullPath).size,
            ext: path.extname(file.name),
          });
        }
      }
    } catch (err) {
      console.error(`[MCP] Error reading directory ${dir}:`, err.message);
    }

    return entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Determine if file/folder should be ignored
   */
  shouldIgnore(name, dir) {
    const ignoreDirs = new Set([
      'node_modules', 'dist', 'build', 'out-tsc', '.next', '.vercel', '.git',
      'obj', 'bin', '.vs', 'DotnetRoutix-Server', 'ZIPTen', '.vs',
    ]);

    const ignoreFiles = new Set([
      '.DS_Store', '.env', '.env.local', '.env.*.local', '*.log',
      'playwright-report', 'test-results', '.gitattributes',
    ]);

    if (ignoreDirs.has(name)) return true;
    if (ignoreFiles.has(name)) return true;
    if (name.startsWith('.')) return true;

    return false;
  }

  /**
   * Search files by keyword/pattern
   */
  searchFiles(keyword, fileExtensions = null) {
    const results = [];
    const visited = new Set();

    const search = (dir, depth = 0) => {
      if (depth > 4 || visited.has(dir)) return;
      visited.add(dir);

      try {
        const files = fs.readdirSync(dir, { withFileTypes: true });

        for (const file of files) {
          if (this.shouldIgnore(file.name, dir)) continue;

          const fullPath = path.join(dir, file.name);

          if (file.isDirectory()) {
            search(fullPath, depth + 1);
          } else if (file.isFile()) {
            const relPath = path.relative(PROJECT_ROOT, fullPath);

            // Filter by extension if provided
            if (fileExtensions && !fileExtensions.includes(path.extname(file.name))) {
              continue;
            }

            // Search filename
            if (file.name.toLowerCase().includes(keyword.toLowerCase())) {
              results.push({
                type: 'file',
                path: relPath,
                match: 'filename',
              });
              continue;
            }

            // Search file content (only for source files)
            const ext = path.extname(file.name);
            if (['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.cs'].includes(ext)) {
              try {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.toLowerCase().includes(keyword.toLowerCase())) {
                  results.push({
                    type: 'file',
                    path: relPath,
                    match: 'content',
                  });
                }
              } catch (err) {
                // Ignore read errors for large binary files
              }
            }
          }
        }
      } catch (err) {
        console.error(`[MCP] Error searching in ${dir}:`, err.message);
      }
    };

    search(PROJECT_ROOT);
    return results.slice(0, 100); // Limit results
  }

  /**
   * Get file content with caching
   */
  getFileContent(relPath) {
    const fullPath = path.resolve(PROJECT_ROOT, relPath);

    // Security: ensure path is within project
    if (!fullPath.startsWith(PROJECT_ROOT)) {
      throw new Error('Access denied: path outside project root');
    }

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${relPath}`);
    }

    if (this.cache.fileContent[relPath]) {
      return this.cache.fileContent[relPath];
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      this.cache.fileContent[relPath] = content;

      // Clear cache if file is too large (> 1MB)
      if (content.length > 1024 * 1024) {
        delete this.cache.fileContent[relPath];
        return { content: '(File too large, use streaming)', truncated: true };
      }

      return content;
    } catch (err) {
      throw new Error(`Cannot read file: ${err.message}`);
    }
  }

  /**
   * Get file content in chunks (for large files)
   */
  getFileContentChunked(relPath, startLine = 0, lineCount = 100) {
    const fullPath = path.resolve(PROJECT_ROOT, relPath);

    if (!fullPath.startsWith(PROJECT_ROOT)) {
      throw new Error('Access denied: path outside project root');
    }

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${relPath}`);
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      const start = Math.max(0, startLine);
      const end = Math.min(lines.length, start + lineCount);
      const chunk = lines.slice(start, end).join('\n');

      return {
        path: relPath,
        startLine: start,
        endLine: end,
        totalLines: lines.length,
        content: chunk,
      };
    } catch (err) {
      throw new Error(`Cannot read file: ${err.message}`);
    }
  }

  /**
   * List Frontend/Backend source files by type
   */
  listSourcesByType(type) {
    const typeMap = {
      'frontend-ts': /Frontend\/lunchbox-app\/src\/.*\.ts$/,
      'frontend-html': /Frontend\/lunchbox-app\/src\/.*\.html$/,
      'frontend-scss': /Frontend\/lunchbox-app\/src\/.*\.scss$/,
      'backend-node-ts': /Backend\/microservices\/.*\.ts$/,
      'backend-dotnet-cs': /Backend\/dotnet\/.*\.cs$/,
      'config-json': /(package\.json|tsconfig.*\.json|\.json)$/,
    };

    if (!typeMap[type]) {
      throw new Error(`Unknown source type: ${type}`);
    }

    const results = [];
    const visited = new Set();

    const scan = (dir, depth = 0) => {
      if (depth > 5 || visited.has(dir)) return;
      visited.add(dir);

      try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          if (this.shouldIgnore(file.name, dir)) continue;

          const fullPath = path.join(dir, file.name);
          const relPath = path.relative(PROJECT_ROOT, fullPath).replace(/\\/g, '/');

          if (file.isDirectory()) {
            scan(fullPath, depth + 1);
          } else if (file.isFile() && typeMap[type].test(relPath)) {
            results.push({
              path: relPath,
              size: fs.statSync(fullPath).size,
            });
          }
        }
      } catch (err) {
        // Ignore errors
      }
    };

    scan(PROJECT_ROOT);
    return results.slice(0, 200);
  }

  /**
   * Get project summary (counts, key services, etc)
   */
  getProjectSummary() {
    const summary = {
      frontend: this.listSourcesByType('frontend-ts').length,
      backend_node: this.listSourcesByType('backend-node-ts').length,
      backend_dotnet: this.listSourcesByType('backend-dotnet-cs').length,
      config_files: this.listSourcesByType('config-json').length,
      generated_at: new Date().toISOString(),
    };

    // Count routes
    try {
      const routesPath = path.join(PROJECT_ROOT, 'Frontend/lunchbox-app/src/app/app.routes.ts');
      if (fs.existsSync(routesPath)) {
        const content = fs.readFileSync(routesPath, 'utf8');
        const routeMatches = content.match(/path:\s*['"`]([^'"`]+)['"`]/g) || [];
        summary.routes = routeMatches.length;
      }
    } catch (err) {
      // Ignore
    }

    return summary;
  }

  /**
   * Get list of key project files for healing context
   */
  getHealingContextFiles() {
    return [
      'Frontend/lunchbox-app/src/app/app.ts',
      'Frontend/lunchbox-app/src/app/app.routes.ts',
      'Frontend/lunchbox-app/src/environments/environment.ts',
      'Frontend/lunchbox-app/src/environments/environment.prod.ts',
      'Frontend/lunchbox-app/package.json',
      'Backend/microservices/package.json',
      '.github/workflows/openrouter-healing-agent.yml',
      '.github/copilot-instructions.md',
    ].filter(p => fs.existsSync(path.join(PROJECT_ROOT, p)));
  }

  /**
   * Serve MCP protocol requests
   */
  handle(method, params) {
    try {
      switch (method) {
        case 'project:summary':
          return { success: true, data: this.getProjectSummary() };

        case 'project:tree':
          return { success: true, data: this.buildFileTree() };

        case 'project:search':
          if (!params.keyword) throw new Error('Missing keyword parameter');
          const extensions = params.extensions ? params.extensions.split(',') : null;
          return { success: true, data: this.searchFiles(params.keyword, extensions) };

        case 'file:content':
          if (!params.path) throw new Error('Missing path parameter');
          return { success: true, data: this.getFileContent(params.path) };

        case 'file:chunked':
          if (!params.path) throw new Error('Missing path parameter');
          const startLine = parseInt(params.startLine || '0', 10);
          const lineCount = parseInt(params.lineCount || '100', 10);
          return { success: true, data: this.getFileContentChunked(params.path, startLine, lineCount) };

        case 'sources:list':
          if (!params.type) throw new Error('Missing type parameter');
          return { success: true, data: this.listSourcesByType(params.type) };

        case 'healing:context':
          return { success: true, data: this.getHealingContextFiles() };

        default:
          throw new Error(`Unknown method: ${method}`);
      }
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  }
}

// Initialize and expose server
const server = new ProjectContextMCPServer();

// Simple stdio-based protocol handler
process.stdin.on('data', (chunk) => {
  const lines = chunk.toString().split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const req = JSON.parse(line);
      const res = server.handle(req.method, req.params || {});
      console.log(JSON.stringify(res));
    } catch (err) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    }
  }
});

console.error('[MCP] Project Context Server started. Listening on stdin...');
