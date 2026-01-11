/**
 * =============================================================================
 * GIT INTEGRATION - Git Islemleri Entegrasyonu
 * =============================================================================
 *
 * Bu modul git komutlarini calistirarak:
 * - Commit gecmisini okur
 * - Commit hash ve mesajlarini alir
 * - Dosya degisikliklerini analiz eder
 */

import { execSync, exec } from 'child_process';
import path from 'path';

// =============================================================================
// GIT INTEGRATION CLASS
// =============================================================================

export class GitIntegration {
  constructor(repoPath) {
    this.repoPath = repoPath;
  }

  // ---------------------------------------------------------------------------
  // COMMIT BILGILERI
  // ---------------------------------------------------------------------------

  /**
   * Son N commit'i al
   */
  getRecentCommits(count = 50) {
    try {
      const output = this.runGitCommand(
        `git log -${count} --format="%H|%aI|%s" --no-merges`
      );

      if (!output) return [];

      return output
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [hash, timestamp, message] = line.split('|');
          return {
            hash: hash.substring(0, 7),
            fullHash: hash,
            timestamp,
            message
          };
        });
    } catch (error) {
      console.error('[Git] Error getting commits:', error.message);
      return [];
    }
  }

  /**
   * Ilk commit zamanini al
   */
  getFirstCommitTime() {
    try {
      const output = this.runGitCommand(
        'git log --reverse --format="%aI" | head -1'
      );
      return output?.trim() || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Son commit zamanini al
   */
  getLastCommitTime() {
    try {
      const output = this.runGitCommand(
        'git log -1 --format="%aI"'
      );
      return output?.trim() || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Son commit hash'ini al
   */
  getLastCommitHash() {
    try {
      const output = this.runGitCommand('git rev-parse HEAD');
      return output?.trim()?.substring(0, 7) || null;
    } catch (error) {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // DOSYA ANALIZI
  // ---------------------------------------------------------------------------

  /**
   * Tum commit'lerde degisen dosyalari al
   */
  getAllChangedFiles() {
    try {
      const output = this.runGitCommand(
        'git log --name-only --format="" --no-merges'
      );

      if (!output) return [];

      const files = new Set(
        output
          .split('\n')
          .filter(line => line.trim())
          .map(file => file.trim())
      );

      return Array.from(files);
    } catch (error) {
      console.error('[Git] Error getting changed files:', error.message);
      return [];
    }
  }

  /**
   * Commit basina degisiklik sayisi
   */
  getCommitStats() {
    try {
      const commits = this.getRecentCommits();
      const stats = [];

      for (const commit of commits) {
        try {
          const output = this.runGitCommand(
            `git show --stat --format="" ${commit.fullHash}`
          );

          // Son satir: "X files changed, Y insertions(+), Z deletions(-)"
          const lines = output.split('\n').filter(l => l.trim());
          const summaryLine = lines[lines.length - 1] || '';

          const filesMatch = summaryLine.match(/(\d+) files? changed/);
          const insertMatch = summaryLine.match(/(\d+) insertions?\(\+\)/);
          const deleteMatch = summaryLine.match(/(\d+) deletions?\(-\)/);

          stats.push({
            ...commit,
            filesChanged: filesMatch ? parseInt(filesMatch[1]) : 0,
            insertions: insertMatch ? parseInt(insertMatch[1]) : 0,
            deletions: deleteMatch ? parseInt(deleteMatch[1]) : 0
          });
        } catch (e) {
          stats.push({ ...commit, filesChanged: 0, insertions: 0, deletions: 0 });
        }
      }

      return stats;
    } catch (error) {
      console.error('[Git] Error getting commit stats:', error.message);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // ZAMAN ANALIZI
  // ---------------------------------------------------------------------------

  /**
   * Commit'ler arasi bosluk analizi
   */
  analyzeCommitGaps() {
    const commits = this.getRecentCommits();
    if (commits.length < 2) return { gaps: [], avgGapMinutes: 0 };

    const gaps = [];

    for (let i = 0; i < commits.length - 1; i++) {
      const current = new Date(commits[i].timestamp);
      const previous = new Date(commits[i + 1].timestamp);
      const gapMinutes = Math.round((current - previous) / 60000);

      gaps.push({
        from: commits[i + 1].hash,
        to: commits[i].hash,
        gapMinutes
      });
    }

    const avgGapMinutes = gaps.length > 0
      ? Math.round(gaps.reduce((sum, g) => sum + g.gapMinutes, 0) / gaps.length)
      : 0;

    return { gaps, avgGapMinutes };
  }

  /**
   * Tahmini calisma suresi (commit bazli)
   */
  estimateWorkTime() {
    const commits = this.getRecentCommits();
    if (commits.length === 0) return { totalMinutes: 0, sessions: [] };

    // Session threshold: 30 dakikadan fazla bosluk = yeni session
    const SESSION_GAP_THRESHOLD = 30 * 60 * 1000;

    const sessions = [];
    let currentSession = {
      start: commits[commits.length - 1].timestamp,
      end: commits[commits.length - 1].timestamp,
      commits: 1
    };

    for (let i = commits.length - 2; i >= 0; i--) {
      const current = new Date(commits[i].timestamp);
      const previous = new Date(commits[i + 1].timestamp);
      const gap = current - previous;

      if (gap > SESSION_GAP_THRESHOLD) {
        // Session kapat
        sessions.push({
          ...currentSession,
          durationMinutes: Math.round(
            (new Date(currentSession.end) - new Date(currentSession.start)) / 60000
          )
        });

        // Yeni session baslat
        currentSession = {
          start: commits[i].timestamp,
          end: commits[i].timestamp,
          commits: 1
        };
      } else {
        // Ayni session'da devam
        currentSession.end = commits[i].timestamp;
        currentSession.commits++;
      }
    }

    // Son session'i ekle
    sessions.push({
      ...currentSession,
      durationMinutes: Math.round(
        (new Date(currentSession.end) - new Date(currentSession.start)) / 60000
      )
    });

    // Minimum 5 dakika/commit varsay (commit arasi calisma)
    const totalMinutes = sessions.reduce((sum, s) => {
      return sum + Math.max(s.durationMinutes, s.commits * 5);
    }, 0);

    return { totalMinutes, sessions };
  }

  // ---------------------------------------------------------------------------
  // HELPER METHODS
  // ---------------------------------------------------------------------------

  /**
   * Git komutunu calistir
   */
  runGitCommand(command) {
    try {
      return execSync(command, {
        cwd: this.repoPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Git repo mu kontrol et
   */
  isGitRepo() {
    try {
      this.runGitCommand('git rev-parse --git-dir');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ozet bilgileri al
   */
  getSummary() {
    const commits = this.getRecentCommits();
    const workEstimate = this.estimateWorkTime();
    const changedFiles = this.getAllChangedFiles();

    return {
      isGitRepo: this.isGitRepo(),
      totalCommits: commits.length,
      firstCommit: commits.length > 0 ? commits[commits.length - 1] : null,
      lastCommit: commits.length > 0 ? commits[0] : null,
      filesChanged: changedFiles.length,
      estimatedWorkMinutes: workEstimate.totalMinutes,
      estimatedSessions: workEstimate.sessions.length
    };
  }
}

export default GitIntegration;
