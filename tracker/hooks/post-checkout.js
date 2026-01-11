#!/usr/bin/env node
/**
 * POST-CHECKOUT HOOK (JavaScript Version)
 * =======================================
 * Windows icin JavaScript implementasyonu.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { SessionManager } from '../session-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basePath = path.resolve(__dirname, '../..');
const manager = new SessionManager(basePath);

manager.recordActivity('checkout');
console.log('[Hook] post-checkout: Activity recorded');
