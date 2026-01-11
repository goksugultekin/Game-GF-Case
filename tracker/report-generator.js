/**
 * =============================================================================
 * REPORT GENERATOR - Calisma Raporu Olusturucu
 * =============================================================================
 *
 * Bu modul adayin calisma raporunu olusturur:
 * - Human-readable text rapor
 * - JSON veri raporu
 * - Konsol ciktisi
 */

import fs from 'fs';
import path from 'path';
import { SessionManager } from './session-manager.js';
import { GitIntegration } from './git-integration.js';

// =============================================================================
// REPORT GENERATOR CLASS
// =============================================================================

export class ReportGenerator {
  constructor(basePath) {
    this.basePath = basePath;
    this.sessionManager = new SessionManager(basePath);
    this.gitIntegration = new GitIntegration(basePath);
  }

  // ---------------------------------------------------------------------------
  // RAPOR OLUSTURMA
  // ---------------------------------------------------------------------------

  /**
   * Tum raporlari olustur
   */
  async generateAll() {
    console.log('\n[Report] Generating activity report...\n');

    // Verileri topla
    const sessionData = this.sessionManager.getData();
    const sessionStats = this.sessionManager.getStats();
    const gitSummary = this.gitIntegration.getSummary();
    const gitCommits = this.gitIntegration.getRecentCommits();

    // Rapor verisi
    const report = {
      generated: new Date().toISOString(),
      summary: {
        ...sessionStats,
        git: gitSummary
      },
      sessions: sessionData.sessions,
      commits: gitCommits.slice(0, 20), // Son 20 commit
      timeline: sessionData.timeline,
      candidate: sessionData.candidate
    };

    // Raporlari kaydet
    await this.saveJsonReport(report);
    this.printConsoleReport(report);

    return report;
  }

  /**
   * JSON raporu kaydet
   */
  async saveJsonReport(report) {
    const reportPath = path.join(this.basePath, 'tracker-report.json');

    fs.writeFileSync(
      reportPath,
      JSON.stringify(report, null, 2),
      'utf-8'
    );

    console.log(`[Report] JSON report saved: ${reportPath}`);
    return reportPath;
  }

  /**
   * Konsol raporu yazdir
   */
  printConsoleReport(report) {
    const { summary, sessions, timeline } = report;

    console.log('');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('                     CASE STUDY WORK REPORT                      ');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('');

    // Tarihler
    console.log('📅 TIMELINE');
    console.log('────────────────────────────────────────────────────────────────');
    console.log(`   Started:      ${this.formatDate(timeline.firstActivity)}`);
    console.log(`   Last Active:  ${this.formatDate(timeline.lastActivity)}`);
    if (timeline.submitted) {
      console.log(`   Submitted:    ${this.formatDate(timeline.submitted)}`);
    }
    console.log('');

    // Calisma suresi
    console.log('⏱️  WORK TIME');
    console.log('────────────────────────────────────────────────────────────────');
    console.log(`   Active Time:  ${summary.activeTime} (${summary.activeMinutes} minutes)`);
    console.log(`   Elapsed Time: ${summary.elapsedTime} (wall clock)`);
    console.log(`   Sessions:     ${summary.sessions}`);
    console.log('');

    // Session detaylari
    if (sessions && sessions.length > 0) {
      console.log('📊 SESSION BREAKDOWN');
      console.log('────────────────────────────────────────────────────────────────');

      for (const session of sessions) {
        const start = this.formatTime(session.startedAt);
        const end = session.endedAt ? this.formatTime(session.endedAt) : 'ongoing';
        const duration = session.durationMinutes || '?';
        const status = session.endedAt ? '' : ' (active)';

        console.log(`   Session ${session.id}: ${start} - ${end} (${duration} min)${status}`);
      }
      console.log('');

      // Gorsel timeline
      this.printVisualTimeline(sessions);
    }

    // Git istatistikleri
    console.log('🔧 GIT ACTIVITY');
    console.log('────────────────────────────────────────────────────────────────');
    console.log(`   Commits:      ${summary.git?.totalCommits || summary.commits || 0}`);
    console.log(`   Files Changed: ${summary.git?.filesChanged || summary.filesModified || 0}`);
    console.log('');

    // 4 saat hedefi kontrolu
    const targetMinutes = 4 * 60; // 4 saat
    const activeMinutes = summary.activeMinutes || 0;
    const percentage = Math.round((activeMinutes / targetMinutes) * 100);

    console.log('🎯 TARGET CHECK (4 hours)');
    console.log('────────────────────────────────────────────────────────────────');
    console.log(`   Target:       4h 0m (240 minutes)`);
    console.log(`   Actual:       ${summary.activeTime}`);
    console.log(`   Progress:     ${percentage}%`);
    console.log(`   Status:       ${this.getTargetStatus(activeMinutes, targetMinutes)}`);
    console.log('');

    console.log('════════════════════════════════════════════════════════════════');
    console.log('');
  }

