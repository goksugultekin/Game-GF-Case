/**
 * =============================================================================
 * DEBUG GAME - QUALITY GATE TEST
 * =============================================================================
 *
 * Bu oyun DEBUG ifadeleri içerir ve Quality Gate tarafından tespit edilmelidir.
 *
 * ❌ Debug: console.log, console.debug, console.info, debugger
 * ✅ Güvenlik: eval(), innerHTML yok
 * ✅ Determinizm: Seeded PRNG var
 * ✅ Runtime: Hata yok
 *
 * BEKLENTİ:
 * - quality-gate ./debug-game → FAIL (5+ debug ifadesi)
 * - quality-gate ./debug-game --fix → PASS (debug'lar kaldırıldı)
 *
 * Oyun: Basit "Catch the Star" oyunu
 */

// Debug: Bu log kaldırılmalı
// =============================================================================
// SEEDED RANDOM
// =============================================================================

const SeededRandom = (function() {
    let seed = 12345;

    function initSeed() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlSeed = urlParams.get('seed');
        if (urlSeed) {
            seed = hashString(urlSeed);
        }
        window.__GAME_SEED = seed;
    }

    function hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash) || 1;
    }

    function random() {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    function between(min, max) {
        const result = Math.floor(random() * (max - min + 1)) + min;
        return result;
    }

    initSeed();
    return { random, between };
})();

// =============================================================================
// GAME SCENES
// =============================================================================

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
    }

    create() {
        this.scene.start('GameScene');
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.score = 0;
        this.stars = [];
    }

    create() {

        this.cameras.main.setBackgroundColor('#2d2d44');

        // Skor
        this.scoreText = this.add.text(16, 16, 'Stars: 0', {
            fontSize: '24px',
            fill: '#ffd93d'
        });
        // Oyuncu (üçgen)
        this.player = this.add.triangle(400, 550, 0, 30, 15, 0, 30, 30, 0x6bcb77);
        this.player.setInteractive();
        this.input.setDraggable(this.player);
        // Sürükleme
        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            gameObject.x = Phaser.Math.Clamp(dragX, 30, 770);
        });

        // Yıldız spawn
        this.time.addEvent({
            delay: 1000,
            callback: this.spawnStar,
            callbackScope: this,
            loop: true
        });
    }

    spawnStar() {
        const x = SeededRandom.between(50, 750);
        const star = this.add.star(x, -20, 5, 10, 20, 0xffd93d);
        this.stars.push(star);
    }

    update() {
        // Yıldızları hareket ettir
        for (let i = this.stars.length - 1; i >= 0; i--) {
            const star = this.stars[i];
            star.y += 3;

            // Yakalama kontrolü
            if (Phaser.Geom.Intersects.RectangleToRectangle(
                star.getBounds(),
                this.player.getBounds()
            )) {
                star.destroy();
                this.stars.splice(i, 1);
                this.score++;
                this.scoreText.setText('Stars: ' + this.score);
            }
            // Ekrandan çıktı mı
            else if (star.y > 620) {
                star.destroy();
                this.stars.splice(i, 1);
            }
        }
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
    scene: [BootScene, GameScene],
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