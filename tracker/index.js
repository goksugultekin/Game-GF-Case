#!/usr/bin/env node
/**
 * =============================================================================
 * ACTIVITY TRACKER - Ana Giris Noktasi
 * =============================================================================
 *
 * Bu modul case study icin calisma suresi takip sisteminin ana girisidir.
 *
 * KULLANIM:
 * ---------
 * node tracker/index.js start     # Tracker'i baslat
 * node tracker/index.js stop      # Tracker'i durdur
 * node tracker/index.js stats     # Hizli istatistik goster
 * node tracker/index.js report    # Detayli rapor olustur
 * node tracker/index.js record    # Manuel aktivite kaydet
 *
 * ORTAM DEGISKENLERI:
 * -------------------
 * TRACKER_WATCH_PATH  - Izlenecek klasor (default: ./solution)
 * TRACKER_BASE_PATH   - Tracker veri klasoru (default: .)
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { SessionManager } from './session-manager.js';
import { ActivityWatcher } from './activity-watcher.js';
import { ReportGenerator } from './report-generator.js';

// =============================================================================
// PATH SETUP
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default paths
const BASE_PATH = process.env.TRACKER_BASE_PATH || path.resolve(__dirname, '..');
const WATCH_PATH = process.env.TRACKER_WATCH_PATH || path.join(BASE_PATH, 'solution');

// =============================================================================
// GLOBAL INSTANCES
// =============================================================================

let sessionManager = null;
let activityWatcher = null;
let reportGenerator = null;

// =============================================================================
// COMMANDS
// =============================================================================

/**
 * Tracker'i baslat
 */
async function startTracker() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║              CASE STUDY ACTIVITY TRACKER                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`[Tracker] Base path: ${BASE_PATH}`);
  console.log(`[Tracker] Watch path: ${WATCH_PATH}`);
  console.log('');

  // Session manager olustur
  sessionManager = new SessionManager(BASE_PATH);

  // Activity watcher olustur ve baslat
  activityWatcher = new ActivityWatcher(WATCH_PATH, sessionManager);
  activityWatcher.start();

  // Ilk aktiviteyi kaydet
  sessionManager.recordActivity('_tracker_started');

  console.log('');
  console.log('[Tracker] ✅ Tracking started!');
  console.log('[Tracker] Your work time is being recorded.');
  console.log('[Tracker] Press Ctrl+C to stop.');
  console.log('');

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[Tracker] Shutting down...');
    stopTracker();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    stopTracker();
    process.exit(0);
  });

  // Keep alive
  setInterval(() => {}, 60000);
}

/**
 * Tracker'i durdur
 */
function stopTracker() {
  if (activityWatcher) {
    activityWatcher.stop();
  }

  if (sessionManager) {
    sessionManager.endCurrentSession();
  }

  console.log('[Tracker] Stopped.');
}

/**
 * Hizli istatistik goster
 */
function showStats() {
  const report = new ReportGenerator(BASE_PATH);
  report.printQuickStats();
}

/**
 * Detayli rapor olustur
 */
async function generateReport() {
  const report = new ReportGenerator(BASE_PATH);
  await report.generateAll();
}

/**
 * Manuel aktivite kaydet
 */
function recordActivity(message = 'manual') {
  const manager = new SessionManager(BASE_PATH);
  manager.recordActivity(message);
  console.log(`[Tracker] Activity recorded: ${message}`);
}

/**
 * Commit kaydet (git hook'tan cagirilir)
 */
function recordCommit(hash, message) {
  const manager = new SessionManager(BASE_PATH);
  manager.recordCommit(hash, message);
  console.log(`[Tracker] Commit recorded: ${hash}`);
}

/**
 * Teslim olarak isaretle
 */
function markSubmit() {
  const manager = new SessionManager(BASE_PATH);
  manager.markSubmitted();

  // Rapor olustur
  const report = new ReportGenerator(BASE_PATH);
  report.generateAll();
}

// =============================================================================
// CLI HANDLER
// =============================================================================

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'start';

  switch (command) {
    case 'start':
      startTracker();
      break;

    case 'stop':
      stopTracker();
      break;

    case 'stats':
      showStats();
      break;

    case 'report':
      generateReport();
      break;

    case 'record':
      recordActivity(args[1] || 'manual');
      break;

    case 'commit':
      recordCommit(args[1] || 'unknown', args[2] || 'no message');
      break;

    case 'submit':
      markSubmit();
      break;

    case 'help':
    default:
      console.log('');
      console.log('Activity Tracker - Case Study Work Time Tracker');
      console.log('');
      console.log('Usage: node tracker/index.js <command>');
      console.log('');
      console.log('Commands:');
      console.log('  start     Start tracking (default)');
      console.log('  stop      Stop tracking');
      console.log('  stats     Show quick statistics');
      console.log('  report    Generate detailed report');
      console.log('  record    Record manual activity');
      console.log('  commit    Record git commit (used by hooks)');
      console.log('  submit    Mark as submitted and generate report');
      console.log('  help      Show this help');
      console.log('');
      break;
  }
}

// Run
main();
