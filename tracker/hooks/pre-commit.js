#!/usr/bin/env node
/**
 * PRE-COMMIT HOOK (JavaScript Version)
 * ====================================
 * Windows icin JavaScript implementasyonu.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { SessionManager } from '../session-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basePath = path.resolve(__dirname, '../..');
const manager = new SessionManager(basePath);

manager.recordActivity('commit');
console.log('[Hook] pre-commit: Activity recorded');

// Her zaman commit'e izin ver
process.exit(0);
