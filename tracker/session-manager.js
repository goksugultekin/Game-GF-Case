/**
 * =============================================================================
 * SESSION MANAGER - Calisma Oturumu Yonetimi
 * =============================================================================
 *
 * Bu modul adayin calisma oturumlarini yonetir:
 * - Session baslangic/bitis zamanlari
 * - Inaktivite tespiti (15 dk hareketsizlik = yeni session)
 * - Session suresi hesaplama
 * - Veri persistance (JSON dosyasi)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

// =============================================================================
// KONFIGURASYON
// =============================================================================

const CONFIG = {
  // 15 dakika inaktivite = session sonu
  INACTIVITY_THRESHOLD_MS: 15 * 60 * 1000,

  // Session dosyasi
  SESSION_FILE: '.tracker-session.json',

  // Checksum icin salt
  CHECKSUM_SALT: 'ggf3-case-study-2024'
};

// =============================================================================
// SESSION MANAGER CLASS
// =============================================================================

export class SessionManager {
  constructor(basePath) {
    this.basePath = basePath;
    this.sessionFilePath = path.join(basePath, CONFIG.SESSION_FILE);
    this.data = null;
    this.currentSession = null;

    this.load();
  }

  // ---------------------------------------------------------------------------
  // DATA MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Session verisini yukle veya yeni olustur
   */
  load() {
    try {
      if (fs.existsSync(this.sessionFilePath)) {
        const raw = fs.readFileSync(this.sessionFilePath, 'utf-8');
        this.data = JSON.parse(raw);

        // Checksum dogrula
        if (!this.verifyChecksum()) {
          console.warn('[Tracker] Session file checksum mismatch - creating new');
          this.initializeData();
        }

        // Acik session var mi kontrol et
        const openSession = this.data.sessions.find(s => !s.endedAt);
        if (openSession) {
          this.currentSession = openSession;
        }
      } else {
        this.initializeData();
      }
    } catch (error) {
      console.warn('[Tracker] Error loading session:', error.message);
      this.initializeData();
    }
  }

  /**
   * Yeni session verisi olustur
   */
  initializeData() {
    const now = new Date().toISOString();

    this.data = {
      _version: '1.0',
      _createdAt: now,
      candidate: {
        id: this.generateCandidateId(),
        machineId: this.getMachineId(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      timeline: {
        repoCloned: now,
        firstActivity: null,
        lastActivity: null,
        submitted: null
      },
      sessions: [],
      commits: [],
      filesModified: new Set()
    };

    this.save();
  }

  /**
   * Session verisini kaydet
   */
  save() {
    try {
      // Set'i array'e cevir (JSON icin)
      const dataToSave = {
        ...this.data,
        filesModified: Array.from(this.data.filesModified || []),
        _checksum: null // Once null, sonra hesapla
      };

      // Checksum hesapla
      dataToSave._checksum = this.calculateChecksum(dataToSave);

      fs.writeFileSync(
        this.sessionFilePath,
        JSON.stringify(dataToSave, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('[Tracker] Error saving session:', error.message);
    }
  }

  // ---------------------------------------------------------------------------
  // SESSION LIFECYCLE
  // ---------------------------------------------------------------------------

  /**
   * Aktivite kaydet - dosya degisikligi veya git commit
   */
  recordActivity(filePath = null) {
    const now = new Date().toISOString();

    // Ilk aktivite mi?
    if (!this.data.timeline.firstActivity) {
      this.data.timeline.firstActivity = now;
    }

    // Son aktiviteyi guncelle
    this.data.timeline.lastActivity = now;

    // Dosya kaydet
    if (filePath) {
      if (!this.data.filesModified) {
        this.data.filesModified = new Set();
      }
      if (this.data.filesModified instanceof Array) {
        this.data.filesModified = new Set(this.data.filesModified);
      }
      this.data.filesModified.add(filePath);
    }

    // Session yonetimi
    if (!this.currentSession) {
      // Yeni session baslat
      this.startNewSession(now);
    } else {
      // Inaktivite kontrolu
      const lastActivity = new Date(this.currentSession.lastActivity);
      const nowDate = new Date(now);
      const gap = nowDate - lastActivity;

      if (gap > CONFIG.INACTIVITY_THRESHOLD_MS) {
        // Eski session'i kapat, yeni baslat
        this.endCurrentSession(this.currentSession.lastActivity);
        this.startNewSession(now);
      } else {
        // Mevcut session'i guncelle
        this.currentSession.lastActivity = now;
        this.currentSession.eventCount++;
      }
    }

    this.save();
  }

  /**
   * Yeni session baslat
   */
  startNewSession(timestamp) {
    this.currentSession = {
      id: this.data.sessions.length + 1,
      startedAt: timestamp,
      lastActivity: timestamp,
      endedAt: null,
      durationMinutes: 0,
      eventCount: 1
    };

    this.data.sessions.push(this.currentSession);
    console.log(`[Tracker] Session ${this.currentSession.id} started`);
  }

  /**
   * Mevcut session'i kapat
   */
  endCurrentSession(endTime = null) {
    if (!this.currentSession) return;

    const end = endTime || new Date().toISOString();
    this.currentSession.endedAt = end;

    // Sure hesapla
    const start = new Date(this.currentSession.startedAt);
    const endDate = new Date(end);
    this.currentSession.durationMinutes = Math.round((endDate - start) / 60000);

    console.log(`[Tracker] Session ${this.currentSession.id} ended (${this.currentSession.durationMinutes} min)`);

    this.currentSession = null;
    this.save();
  }

  /**
   * Git commit kaydet
   */
  recordCommit(hash, message) {
    const now = new Date().toISOString();

    this.data.commits.push({
      hash: hash.substring(0, 7),
      message: message.substring(0, 100),
      timestamp: now
    });

    this.recordActivity();
  }

  /**
   * Teslim olarak isaretle
   */
  markSubmitted() {
    const now = new Date().toISOString();
    this.data.timeline.submitted = now;
    this.endCurrentSession();
    this.save();

    console.log('[Tracker] Submission recorded');
  }

  // ---------------------------------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------------------------------

  /**
   * Toplam aktif calisma suresi (dakika)
   */
  getTotalActiveMinutes() {
    let total = 0;

    for (const session of this.data.sessions) {
      if (session.durationMinutes) {
        total += session.durationMinutes;
      } else if (session.startedAt && !session.endedAt) {
        // Acik session - simdiye kadar hesapla
        const start = new Date(session.startedAt);
        const now = new Date();
        total += Math.round((now - start) / 60000);
      }
    }

    return total;
  }

  /**
   * Toplam gecen sure (ilk aktiviteden son aktiviteye)
   */
  getTotalElapsedMinutes() {
    if (!this.data.timeline.firstActivity || !this.data.timeline.lastActivity) {
      return 0;
    }

    const first = new Date(this.data.timeline.firstActivity);
    const last = new Date(this.data.timeline.lastActivity);

    return Math.round((last - first) / 60000);
  }

  /**
   * Istatistikleri al
   */
  getStats() {
    const activeMinutes = this.getTotalActiveMinutes();
    const elapsedMinutes = this.getTotalElapsedMinutes();

    return {
      sessions: this.data.sessions.length,
      commits: this.data.commits.length,
      filesModified: this.data.filesModified?.size ||
                     (Array.isArray(this.data.filesModified) ? this.data.filesModified.length : 0),
      activeTime: this.formatDuration(activeMinutes),
      activeMinutes,
      elapsedTime: this.formatDuration(elapsedMinutes),
      elapsedMinutes,
      timeline: this.data.timeline
    };
  }

  /**
   * Tum veriyi al (rapor icin)
   */
  getData() {
    return {
      ...this.data,
      filesModified: Array.from(this.data.filesModified || [])
    };
  }

  // ---------------------------------------------------------------------------
  // HELPER METHODS
  // ---------------------------------------------------------------------------

  /**
   * Dakikayi okunabilir formata cevir
   */
  formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  /**
   * Benzersiz aday ID olustur
   */
  generateCandidateId() {
    return crypto.randomUUID();
  }

  /**
   * Makine ID olustur (hash'lenmis)
   */
  getMachineId() {
    const raw = `${os.hostname()}-${os.platform()}-${os.arch()}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
  }

  /**
   * Checksum hesapla
   */
  calculateChecksum(data) {
    const content = JSON.stringify({
      ...data,
      _checksum: undefined
    });
    return crypto
      .createHash('sha256')
      .update(CONFIG.CHECKSUM_SALT + content)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Checksum dogrula
   */
  verifyChecksum() {
    if (!this.data._checksum) return true; // Eski format

    const expected = this.calculateChecksum(this.data);
    return this.data._checksum === expected;
  }
}

export default SessionManager;
