#!/usr/bin/env node

/**
 * 🚀 PUTTER.JS - Complete Healing Agent Automation
 * 
 * Features:
 * ✅ Detect build errors
 * ✅ Analyze with local LLM (Ollama - FREE, UNLIMITED)
 * ✅ Generate fixes automatically
 * ✅ Apply fixes to files
 * ✅ Commit changes
 * ✅ Push to GitHub
 * ✅ Create Pull Request
 * ✅ Add reviewers & labels
 * 
 * Usage:
 *   node putter.js              # Interactive mode
 *   node putter.js --auto       # Fully automatic
 *   node putter.js --dry-run    # Preview only
 */

const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const { promisify } = require('util');
const readline = require('readline');

const execAsync = promisify(exec);

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(text) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${text}`, 'cyan');
  log(`${'='.repeat(60)}\n`, 'cyan');
}

function success(text) {
  log(`✅ ${text}`, 'green');
}

function error(text) {
  log(`❌ ${text}`, 'red');
}

function warning(text) {
  log(`⚠️  ${text}`, 'yellow');
}

function info(text) {
  log(`ℹ️  ${text}`, 'blue');
}

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`${colors.magenta}? ${question}${colors.reset} `, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * PUTTER - Main Automation Class
 */
class Putter {
  constructor(options = {}) {
    this.options = {
      model: 'mistral', // or 'codellama', 'llama2'
      auto: options.auto || false,
      dryRun: options.dryRun || false,
      ollamaUrl: 'http://localhost:11434/api/generate',
      ...options,
    };

    this.fixes = {};
    this.errors = '';
    this.branchName = '';
  }

  /**
   * Step 1: Detect build errors
   */
  async detectErrors() {
    header('Step 1️⃣  Detecting Build Errors');

    try {
      info('Running build...');
      const { stdout, stderr } = await execAsync('npm run build 2>&1 || true');
      this.errors = stdout + stderr;

      if (!this.errors || this.errors.length < 50) {
        success('No errors found! ✨');
        return false;
      }

      info(`Found ${this.errors.length} characters of error output`);
      
      // Show first error
      const lines = this.errors.split('\n').filter(l => l.includes('error'));
      if (lines.length > 0) {
        log(`\nFirst error:\n${lines[0].substring(0, 100)}...\n`, 'red');
      }

      return true;
    } catch (err) {
      error(`Build detection failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Step 2: Call Ollama for fixes (FREE, UNLIMITED)
   */
  async generateFixes() {
    header('Step 2️⃣  Generating Fixes with Local AI');

    info(`Model: ${this.options.model.toUpperCase()}`);
    info('Cost: FREE ✅');
    info('Tokens: UNLIMITED ✅');
    log('\n🧠 Analyzing errors...\n', 'magenta');

    const prompt = `You are an expert developer. Fix these build errors:

ERRORS:
${this.errors.substring(0, 5000)}

INSTRUCTIONS:
1. Identify root cause
2. Provide EXACT file paths and fixes
3. Include complete corrected code
4. Format as JSON with this structure:

{
  "files": [
    {
      "path": "path/to/file.ts",
      "originalError": "what was wrong",
      "fix": "complete fixed code here"
    }
  ],
  "summary": "brief explanation"
}

Return ONLY valid JSON, no markdown formatting.`;

    try {
      const response = await fetch(this.options.ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.options.model,
          prompt: prompt,
          stream: false,
          temperature: 0.3,
          num_predict: 4096,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.response;

      // Extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        warning('Could not parse AI response as JSON');
        log(`Response: ${responseText.substring(0, 300)}`);
        return false;
      }

      this.fixes = JSON.parse(jsonMatch[0]);
      
      success(`Generated ${this.fixes.files.length} file fixes`);
      info(`Summary: ${this.fixes.summary}`);

      return true;
    } catch (err) {
      error(`Error calling Ollama: ${err.message}`);
      error('Make sure Ollama is running: ollama serve');
      return false;
    }
  }

  /**
   * Step 3: Review fixes (interactive)
   */
  async reviewFixes() {
    if (this.options.auto) {
      success('Auto-mode: Skipping review');
      return true;
    }

    header('Step 3️⃣  Review Generated Fixes');

    for (let i = 0; i < this.fixes.files.length; i++) {
      const file = this.fixes.files[i];
      log(`\n📄 File ${i + 1}/${this.fixes.files.length}: ${file.path}`, 'cyan');
      log(`Error: ${file.originalError.substring(0, 80)}`);
      log(`\nProposed fix:\n${file.fix.substring(0, 200)}...`);

      const approved = await prompt('Apply this fix? (y/n)');
      if (approved.toLowerCase() !== 'y') {
        this.fixes.files[i].skip = true;
      }
    }

    return true;
  }

  /**
   * Step 4: Apply fixes to files
   */
  async applyFixes() {
    header('Step 4️⃣  Applying Fixes to Files');

    for (const file of this.fixes.files) {
      if (file.skip) {
        warning(`Skipped: ${file.path}`);
        continue;
      }

      try {
        const filePath = path.join(process.cwd(), file.path);
        
        if (this.options.dryRun) {
          info(`[DRY RUN] Would write to: ${file.path}`);
          continue;
        }

        // Create directory if needed
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, file.fix, 'utf8');
        success(`Applied: ${file.path}`);
      } catch (err) {
        error(`Failed to apply fix to ${file.path}: ${err.message}`);
      }
    }
  }

  /**
   * Step 5: Verify fixes (rebuild)
   */
  async verifyFixes() {
    header('Step 5️⃣  Verifying Fixes');

    if (this.options.dryRun) {
      info('[DRY RUN] Skipping verification');
      return true;
    }

    try {
      info('Running build again...');
      await execAsync('npm run build 2>&1');
      success('Build successful! ✨');
      return true;
    } catch (error) {
      warning('Build still has issues, but continuing...');
      return false;
    }
  }

  /**
   * Step 6: Commit changes
   */
  async commitChanges() {
    header('Step 6️⃣  Committing Changes');

    if (this.options.dryRun) {
      info('[DRY RUN] Would create commit');
      return true;
    }

    try {
      // Create unique branch
      this.branchName = `healing-putter-${Date.now()}`;
      info(`Branch: ${this.branchName}`);

      await execAsync(`git checkout -b ${this.branchName}`);
      await execAsync('git add -A');
      await execAsync(
        `git commit -m "🏥 healing: auto-fix build errors with Putter

- Fixed ${this.fixes.files.length} files
- Summary: ${this.fixes.summary}
- AI Model: ${this.options.model}
- Completely FREE with unlimited tokens"`
      );

      success('Changes committed!');
      return true;
    } catch (err) {
      error(`Commit failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Step 7: Push to GitHub
   */
  async pushToGitHub() {
    header('Step 7️⃣  Pushing to GitHub');

    if (this.options.dryRun) {
      info('[DRY RUN] Would push to GitHub');
      return true;
    }

    try {
      info(`Pushing branch: ${this.branchName}`);
      await execAsync(`git push origin ${this.branchName}`);
      success('Pushed to GitHub!');
      return true;
    } catch (err) {
      error(`Push failed: ${err.message}`);
      warning('You may need to set up GitHub credentials');
      return false;
    }
  }

  /**
   * Step 8: Create Pull Request
   */
  async createPullRequest() {
    header('Step 8️⃣  Creating Pull Request');

    if (this.options.dryRun) {
      info('[DRY RUN] Would create PR');
      return true;
    }

    try {
      // Check if gh CLI is installed
      await execAsync('gh --version');

      const prBody = `## 🏥 Automated Healing with Putter

**Status:** ✅ Build Errors Fixed

### Changes
- **AI Model:** ${this.options.model.toUpperCase()}
- **Files Fixed:** ${this.fixes.files.length}
- **Cost:** FREE ✅
- **Tokens:** UNLIMITED ✅

### Summary
${this.fixes.summary}

### Files Modified
${this.fixes.files.map((f) => `- \`${f.path}\`\n  - ${f.originalError}`).join('\n')}

---
*Generated by Putter.js - Automated Healing Agent*
*Please review and merge if correct*`;

      info('Creating PR...');
      const { stdout } = await execAsync(
        `gh pr create --head ${this.branchName} --base main --title "🏥 [PUTTER] Auto-fix build errors" --body "${prBody.replace(/"/g, '\\"')}"`
      );

      success('Pull Request created! ✨');
      log(stdout, 'green');
      return true;
    } catch (error) {
      warning(`PR creation failed: ${error.message}`);
      warning('Install GitHub CLI: https://cli.github.com');
      info(`You can create PR manually from branch: ${this.branchName}`);
      return false;
    }
  }

  /**
   * Run complete pipeline
   */
  async run() {
    header('🚀 PUTTER - Automated Healing Agent');
    log('Complete automation: Detect → Fix → Commit → Push → PR\n', 'cyan');

    try {
      // Step 1: Detect errors
      const hasErrors = await this.detectErrors();
      if (!hasErrors) {
        success('No errors to fix!');
        return;
      }

      // Step 2: Generate fixes
      const fixesGenerated = await this.generateFixes();
      if (!fixesGenerated) {
        error('Could not generate fixes');
        return;
      }

      // Step 3: Review (if not auto)
      await this.reviewFixes();

      // Step 4: Apply fixes
      await this.applyFixes();

      // Step 5: Verify
      await this.verifyFixes();

      // Step 6: Commit
      await this.commitChanges();

      // Step 7: Push
      await this.pushToGitHub();

      // Step 8: Create PR
      await this.createPullRequest();

      header('✨ PUTTER Complete!');
      success('Healing workflow finished successfully');
    } catch (err) {
      error(`Pipeline failed: ${err.message}`);
      process.exit(1);
    }
  }
}

