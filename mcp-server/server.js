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
const MAX_CONTEXT_SNIPPET = 700;
const FILE_LIST_CACHE_TTL_MS = 20_000;

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

const TEXT_FILE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.cs', '.json', '.yml', '.yaml',
  '.html', '.scss', '.css', '.md', '.txt', '.xml', '.csproj', '.sln'
]);

const ANALYSIS_FILE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.cs', '.json', '.yml', '.yaml',
  '.html', '.scss', '.css', '.xml', '.csproj', '.sln'
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
  'user', 'users', 'app', 'application', 'issue', 'bug', 'error', 'fix', 'broken',
  'code', 'service', 'services', 'system', 'project', 'problem', 'failed', 'failure',
  'frontend', 'backend', 'return', 'handle', 'safely', 'screen', 'page', 'small',
  'endpoint', 'optional', 'missing'
]);

const NON_ACTIONABLE_FILE_PATTERNS = [
  /package-lock\.json$/i,
  /yarn\.lock$/i,
  /pnpm-lock\.yaml$/i,
  /\.min\.(js|css)$/i,
  /\.map$/i,
  /\/dist\//i,
];

const SURFACE_HINT_KEYWORDS = {
  frontend: ['ui', 'frontend', 'angular', 'component', 'template', 'button', 'screen', 'page', 'route', 'scss', 'css'],
  backend_node: ['backend', 'api', 'microservice', 'node', 'express', 'endpoint', 'queue', 'redis'],
  backend_dotnet: ['dotnet', '.net', 'c#', 'controller', 'middleware', 'aspnet', 'kestrel'],
  config: ['config', 'configuration', 'env', 'workflow', 'pipeline', 'github action', 'yaml'],
};

const fileCache = new Map();
let allFilesCache = [];
let allFilesCacheAt = 0;

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
  const now = Date.now();
  if (allFilesCache.length > 0 && (now - allFilesCacheAt) < FILE_LIST_CACHE_TTL_MS) {
    return allFilesCache;
  }

  const files = [];
  walkFiles(PROJECT_ROOT, files, { maxDepth: 8 });
  allFilesCache = files;
  allFilesCacheAt = now;
  return allFilesCache;
}

function startsWithAny(input, prefixes) {
  return prefixes.some((p) => input.startsWith(p));
}

