/**
 * =============================================================================
 * BROKEN GAME - QUALITY GATE TEST
 * =============================================================================
 *
 * ⚠️ DİKKAT: Bu oyun kasıtlı olarak RUNTIME ERROR'lar içerir!
 * Quality Gate RuntimeTest modülü bu hataları yakalamalıdır.
 *
 * ✅ Güvenlik: eval(), innerHTML yok
 * ✅ Debug: console.log yok
 * ✅ Determinizm: Seeded PRNG var
 * ❌ Runtime: TypeError, ReferenceError, uncaught exceptions
 *
 * BEKLENTİ:
 * - quality-gate ./broken-game → FAIL (Runtime errors detected)
 * - consoleErrors array'inde hatalar listelenmeli
 * - Bu oyun --fix ile düzeltilemez (kod hatası)
 *
 * HATALAR:
 * 1. undefined property access
 * 2. null method call
 * 3. Reference to undefined variable
 * 4. Type error in calculation
 *
 * Oyun: "Broken Platformer" - Çalışmayan platform oyunu
 */

// =============================================================================
// SEEDED RANDOM (Düzgün çalışıyor)
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
        return Math.floor(random() * (max - min + 1)) + min;
    }

    initSeed();
    return { random, between };
})();

// =============================================================================
// ⚠️ HATA 1: UNDEFINED VARIABLE
// =============================================================================

/**
 * Bu fonksiyon tanımlanmamış bir değişkene erişmeye çalışır.
 * ReferenceError: undefinedConfig is not defined
 */
function loadConfig() {
    // ⚠️ undefinedConfig hiçbir yerde tanımlı değil!
    return undefinedConfig.gameSettings;
}

// =============================================================================
// ⚠️ HATA 2: NULL/UNDEFINED PROPERTY ACCESS
// =============================================================================

/**
 * Bu fonksiyon null bir objenin property'sine erişmeye çalışır.
 * TypeError: Cannot read property 'name' of null
 */
function getPlayerName(player) {
    // ⚠️ player null olabilir ama kontrol yok!
    return player.name.toUpperCase();
}

// =============================================================================
// GAME SCENES
// =============================================================================

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create() {
        // ⚠️ HATA 3: Yanlış scene adı
        // 'MainScene' diye bir scene yok!
        this.scene.start('GameScene');
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.player = null;
        this.platforms = null;
        this.enemies = null;
        this.score = 0;
    }

    create() {
        this.cameras.main.setBackgroundColor('#1a1a1a');

        // Skor
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '24px',
            fill: '#ff0000'
        });

        // Zemin
        this.platforms = this.physics.add.staticGroup();
        this.platforms.create(400, 580, null).setDisplaySize(800, 40).refreshBody();

        // Oyuncu
        this.player = this.add.rectangle(400, 500, 40, 60, 0xff0000);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);

        // Çarpışma
        this.physics.add.collider(this.player, this.platforms);

        // Klavye
        this.cursors = this.input.keyboard.createCursorKeys();

        // ⚠️ HATA 4: Olmayan bir elementi bulmaya çalış
        // Bu 3 saniye sonra patlayacak
        this.time.delayedCall(3000, () => {
            this.triggerError();
        });

        // ⚠️ HATA 5: Enemy spawn - null obje
        this.time.addEvent({
            delay: 2000,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });
    }

    /**
     * ⚠️ KASITLI HATA: Tanımsız değişken kullanımı
     */
    triggerError() {
        // Bu satır ReferenceError fırlatacak
        const config = loadConfig();
        this.applyConfig(config);
    }

    /**
     * ⚠️ KASITLI HATA: Null obje method çağrısı
     */
    spawnEnemy() {
        // enemies null olarak kaldı, add() çağrılamaz
        // TypeError: Cannot read property 'create' of null
        const x = SeededRandom.between(50, 750);

        // ⚠️ this.enemies hiç initialize edilmedi!
        const enemy = this.enemies.create(x, 0, null);
        enemy.setVelocityY(100);
    }

    update() {
        if (!this.player || !this.player.body) return;

        // Hareket
        if (this.cursors.left.isDown) {
            this.player.body.setVelocityX(-200);
        } else if (this.cursors.right.isDown) {
            this.player.body.setVelocityX(200);
        } else {
            this.player.body.setVelocityX(0);
        }

        // Zıplama
        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.body.setVelocityY(-400);
        }

        // ⚠️ HATA 6: Her 100 frame'de bir hata fırlat
        if (this.score > 0 && this.score % 100 === 0) {
            // null.name erişimi
            const name = getPlayerName(null);
        }

        this.score++;
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
            gravity: { y: 500 },
            debug: false
        }
    }
};

// =============================================================================
// GAME INIT
// =============================================================================

const game = new Phaser.Game(config);
