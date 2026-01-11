#!/usr/bin/env node
/**
 * =============================================================================
 * SETUP - Git Hook'lari ve Tracker Kurulumu
 * =============================================================================
 *
 * Bu script npm install sirasinda otomatik calisir:
 * 1. Git hook'larini .git/hooks/ klasorune kopyalar
 * 2. Baslangic timestamp'ini kaydeder
 * 3. Tracker'in calisabilecegi ortami hazirlar
 *
 * KULLANIM:
 * ---------
 * node tracker/setup.js           # Normal kurulum
 * node tracker/setup.js --force   # Mevcut hook'lari override et
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// =============================================================================
// PATH SETUP
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_PATH = path.resolve(__dirname, '..');
const HOOKS_SOURCE = path.join(__dirname, 'hooks');
const GIT_HOOKS_PATH = path.join(BASE_PATH, '.git', 'hooks');

// =============================================================================
// HOOK INSTALLER
// =============================================================================

/**
 * Git hook'larini kur
 */
function installHooks(force = false) {
  console.log('[Setup] Installing git hooks...');

  // .git klasoru var mi kontrol et
  const gitPath = path.join(BASE_PATH, '.git');
  if (!fs.existsSync(gitPath)) {
    console.log('[Setup] Not a git repository - skipping hooks');
    return false;
  }

  // hooks klasoru yoksa olustur
  if (!fs.existsSync(GIT_HOOKS_PATH)) {
    fs.mkdirSync(GIT_HOOKS_PATH, { recursive: true });
  }

  // Hook dosyalarini kopyala
  const hooks = ['post-checkout', 'pre-commit', 'pre-push'];
  let installed = 0;

  for (const hook of hooks) {
    const sourcePath = path.join(HOOKS_SOURCE, hook);
    const destPath = path.join(GIT_HOOKS_PATH, hook);

    // Source var mi kontrol et
    if (!fs.existsSync(sourcePath)) {
      console.log(`[Setup] Hook source not found: ${hook}`);
      continue;
    }

    // Hedef zaten var mi
    if (fs.existsSync(destPath) && !force) {
      console.log(`[Setup] Hook already exists: ${hook} (use --force to override)`);
      continue;
    }

    try {
      // Kopyala
      fs.copyFileSync(sourcePath, destPath);

      // Unix'te executable yap
      if (process.platform !== 'win32') {
        fs.chmodSync(destPath, '755');
      }

      console.log(`[Setup] Installed hook: ${hook}`);
      installed++;
    } catch (error) {
      console.error(`[Setup] Failed to install ${hook}:`, error.message);
    }
  }

  console.log(`[Setup] ${installed} hooks installed`);
  return installed > 0;
}

/**
 * Windows icin hook wrapper olustur
 */
function createWindowsHookWrappers() {
  if (process.platform !== 'win32') return;

  console.log('[Setup] Creating Windows hook wrappers...');

  const hooks = ['post-checkout', 'pre-commit', 'pre-push'];

  for (const hook of hooks) {
    const hookPath = path.join(GIT_HOOKS_PATH, hook);
    const wrapperContent = `#!/bin/sh
# Windows wrapper for ${hook}
node "${path.join(__dirname, 'hooks', hook + '.js').replace(/\\/g, '/')}" "$@"
`;

    try {
      fs.writeFileSync(hookPath, wrapperContent, { mode: 0o755 });
    } catch (error) {
      console.error(`[Setup] Failed to create wrapper for ${hook}:`, error.message);
    }
  }
}

/**
 * Baslangic timestamp'ini kaydet
 */
function recordStartTime() {
  console.log('[Setup] Recording start time...');

  const startFile = path.join(BASE_PATH, '.tracker-start');
  const now = new Date().toISOString();

  // Zaten var mi
  if (fs.existsSync(startFile)) {
    console.log('[Setup] Start time already recorded');
    return;
  }

  fs.writeFileSync(startFile, now, 'utf-8');
  console.log(`[Setup] Start time recorded: ${now}`);
}

/**
 * solution klasorunu olustur
 */
function createSolutionFolder() {
  const solutionPath = path.join(BASE_PATH, 'solution');

  if (!fs.existsSync(solutionPath)) {
    fs.mkdirSync(solutionPath, { recursive: true });
    console.log('[Setup] Created solution folder');
  }
}

/**
 * .gitignore guncelle
 */
function updateGitignore() {
  const gitignorePath = path.join(BASE_PATH, '.gitignore');
  const linesToAdd = [
    '# Tracker files (do not ignore - needed for submission)',
    '# .tracker-session.json',
    '# tracker-report.json',
    '',
    '# Node modules',
    'node_modules/',
    '',
    '# Build output',
    'dist/',
    '',
    '# IDE',
    '.idea/',
    '.vscode/',
    ''
  ];

  let content = '';
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf-8');
  }

  // Zaten eklenmis mi kontrol et
  if (content.includes('.tracker-session.json')) {
    return;
  }

  content += '\n' + linesToAdd.join('\n');
  fs.writeFileSync(gitignorePath, content, 'utf-8');
  console.log('[Setup] Updated .gitignore');
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║              CASE STUDY TRACKER SETUP                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  const force = process.argv.includes('--force');

  try {
    // 1. Git hook'lari kur
    installHooks(force);

    // 2. Windows wrapper'lari olustur
    if (process.platform === 'win32') {
      createWindowsHookWrappers();
    }

    // 3. Baslangic zamanini kaydet
    recordStartTime();

    // 4. Solution klasorunu olustur
    createSolutionFolder();

    // 5. .gitignore guncelle
    updateGitignore();

    console.log('');
    console.log('[Setup] ✅ Setup complete!');
    console.log('');
    console.log('To start tracking, run:');
    console.log('  npm run track');
    console.log('');
    console.log('To see your stats:');
    console.log('  npm run stats');
    console.log('');

  } catch (error) {
    console.error('[Setup] Error:', error.message);
    process.exit(1);
  }
}

main();
