#!/usr/bin/env node
/**
 * MCP Project Context Server
 * Reads JSON requests from stdin and writes JSON responses to stdout.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MAX_FILE_SIZE_BYTES = 1_000_000;
const MAX_RESULTS = 100;
const DEFAULT_CHUNK_LINES = 100;
const MAX_CONTEXT_SNIPPET = 500;

const IGNORE_DIRS = new Set([
  '.git',
  '.github',
  '.vs',
  '.vscode',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.angular',
  'bin',
  'obj',
  'out',
]);

const SOURCE_TYPES = {
  'frontend-ts': ['.ts', '.tsx'],
  'frontend-html': ['.html'],
  'frontend-scss': ['.scss'],
  'backend-node-ts': ['.js', '.ts'],
  'backend-dotnet-cs': ['.cs'],
  'config-json': ['.json', '.yml', '.yaml', '.env'],
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'at', 'is',
  'are', 'be', 'from', 'with', 'by', 'as', 'this', 'that', 'it', 'its', 'if',
  'when', 'where', 'what', 'how', 'why', 'was', 'were', 'can', 'could', 'should',
  'would', 'will', 'not', 'no', 'yes', 'but', 'into', 'out', 'up', 'down',
  'user', 'users', 'app', 'application', 'issue', 'bug', 'error', 'fix', 'broken'
]);

const fileCache = new Map();

function send(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function ok(data) {
  return { success: true, data };
}

function fail(error) {
  return { success: false, error };
}

function normalizePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Invalid path');
  }

  const resolved = path.resolve(PROJECT_ROOT, inputPath);
  const rel = path.relative(PROJECT_ROOT, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path is outside project root');
  }
  return resolved;
}

function toRelative(absPath) {
  return path.relative(PROJECT_ROOT, absPath).replace(/\\/g, '/');
}

function safeReadFile(absPath) {
  const stat = fs.statSync(absPath);
  if (!stat.isFile()) {
    throw new Error('Path is not a file');
  }
  if (stat.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File too large to read in full');
  }

  if (fileCache.has(absPath)) {
    return fileCache.get(absPath);
  }

  const content = fs.readFileSync(absPath, 'utf8');
  fileCache.set(absPath, content);
  return content;
}

function walkFiles(dir, results, options = {}) {
  const { depth = 0, maxDepth = 7 } = options;
  if (depth > maxDepth) return;

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walkFiles(full, results, { depth: depth + 1, maxDepth });
      continue;
    }
    if (entry.isFile()) {
      results.push(full);
    }
  }
}

function listAllFiles() {
  const files = [];
  walkFiles(PROJECT_ROOT, files, { maxDepth: 8 });
  return files;
}

function startsWithAny(input, prefixes) {
  return prefixes.some((p) => input.startsWith(p));
}

function classifyBySurface(relPath) {
  if (startsWithAny(relPath, ['Frontend/'])) return 'frontend';
  if (startsWithAny(relPath, ['Backend/microservices/'])) return 'backend_node';
  if (startsWithAny(relPath, ['Backend/dotnet/'])) return 'backend_dotnet';
  return 'other';
}

function handleProjectSummary() {
  const files = listAllFiles();
  const summary = {
    frontend: 0,
    backend_node: 0,
    backend_dotnet: 0,
    config_files: 0,
    routes: 0,
    generated_at: new Date().toISOString(),
  };

  for (const absPath of files) {
    const rel = toRelative(absPath);
    const lower = rel.toLowerCase();
    const surface = classifyBySurface(rel);
    if (surface === 'frontend') summary.frontend += 1;
    if (surface === 'backend_node') summary.backend_node += 1;
    if (surface === 'backend_dotnet') summary.backend_dotnet += 1;
    if (lower.endsWith('.json') || lower.endsWith('.yml') || lower.endsWith('.yaml') || lower.endsWith('.env')) {
      summary.config_files += 1;
    }
    if (lower.includes('route') || lower.includes('routes')) {
      summary.routes += 1;
    }
  }

  return ok(summary);
}

function parseExtensions(extensions) {
  if (!extensions) return null;
  if (Array.isArray(extensions)) {
    return extensions.map((e) => e.trim().toLowerCase()).filter(Boolean);
  }
  if (typeof extensions === 'string') {
    return extensions.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  }
  return null;
}

function snippetAround(content, keyword, maxLen = 180) {
  const idx = content.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx < 0) return content.slice(0, maxLen);
  const start = Math.max(0, idx - Math.floor(maxLen / 3));
  const end = Math.min(content.length, start + maxLen);
  return content.slice(start, end).replace(/\s+/g, ' ').trim();
}

function handleProjectSearch(params = {}) {
  const keyword = (params.keyword || '').trim();
  if (!keyword) {
    return fail('Missing required parameter: keyword');
  }

  const extensions = parseExtensions(params.extensions);
  const files = listAllFiles();
  const needle = keyword.toLowerCase();
  const matches = [];

  for (const absPath of files) {
    const rel = toRelative(absPath);
    const relLower = rel.toLowerCase();
    const ext = path.extname(relLower);
    if (extensions && !extensions.includes(ext)) continue;

    let score = 0;
    let contentMatch = '';

    if (path.basename(relLower).includes(needle)) score += 8;
    if (relLower.includes(needle)) score += 4;

    try {
      const stat = fs.statSync(absPath);
      if (stat.size <= MAX_FILE_SIZE_BYTES) {
        const content = safeReadFile(absPath);
        if (content.toLowerCase().includes(needle)) {
          score += 6;
          contentMatch = snippetAround(content, needle);
        }
      }
    } catch {
      // Keep search resilient across mixed files.
    }

    if (score > 0) {
      matches.push({
        path: rel,
        score,
        match: contentMatch || rel,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  return ok(matches.slice(0, MAX_RESULTS));
}

function handleFileContent(params = {}) {
  const absPath = normalizePath(params.path);
  const content = safeReadFile(absPath);
  return ok({
    path: toRelative(absPath),
    content,
  });
}

function handleFileChunked(params = {}) {
  const absPath = normalizePath(params.path);
  const content = safeReadFile(absPath);
  const lines = content.split(/\r?\n/);
  const startLine = Number.isInteger(params.startLine) ? params.startLine : Number(params.startLine || 0);
  const lineCount = Number.isInteger(params.lineCount) ? params.lineCount : Number(params.lineCount || DEFAULT_CHUNK_LINES);
  const safeStart = Math.max(0, startLine);
  const safeCount = Math.max(1, Math.min(1000, lineCount));
  const end = Math.min(lines.length, safeStart + safeCount);
  const chunk = lines.slice(safeStart, end).join('\n');

  return ok({
    path: toRelative(absPath),
    startLine: safeStart,
    lineCount: safeCount,
    totalLines: lines.length,
    content: chunk,
  });
}

function filterByType(relPath, type) {
  const lower = relPath.toLowerCase();
  const exts = SOURCE_TYPES[type];
  if (!exts) return false;

  if (type.startsWith('frontend-') && !lower.startsWith('frontend/')) return false;
  if (type.startsWith('backend-node-') && !lower.startsWith('backend/microservices/')) return false;
  if (type.startsWith('backend-dotnet-') && !lower.startsWith('backend/dotnet/')) return false;

  return exts.some((ext) => lower.endsWith(ext));
}

function handleSourcesList(params = {}) {
  const type = params.type;
  if (!type || !SOURCE_TYPES[type]) {
    return fail(`Unsupported source type: ${type || '(missing)'}`);
  }

  const files = listAllFiles()
    .map(toRelative)
    .filter((rel) => filterByType(rel, type))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 200);

  return ok(files);
}

function extractKeywords(title, body) {
  const text = `${title || ''} ${body || ''}`.toLowerCase();
  const tokens = text.match(/[a-z0-9][a-z0-9_-]{2,}/g) || [];
  const counts = new Map();

  for (const raw of tokens) {
    const token = raw.replace(/[_-]+/g, '');
    if (!token || STOP_WORDS.has(token)) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([k]) => k)
    .slice(0, 20);
}

function analyzeFileForKeywords(absPath, relPath, keywords) {
  const relLower = relPath.toLowerCase();
  let score = 0;
  const hitKeywords = new Set();
  let content = '';

  for (const kw of keywords) {
    if (path.basename(relLower).includes(kw)) {
      score += 10;
      hitKeywords.add(kw);
    } else if (relLower.includes(kw)) {
      score += 5;
      hitKeywords.add(kw);
    }
  }

  try {
    const stat = fs.statSync(absPath);
    if (stat.size <= MAX_FILE_SIZE_BYTES) {
      content = safeReadFile(absPath);
      const lower = content.toLowerCase();
      for (const kw of keywords) {
        const firstIdx = lower.indexOf(kw);
        if (firstIdx >= 0) {
          score += 6;
          hitKeywords.add(kw);
        }
      }
    }
  } catch {
    // Skip unreadable content.
  }

  return { score, hitKeywords: [...hitKeywords], content };
}

function handleIssueAnalyze(params = {}) {
  const title = params.title || '';
  const body = params.body || '';
  const keywords = extractKeywords(title, body);

  if (keywords.length === 0) {
    return ok({
      keywords: [],
      relevantFiles: [],
      fileContents: [],
      analysis: 'No meaningful keywords extracted from issue title/body.',
    });
  }

  const candidates = listAllFiles()
    .filter((absPath) => {
      const rel = toRelative(absPath).toLowerCase();
      return (
        rel.endsWith('.ts') ||
        rel.endsWith('.tsx') ||
        rel.endsWith('.js') ||
        rel.endsWith('.cs') ||
        rel.endsWith('.html') ||
        rel.endsWith('.scss') ||
        rel.endsWith('.json') ||
        rel.endsWith('.yml') ||
        rel.endsWith('.yaml')
      );
    });

  const scored = [];
  for (const absPath of candidates) {
    const rel = toRelative(absPath);
    const { score, hitKeywords, content } = analyzeFileForKeywords(absPath, rel, keywords);
    if (score <= 0) continue;

    scored.push({
      path: rel,
      score,
      hitKeywords,
      content,
    });
  }

  scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  const top = scored.slice(0, 10);
  const fileContents = top.slice(0, 5).map((item) => ({
    path: item.path,
    content: item.content.slice(0, MAX_CONTEXT_SNIPPET),
  }));

  return ok({
    keywords,
    relevantFiles: top.map((item) => item.path),
    fileContents,
    analysis: `Found ${top.length} files matching keywords: ${keywords.join(', ')}`,
  });
}

function existingPath(rel) {
  const abs = path.resolve(PROJECT_ROOT, rel);
  return fs.existsSync(abs);
}

function handleHealingContext() {
  const preferred = [
    '.github/copilot-instructions.md',
    'Frontend/lunchbox-app/src/app/app.routes.ts',
    'Frontend/lunchbox-app/package.json',
    'Backend/microservices/package.json',
    'Backend/dotnet/AuthService/Program.cs',
    '.github/workflows/openrouter-healing-agent.yml',
  ];

  const files = preferred.filter(existingPath);
  return ok(files);
}

function handleRequest(rawRequest) {
  const method = rawRequest?.method;
  const params = rawRequest?.params || {};

  switch (method) {
    case 'project:summary':
      return handleProjectSummary();
    case 'project:search':
      return handleProjectSearch(params);
    case 'file:content':
      return handleFileContent(params);
    case 'file:chunked':
      return handleFileChunked(params);
    case 'sources:list':
      return handleSourcesList(params);
    case 'issue:analyze':
      return handleIssueAnalyze(params);
    case 'healing:context':
      return handleHealingContext();
    default:
      return fail(`Unsupported method: ${method || '(missing)'}`);
  }
}

function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const req = JSON.parse(trimmed);
      const result = handleRequest(req);
      send(result);
    } catch (err) {
      send(fail(`Invalid request: ${err.message}`));
    }
  });
}

main();