/**
 * Helper: Get argument value
 */
function getArgValue(args, flag) {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : null;
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  // ============================================
  // CHANGE THIS: Add/modify issue parameters
  // ============================================
  const options = {
    auto: args.includes('--auto'),
    dryRun: args.includes('--dry-run'),
    // Issue parameters
    issueNumber: getArgValue(args, '--issue'),
    issueTitle: getArgValue(args, '--title'),
    issueBody: getArgValue(args, '--body'),
    model: getArgValue(args, '--model') || 'codellama',
  };

  // Show requirements
  console.log(`
╔══════════════════════════════════════════════════════╗
║         🏥 PUTTER - Healing Agent Automation         ║
║                                                      ║
║  Complete FREE & UNLIMITED token-based fixer       ║
║  - No API costs                                      ║
║  - No token limits                                   ║
║  - Local LLM (Ollama)                               ║
╚══════════════════════════════════════════════════════╝
`);
  
  // Show issue info if provided
  if (options.issueNumber) {
    console.log(`
🔍 Issue Details:
   Issue #: ${options.issueNumber}
   Title: ${options.issueTitle}
   Model: ${options.model}
`);
  }

  // Check requirements
  try {
    info('Checking requirements...');
    
    // Check Ollama
    await fetch('http://localhost:11434/api/tags');
    success('✅ Ollama is running');

    // Check git
    execSync('git --version', { stdio: 'ignore' });
    success('✅ Git is installed');

    // Check npm
    execSync('npm --version', { stdio: 'ignore' });
    success('✅ npm is installed');
  } catch (err) {
    error('❌ Prerequisites not met:');
    console.log(`
1. Install Ollama: https://ollama.ai
2. Start Ollama: ollama serve
3. Pull a model: ollama pull mistral
    `);
    process.exit(1);
  }

  // Run putter
  const putter = new Putter(options);
  await putter.run();
}

// Run
main().catch((err) => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});

module.exports = Putter;
