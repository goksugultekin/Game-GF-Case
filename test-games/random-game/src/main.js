
(function () {
  let seed = window.GAME_SEED || 'default-seed';
  let x = 0;
  for (let i = 0; i < seed.length; i++) {
    x = (x + seed.charCodeAt(i)) | 0;
  }
  Math.random = function () {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
})();

/**
 * =============================================================================
 * RANDOM GAME - QUALITY GATE TEST
 * =============================================================================
 *
 * Bu oyun SEED MEKANİZMASI OLMADAN Math.random() kullanır.
 * Quality Gate determinizm kontrolünde başarısız olmalıdır.
 *
 * ✅ Güvenlik: eval(), innerHTML yok
 * ✅ Debug: console.log yok
 * ❌ Determinizm: Seeded PRNG YOK - her çalıştırmada farklı sonuç
 * ✅ Runtime: Hata yok
 *
 * BEKLENTİ:
 * - quality-gate ./random-game → FAIL (Seed mekanizması bulunamadı)
 * - quality-gate ./random-game --fix → PASS (Seed enjekte edildi)
 * - game.html?seed=12345 → Tekrarlanabilir oyun
 *
 * SORUN:
 * Her oyun farklı çalışır, replay/test yapılamaz.
 *
 * Oyun: "Asteroid Dodge" - Asteroidlerden kaç
 */

// =============================================================================
// ⚠️ PROBLEM: SEED MEKANİZMASI YOK
// =============================================================================

/**
 * Bu fonksiyon her çağrıda farklı değer döner.
 * Replay yapılamaz!
 */
function randomBetween(min, max) {
    // ⚠️ Math.random() deterministik değil!
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Rastgele renk oluştur
 */
function randomColor() {
    // ⚠️ Math.random() ile renk
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return (r << 16) + (g << 8) + b;
}

/**
 * Rastgele boolean
 */
function randomBool() {
    // ⚠️ Math.random() ile boolean
    return Math.random() > 0.5;
}

// =============================================================================
// GAME SCENES
// =============================================================================

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create() {
        this.scene.start('GameScene');
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.player = null;
        this.asteroids = [];
        this.score = 0;
        this.gameOver = false;
    }

    create() {
        this.cameras.main.setBackgroundColor('#1e3a5f');

        // Skor
        this.scoreText = this.add.text(16, 16, 'Distance: 0', {
            fontSize: '24px',
            fill: '#3498db'
        });

        // Oyuncu (gemi üçgeni)
        this.player = this.add.triangle(400, 500, 0, 30, 15, 0, 30, 30, 0x3498db);

        // Klavye kontrolleri
        this.cursors = this.input.keyboard.createCursorKeys();

        // Asteroid spawn timer
        this.time.addEvent({
            delay: 800,
            callback: this.spawnAsteroid,
            callbackScope: this,
            loop: true
        });

        // Skor timer
        this.time.addEvent({
            delay: 100,
            callback: () => {
                if (!this.gameOver) {
                    this.score++;
                    this.scoreText.setText('Distance: ' + this.score);
                }
            },
            callbackScope: this,
            loop: true
        });

        // Yıldızlar (arka plan)
        this.createStars();
    }

    createStars() {
        // ⚠️ Math.random() ile yıldız konumları
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 800;
            const y = Math.random() * 600;
            const size = Math.random() * 2 + 1;
            const alpha = Math.random() * 0.5 + 0.3;

            this.add.circle(x, y, size, 0xffffff, alpha);
        }
    }

    spawnAsteroid() {
        if (this.gameOver) return;

        // ⚠️ Math.random() ile asteroid konumu
        const x = randomBetween(50, 750);

        // ⚠️ Math.random() ile asteroid boyutu
        const size = randomBetween(15, 40);

        // ⚠️ Math.random() ile asteroid rengi
        const color = randomBool() ? 0x95a5a6 : 0x7f8c8d;

        // ⚠️ Math.random() ile asteroid hızı
        const speed = randomBetween(2, 6);

        const asteroid = this.add.circle(x, -size, size, color);
        asteroid.speed = speed;
        asteroid.size = size;

        this.asteroids.push(asteroid);
    }

    update() {
        if (this.gameOver) return;

        // Oyuncu hareketi
        if (this.cursors.left.isDown) {
            this.player.x -= 5;
        } else if (this.cursors.right.isDown) {
            this.player.x += 5;
        }

        // Sınırlar
        this.player.x = Phaser.Math.Clamp(this.player.x, 20, 780);

        // Asteroidleri hareket ettir
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            asteroid.y += asteroid.speed;

            // Çarpışma kontrolü
            const dx = this.player.x - asteroid.x;
            const dy = this.player.y - asteroid.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < asteroid.size + 15) {
                this.endGame();
                return;
            }

            // Ekrandan çıktı mı
            if (asteroid.y > 650) {
                asteroid.destroy();
                this.asteroids.splice(i, 1);
            }
        }
    }

    endGame() {
        this.gameOver = true;

        // Game over overlay
        this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);

        this.add.text(400, 250, 'GAME OVER', {
            fontSize: '48px',
            fill: '#e74c3c'
        }).setOrigin(0.5);

        this.add.text(400, 320, 'Distance: ' + this.score, {
            fontSize: '32px',
            fill: '#3498db'
        }).setOrigin(0.5);

        // Uyarı mesajı
        this.add.text(400, 400, 'This game is NOT reproducible!', {
            fontSize: '18px',
            fill: '#e74c3c'
        }).setOrigin(0.5);

        this.add.text(400, 430, 'Each playthrough is different.', {
            fontSize: '16px',
            fill: '#95a5a6'
        }).setOrigin(0.5);

        // Restart button
        const restartBtn = this.add.text(400, 500, 'Try Again (Random!)', {
            fontSize: '24px',
            fill: '#ffffff',
            backgroundColor: '#3498db',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        restartBtn.on('pointerdown', () => {
            this.scene.restart();
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
    scene: [BootScene, GameScene]
};

// =============================================================================
// GAME INIT
// =============================================================================

const game = new Phaser.Game(config);
