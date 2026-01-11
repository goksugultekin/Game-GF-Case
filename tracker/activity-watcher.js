/**
 * =============================================================================
 * ACTIVITY WATCHER - Dosya Degisiklik Izleyici
 * =============================================================================
 *
 * Bu modul solution/ klasorundeki dosya degisikliklerini izler.
 * Her degisiklikte SessionManager'a bildirir.
 *
 * Native Node.js fs.watch kullanir (ek dependency yok).
 */

import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

// =============================================================================
// KONFIGURASYON
// =============================================================================

const CONFIG = {
  // Izlenecek dosya uzantilari
  WATCH_EXTENSIONS: ['.ts', '.js', '.tsx', '.jsx', '.json', '.css', '.html'],

  // Yoksayilacak klasorler
  IGNORE_DIRS: ['node_modules', '.git', 'dist', 'build', 'coverage', '.tracker-session.json'],

  // Debounce suresi (ayni dosya icin ardisik degisiklikler)
  DEBOUNCE_MS: 1000,

  // Heartbeat suresi (session aktif mi kontrolu)
  HEARTBEAT_INTERVAL_MS: 60 * 1000 // 1 dakika
};

// =============================================================================
// ACTIVITY WATCHER CLASS
// =============================================================================

export class ActivityWatcher extends EventEmitter {
  constructor(watchPath, sessionManager) {
    super();
    this.watchPath = watchPath;
    this.sessionManager = sessionManager;
    this.watchers = [];
    this.debounceTimers = new Map();
    this.heartbeatInterval = null;
    this.isRunning = false;
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  /**
   * Izlemeyi baslat
   */
  start() {
    if (this.isRunning) {
      console.log('[Watcher] Already running');
      return;
    }

    console.log(`[Watcher] Starting to watch: ${this.watchPath}`);

    // Klasor var mi kontrol et
    if (!fs.existsSync(this.watchPath)) {
      console.log(`[Watcher] Creating directory: ${this.watchPath}`);
      fs.mkdirSync(this.watchPath, { recursive: true });
    }

    // Recursive watch baslat
    this.watchDirectory(this.watchPath);

    // Heartbeat baslat
    this.startHeartbeat();

    this.isRunning = true;
    this.emit('started');

    console.log('[Watcher] Watching for file changes...');
  }

  /**
   * Izlemeyi durdur
   */
  stop() {
    if (!this.isRunning) return;

    // Tum watcher'lari kapat
    for (const watcher of this.watchers) {
      try {
        watcher.close();
      } catch (e) {
        // Ignore
      }
    }
    this.watchers = [];

    // Heartbeat durdur
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Debounce timer'lari temizle
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    this.isRunning = false;
    this.emit('stopped');

    console.log('[Watcher] Stopped');
  }

  // ---------------------------------------------------------------------------
  // WATCHING
  // ---------------------------------------------------------------------------

  /**
   * Bir klasoru izle (recursive)
   */
  watchDirectory(dirPath) {
    // Yoksayilacak mi kontrol et
    const dirName = path.basename(dirPath);
    if (CONFIG.IGNORE_DIRS.includes(dirName)) {
      return;
    }

    try {
      // Bu klasoru izle
      const watcher = fs.watch(dirPath, { persistent: true }, (eventType, filename) => {
        if (filename) {
          this.handleFileEvent(eventType, path.join(dirPath, filename));
        }
      });

      watcher.on('error', (error) => {
        console.error(`[Watcher] Error watching ${dirPath}:`, error.message);
      });

      this.watchers.push(watcher);

      // Alt klasorleri de izle
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !CONFIG.IGNORE_DIRS.includes(entry.name)) {
          this.watchDirectory(path.join(dirPath, entry.name));
        }
      }
    } catch (error) {
      // Klasor okunamiyor - muhtemelen permission sorunu
      console.error(`[Watcher] Cannot watch ${dirPath}:`, error.message);
    }
  }

  /**
   * Dosya olayini isle
   */
  handleFileEvent(eventType, filePath) {
    // Dosya uzantisi kontrol et
    const ext = path.extname(filePath).toLowerCase();
    if (!CONFIG.WATCH_EXTENSIONS.includes(ext)) {
      return;
    }

    // Yoksayilacak dosya/klasor kontrol et
    for (const ignore of CONFIG.IGNORE_DIRS) {
      if (filePath.includes(ignore)) {
        return;
      }
    }

    // Debounce - ayni dosya icin cok hizli event'leri biriktir
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath));
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      this.onFileChange(filePath);
    }, CONFIG.DEBOUNCE_MS);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Dosya degisikligi oldu
   */
  onFileChange(filePath) {
    // Relative path hesapla
    const relativePath = path.relative(this.watchPath, filePath);

    console.log(`[Watcher] File changed: ${relativePath}`);

    // Session manager'a bildir
    if (this.sessionManager) {
      this.sessionManager.recordActivity(relativePath);
    }

    // Event emit et
    this.emit('change', {
      path: filePath,
      relativePath,
      timestamp: new Date().toISOString()
    });
  }

  // ---------------------------------------------------------------------------
  // HEARTBEAT
  // ---------------------------------------------------------------------------

  /**
   * Periyodik kontrol baslat
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      // Session manager'in durumunu kontrol et
      if (this.sessionManager) {
        const stats = this.sessionManager.getStats();
        console.log(`[Watcher] Heartbeat - Active: ${stats.activeTime}, Sessions: ${stats.sessions}`);
      }
    }, CONFIG.HEARTBEAT_INTERVAL_MS);
  }
}

export default ActivityWatcher;