function classifyBySurface(relPath) {
  if (startsWithAny(relPath, ['Frontend/'])) return 'frontend';
  if (startsWithAny(relPath, ['Backend/microservices/'])) return 'backend_node';
  if (startsWithAny(relPath, ['Backend/dotnet/'])) return 'backend_dotnet';
  if (relPath.startsWith('.github/') || relPath.endsWith('.yml') || relPath.endsWith('.yaml') || relPath.endsWith('.env')) {
    return 'config';
  }
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

function normalizeToken(token) {
  if (!token) return '';
  const sanitized = token.replace(/[_-]+/g, '').toLowerCase();
  if (!sanitized) return '';
  if (/^\d+$/.test(sanitized)) {
    const asNum = Number(sanitized);
    if (asNum >= 400 && asNum <= 599) return sanitized;
    return '';
  }
  if (sanitized.length <= 2) return '';
  if (STOP_WORDS.has(sanitized)) return '';
  let normalized = sanitized;
  if (sanitized.endsWith('s') && sanitized.length > 4) {
    normalized = sanitized.slice(0, -1);
  }
  if (STOP_WORDS.has(normalized)) return '';
  return normalized;
}

function tokenizeText(text) {
  const rawTokens = (text || '').toLowerCase().match(/[a-z0-9][a-z0-9_-]{1,}/g) || [];
  return rawTokens.map(normalizeToken).filter(Boolean);
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
  const counts = new Map();
  const titleTokens = tokenizeText(title);
  const bodyTokens = tokenizeText(body);

  for (const token of titleTokens) {
    counts.set(token, (counts.get(token) || 0) + 3);
  }

  for (const token of bodyTokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([k]) => k)
    .slice(0, 20);
}

function extractPhrases(title, body, maxPhrases = 6) {
  const text = `${title || ''}. ${body || ''}`;
  const chunks = text.split(/[.!?;\n]/).map((part) => part.trim()).filter(Boolean);
  const phrases = [];

  for (const chunk of chunks) {
    const raw = chunk.toLowerCase().match(/[a-z0-9][a-z0-9_-]{1,}/g) || [];
    const filtered = raw.map(normalizeToken).filter(Boolean);
    if (filtered.length < 2) continue;
    for (let i = 0; i < filtered.length - 1; i += 1) {
      const phrase = `${filtered[i]} ${filtered[i + 1]}`;
      if (!phrase || phrase.length < 6) continue;
      if (!phrases.includes(phrase)) {
        phrases.push(phrase);
      }
      if (phrases.length >= maxPhrases) return phrases;
    }
  }

  return phrases;
}

function detectSurfaceHints(title, body, explicitSurface) {
  const hints = new Set();
  const text = `${title || ''} ${body || ''}`.toLowerCase();

  if (explicitSurface && ['frontend', 'backend_node', 'backend_dotnet', 'config'].includes(explicitSurface)) {
    hints.add(explicitSurface);
  }

  for (const [surface, tokens] of Object.entries(SURFACE_HINT_KEYWORDS)) {
    if (tokens.some((token) => text.includes(token))) {
      hints.add(surface);
    }
  }

  return [...hints];
}

function countOccurrences(text, keyword) {
  let count = 0;
  let start = 0;
  while (start < text.length) {
    const idx = text.indexOf(keyword, start);
    if (idx === -1) break;
    count += 1;
    start = idx + keyword.length;
  }
  return count;
}

function findBestSnippet(content, keywords, phrases) {
  const lines = content.split(/\r?\n/);
  const terms = [...keywords, ...phrases];
  let foundLine = -1;
  let matchedTerm = '';

  for (let i = 0; i < lines.length; i += 1) {
    const lowerLine = lines[i].toLowerCase();
    const term = terms.find((candidate) => lowerLine.includes(candidate));
    if (term) {
      foundLine = i;
      matchedTerm = term;
      break;
    }
  }

  if (foundLine === -1) {
    return {
      content: content.slice(0, MAX_CONTEXT_SNIPPET),
      startLine: 1,
      endLine: Math.min(lines.length, 20),
      matchedTerm: '',
    };
  }

  const startLine = Math.max(0, foundLine - 8);
  const endLine = Math.min(lines.length, foundLine + 12);
  const snippet = lines.slice(startLine, endLine).join('\n').slice(0, MAX_CONTEXT_SNIPPET);

  return {
    content: snippet,
    startLine: startLine + 1,
    endLine,
    matchedTerm,
  };
}

function isActionableFile(relPath) {
  const lower = relPath.toLowerCase();
  return !NON_ACTIONABLE_FILE_PATTERNS.some((pattern) => pattern.test(lower));
}

function analyzeFileForKeywords(absPath, relPath, keywords, phrases, surfaceHints) {
  const relLower = relPath.toLowerCase();
  const basename = path.basename(relLower);
  const fileSurface = classifyBySurface(relPath);
  let score = 0;
  const hitKeywords = new Set();
  const hitPhrases = new Set();
  let content = '';

  if (!isActionableFile(relPath)) {
    score -= 20;
  }

  if (surfaceHints.length > 0) {
    if (surfaceHints.includes(fileSurface)) score += 22;
    else if (fileSurface !== 'other') score -= 12;
  }

  for (const kw of keywords) {
    if (basename.includes(kw)) {
      score += 14;
      hitKeywords.add(kw);
    } else if (relLower.includes(kw)) {
      score += 7;
      hitKeywords.add(kw);
    }
  }

  for (const phrase of phrases) {
    const phraseInPath = phrase.split(' ').every((term) => relLower.includes(term));
    if (phraseInPath) {
      score += 10;
      hitPhrases.add(phrase);
    }
  }

  try {
    const stat = fs.statSync(absPath);
    const ext = path.extname(relLower);
    if (stat.size <= MAX_FILE_SIZE_BYTES && TEXT_FILE_EXTENSIONS.has(ext)) {
      content = safeReadFile(absPath);
      const lower = content.toLowerCase();

      for (const kw of keywords) {
        const occurrences = countOccurrences(lower, kw);
        if (occurrences > 0) {
          score += Math.min(occurrences, 4) * 4;
          hitKeywords.add(kw);
        }
      }

      for (const phrase of phrases) {
        const occurrences = countOccurrences(lower, phrase);
        if (occurrences > 0) {
          score += Math.min(occurrences, 2) * 6;
          hitPhrases.add(phrase);
        }
      }
    }
  } catch {
    // Skip unreadable content.
  }

  if (hitKeywords.size <= 1 && hitPhrases.size === 0) {
    score -= 5;
  }

  const snippet = content ? findBestSnippet(content, [...hitKeywords], [...hitPhrases]) : null;

  return {
    score,
    hitKeywords: [...hitKeywords],
    hitPhrases: [...hitPhrases],
    content,
    snippet,
    fileSurface,
  };
}

function confidenceFromTopMatch(topMatch, keywordCount) {
  if (!topMatch) return 'low';
  const score = topMatch.score;
  const coverage = keywordCount > 0 ? (topMatch.matchedKeywords.length / keywordCount) : 0;

  if (score >= 45 && coverage >= 0.25) return 'high';
  if (score >= 25 && coverage >= 0.15) return 'medium';
  return 'low';
}

function handleIssueAnalyze(params = {}) {
  const title = params.title || '';
  const body = params.body || '';
  const explicitSurface = typeof params.surface === 'string' ? params.surface : '';
  const maxFiles = Math.max(1, Math.min(Number(params.maxFiles) || 10, 30));
  const maxSnippets = Math.max(1, Math.min(Number(params.maxSnippets) || 5, 10));
  const keywords = extractKeywords(title, body);
  const phrases = extractPhrases(title, body);
  const surfaceHints = detectSurfaceHints(title, body, explicitSurface);

  if (keywords.length === 0) {
    return ok({
      keywords: [],
      phrases: [],
      surfaceHints,
      relevantFiles: [],
      fileContents: [],
      rankedMatches: [],
      confidence: 'low',
      analysis: 'No meaningful keywords extracted from issue title/body.',
    });
  }

  const candidates = listAllFiles()
    .filter((absPath) => {
      const rel = toRelative(absPath).toLowerCase();
      return ANALYSIS_FILE_EXTENSIONS.has(path.extname(rel));
    });

  const scored = [];
  for (const absPath of candidates) {
    const rel = toRelative(absPath);
    const { score, hitKeywords, hitPhrases, content, snippet, fileSurface } =
      analyzeFileForKeywords(absPath, rel, keywords, phrases, surfaceHints);
    if (score <= 0) continue;

    scored.push({
      path: rel,
      score,
      hitKeywords,
      hitPhrases,
      snippet,
      fileSurface,
      content,
    });
  }

  scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  const top = scored.slice(0, maxFiles);
  const rankedMatches = top.map((item) => ({
    path: item.path,
    score: item.score,
    surface: item.fileSurface,
    matchedKeywords: item.hitKeywords,
    matchedPhrases: item.hitPhrases,
    snippetLineStart: item.snippet?.startLine || null,
    snippetLineEnd: item.snippet?.endLine || null,
  }));

  const fileContents = top.slice(0, maxSnippets).map((item) => ({
    path: item.path,
    content: item.snippet?.content || item.content.slice(0, MAX_CONTEXT_SNIPPET),
    matchedKeywords: item.hitKeywords,
    matchedPhrases: item.hitPhrases,
    lineStart: item.snippet?.startLine || 1,
    lineEnd: item.snippet?.endLine || null,
  }));

  const confidence = confidenceFromTopMatch(rankedMatches[0], keywords.length);

  return ok({
    keywords,
    phrases,
    surfaceHints,
    relevantFiles: top.map((item) => item.path),
    fileContents,
    rankedMatches,
    confidence,
    analysis: `Found ${top.length} files matching keywords/phrases: ${keywords.join(', ')}`,
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
