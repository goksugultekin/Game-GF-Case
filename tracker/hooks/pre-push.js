#!/usr/bin/env node
/**
 * PRE-PUSH HOOK (JavaScript Version)
 * ===================================
 * Windows icin JavaScript implementasyonu.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { SessionManager } from '../session-manager.js';
import { ReportGenerator } from '../report-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basePath = path.resolve(__dirname, '../..');

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║              GENERATING SUBMISSION REPORT                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Session'i kapat ve teslim olarak isaretle
  const manager = new SessionManager(basePath);
  manager.markSubmitted();

  // Rapor olustur
  const report = new ReportGenerator(basePath);
  await report.generateAll();

  console.log('');
  console.log('[Hook] pre-push: Submission report generated');
  console.log('[Hook] Please ensure tracker-report.json is included in your push.');
  console.log('');

  // Push'a izin ver
  process.exit(0);
}

main().catch(error => {
  console.error('[Hook] Error:', error.message);
  process.exit(0); // Hata olsa bile push'a izin ver
});