  /**
   * Gorsel timeline yazdir
   */
  printVisualTimeline(sessions) {
    if (!sessions || sessions.length === 0) return;

    console.log('📈 VISUAL TIMELINE');
    console.log('────────────────────────────────────────────────────────────────');

    // Tum session'larin zaman araligini bul
    const allTimes = sessions.flatMap(s => [
      new Date(s.startedAt).getTime(),
      new Date(s.endedAt || s.lastActivity || s.startedAt).getTime()
    ]);

    const minTime = Math.min(...allTimes);
    const maxTime = Math.max(...allTimes);
    const totalRange = maxTime - minTime;

    if (totalRange <= 0) return;

    const barWidth = 50; // karakter

    for (const session of sessions) {
      const start = new Date(session.startedAt).getTime();
      const end = new Date(session.endedAt || session.lastActivity || session.startedAt).getTime();

      const startPos = Math.round(((start - minTime) / totalRange) * barWidth);
      const endPos = Math.round(((end - minTime) / totalRange) * barWidth);
      const width = Math.max(1, endPos - startPos);

      const bar = '░'.repeat(startPos) + '█'.repeat(width) + '░'.repeat(barWidth - startPos - width);

      console.log(`   S${session.id}: [${bar}] ${session.durationMinutes || 0}m`);
    }
    console.log('');
  }

  // ---------------------------------------------------------------------------
  // HIZLI ISTATISTIK
  // ---------------------------------------------------------------------------

  /**
   * Sadece ozet istatistik yazdir
   */
  printQuickStats() {
    const stats = this.sessionManager.getStats();

    console.log('');
    console.log('📊 Quick Stats');
    console.log('──────────────');
    console.log(`   Active Time: ${stats.activeTime}`);
    console.log(`   Sessions:    ${stats.sessions}`);
    console.log(`   Commits:     ${stats.commits}`);
    console.log(`   Files:       ${stats.filesModified}`);
    console.log('');
  }

  // ---------------------------------------------------------------------------
  // HELPER METHODS
  // ---------------------------------------------------------------------------

  /**
   * ISO tarihi okunabilir formata cevir
   */
  formatDate(isoString) {
    if (!isoString) return 'N/A';

    const date = new Date(isoString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * ISO tarihi sadece saat olarak formatla
   */
  formatTime(isoString) {
    if (!isoString) return 'N/A';

    const date = new Date(isoString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Hedef durumunu belirle
   */
  getTargetStatus(actual, target) {
    const ratio = actual / target;

    if (ratio < 0.5) return '⚠️  Under 50% - May need more time';
    if (ratio < 0.8) return '📝 Good progress';
    if (ratio <= 1.2) return '✅ On target';
    if (ratio <= 1.5) return '📌 Slightly over target';
    return '⏰ Significantly over target';
  }
}

export default ReportGenerator;
