/**
 * =============================================================================
 * CLEAN GAME - QUALITY GATE TEST
 * =============================================================================
 *
 * Bu oyun tüm Quality Gate kontrollerinden geçmek için tasarlanmıştır.
 *
 * ✅ Güvenlik: eval(), innerHTML yok
 * ✅ Debug: console.log yok
 * ✅ Determinizm: Seeded PRNG kullanıyor
 * ✅ Runtime: Hata yok, canvas düzgün
 *
 * Oyun: Basit "Click the Circle" oyunu
 * - Rastgele konumda daire belirir
 * - Tıklayınca puan kazanırsın
 * - 30 saniye süre var
 */

// =============================================================================
// SEEDED RANDOM - Determinizm için
// =============================================================================

/**
 * Mulberry32 PRNG
 *
 * Deterministik random sayı üreteci.
 * Aynı seed = aynı sayı dizisi.
 */
const SeededRandom = (function() {
    let seed = 12345; // Varsayılan seed

    /**
     * Seed'i URL'den veya varsayılandan al
     */
    function initSeed() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlSeed = urlParams.get('seed');
        if (urlSeed) {
            seed = hashString(urlSeed);
        }
        // Seed'i global olarak expose et (replay için)
        window.__GAME_SEED = seed;
    }

    /**
     * String'i sayıya çevir (hash)
     */
    function hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash) || 1;
    }

    /**
     * Mulberry32 algoritması
     */
    function random() {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    /**
     * Min-max arası random
     */
    function between(min, max) {
        return Math.floor(random() * (max - min + 1)) + min;
    }

    // Initialize
    initSeed();

    return { random, between };
})();

// =============================================================================
// GAME SCENES
// =============================================================================

/**
 * BootScene - Oyun başlangıcı
 */
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Bu oyunda asset yok, grafik çizilerek yapılacak
    }

    create() {
        this.scene.start('GameScene');
    }
}

/**
 * GameScene - Ana oyun
 */
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.score = 0;
        this.timeLeft = 30;
        this.circle = null;
        this.scoreText = null;
        this.timeText = null;
    }

    create() {
        // Arkaplan
        this.cameras.main.setBackgroundColor('#1a1a2e');

        // Skor göstergesi
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '24px',
            fill: '#4ecca3'
        });

        // Süre göstergesi
        this.timeText = this.add.text(16, 48, 'Time: 30', {
            fontSize: '24px',
            fill: '#e94560'
        });

        // İlk daireyi oluştur
        this.spawnCircle();

        // Süre sayacı
        this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
    }

    /**
     * Yeni daire oluştur
     */
    spawnCircle() {
        // Önceki daireyi kaldır
        if (this.circle) {
            this.circle.destroy();
        }

        // Rastgele konum (seeded random kullanarak)
        const x = SeededRandom.between(50, 750);
        const y = SeededRandom.between(100, 550);
        const radius = SeededRandom.between(20, 50);

        // Daire çiz
        this.circle = this.add.circle(x, y, radius, 0x4ecca3);
        this.circle.setInteractive();

        // Tıklama eventi
        this.circle.on('pointerdown', () => {
            this.onCircleClick();
        });
    }

    /**
     * Daire tıklandığında
     */
    onCircleClick() {
        // Skoru artır
        this.score += 10;
        this.scoreText.setText('Score: ' + this.score);

        // Efekt
        this.tweens.add({
            targets: this.circle,
            scale: 1.5,
            alpha: 0,
            duration: 100,
            onComplete: () => {
                this.spawnCircle();
            }
        });
    }

    /**
     * Süre güncelle
     */
    updateTimer() {
        this.timeLeft--;
        this.timeText.setText('Time: ' + this.timeLeft);

        if (this.timeLeft <= 0) {
            this.scene.start('GameOverScene', { score: this.score });
        }
    }
}

/**
 * GameOverScene - Oyun sonu
 */
class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalScore = data.score || 0;
    }

    create() {
        this.cameras.main.setBackgroundColor('#1a1a2e');

        // Game Over text
        this.add.text(400, 250, 'GAME OVER', {
            fontSize: '48px',
            fill: '#e94560'
        }).setOrigin(0.5);

        // Final score
        this.add.text(400, 320, 'Score: ' + this.finalScore, {
            fontSize: '32px',
            fill: '#4ecca3'
        }).setOrigin(0.5);

        // Replay URL
        const replayUrl = window.location.origin + window.location.pathname +
                          '?seed=' + window.__GAME_SEED;

        this.add.text(400, 400, 'Replay: ' + replayUrl, {
            fontSize: '14px',
            fill: '#888888'
        }).setOrigin(0.5);

        // Restart button
        const restartBtn = this.add.text(400, 480, 'Click to Restart', {
            fontSize: '24px',
            fill: '#ffffff',
            backgroundColor: '#4ecca3',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        restartBtn.on('pointerdown', () => {
            this.scene.start('GameScene');
        });
    }
}

// =============================================================================
// GAME CONFIG
// =============================================================================

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    scene: [BootScene, GameScene, GameOverScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

// =============================================================================
// GAME INIT
// =============================================================================

const game = new Phaser.Game(config);
