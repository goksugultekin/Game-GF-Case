/**
 * =============================================================================
 * UNSAFE GAME - QUALITY GATE TEST
 * =============================================================================
 *
 * ⚠️ DİKKAT: Bu oyun kasıtlı olarak GÜVENLİK AÇIKLARI içerir!
 * Quality Gate bu açıkları tespit etmelidir.
 *
 * ❌ Güvenlik: eval(), innerHTML, document.write, hardcoded secret
 * ✅ Debug: console.log yok
 * ✅ Determinizm: Seeded PRNG var
 * ✅ Runtime: Hata yok
 *
 * BEKLENTİ:
 * - quality-gate ./unsafe-game → FAIL (CRITICAL: eval, HIGH: innerHTML)
 * - quality-gate ./unsafe-game --fix → innerHTML düzeltilir, eval uyarısı
 *
 * Oyun: Basit "Memory Match" oyunu
 */

// =============================================================================
// ⚠️ GÜVENLİK AÇIĞI: HARDCODED SECRET
// =============================================================================

// Bu API key production'da olmamalı!
const API_KEY = 'sk-1234567890abcdef';
const SECRET_TOKEN = 'super_secret_admin_token_12345';

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
        return Math.floor(random() * (max - min + 1)) + min;
    }

    initSeed();
    return { random, between };
})();

// =============================================================================
// ⚠️ GÜVENLİK AÇIĞI: EVAL KULLANIMI
// =============================================================================

/**
 * Dinamik hesaplama yapan fonksiyon
 * ⚠️ eval() kullanımı - KOD ENJEKSİYONU RİSKİ!
 */
function calculateScore(base, multiplier, bonus) {
    // Bu tehlikeli! Kullanıcı girdisi eval'a gidebilir.
    const formula = base + ' * ' + multiplier + ' + ' + bonus;
    return eval(formula);
}

/**
 * Dinamik fonksiyon oluşturma
 * ⚠️ Function() kullanımı - EVAL KADAR TEHLİKELİ!
 */
function createMultiplier(factor) {
    return new Function('x', 'return x * ' + factor);
}

// =============================================================================
// ⚠️ GÜVENLİK AÇIĞI: INNERHTML KULLANIMI
// =============================================================================

/**
 * Leaderboard güncelleme
 * ⚠️ innerHTML kullanımı - XSS RİSKİ!
 */
function updateLeaderboard(scores) {
    const scoresDiv = document.getElementById('scores');

    // ⚠️ TEHLİKELİ: Kullanıcı adı XSS içerebilir
    let html = '';
    scores.forEach((score, index) => {
        html += '<div>' + (index + 1) + '. ' + score.name + ': ' + score.points + '</div>';
    });

    scoresDiv.innerHTML = html;
}

/**
 * Oyuncu adı gösterme
 * ⚠️ outerHTML kullanımı - XSS RİSKİ!
 */
function displayPlayerName(name) {
    const nameEl = document.createElement('div');
    // ⚠️ TEHLİKELİ: Kullanıcı girdisi doğrudan HTML'e
    nameEl.outerHTML = '<span class="player-name">' + name + '</span>';
}

// =============================================================================
// ⚠️ GÜVENLİK AÇIĞI: DOCUMENT.WRITE
// =============================================================================

/**
 * Dinamik script yükleme
 * ⚠️ document.write() - Sayfa bozulabilir!
 */
function loadDynamicScript(url) {
    document.write('<script src="' + url + '"><\/script>');
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
        this.score = 0;
        this.cards = [];
        this.flippedCards = [];
    }

    create() {
        this.cameras.main.setBackgroundColor('#3d0000');

        // Skor göstergesi
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '24px',
            fill: '#ff4444'
        });

        // Kart oluştur
        this.createCards();

        // ⚠️ eval ile skor hesaplama
        const initialScore = calculateScore(0, 1, 0);

        // ⚠️ Leaderboard güncelle (innerHTML)
        updateLeaderboard([
            { name: 'Player1', points: 100 },
            { name: 'Player2', points: 80 },
            { name: 'Player3', points: 60 }
        ]);
    }

    createCards() {
        const symbols = ['★', '●', '■', '▲', '◆', '♥', '♠', '♣'];
        const pairs = [...symbols, ...symbols]; // Her sembolden 2 tane

        // Shuffle (seeded)
        for (let i = pairs.length - 1; i > 0; i--) {
            const j = SeededRandom.between(0, i);
            [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
        }

        // Kartları yerleştir
        const startX = 140;
        const startY = 120;
        const cardWidth = 80;
        const cardHeight = 100;
        const gap = 20;

        pairs.forEach((symbol, index) => {
            const row = Math.floor(index / 4);
            const col = index % 4;
            const x = startX + col * (cardWidth + gap);
            const y = startY + row * (cardHeight + gap);

            this.createCard(x, y, symbol, index);
        });
    }

    createCard(x, y, symbol, index) {
        // Kart arkası
        const card = this.add.rectangle(x, y, 70, 90, 0x660000)
            .setStrokeStyle(2, 0xff4444)
            .setInteractive();

        // Sembol (gizli)
        const symbolText = this.add.text(x, y, symbol, {
            fontSize: '32px',
            fill: '#ff4444'
        }).setOrigin(0.5).setVisible(false);

        card.symbol = symbol;
        card.symbolText = symbolText;
        card.isFlipped = false;
        card.index = index;

        this.cards.push(card);

        card.on('pointerdown', () => this.flipCard(card));
    }

    flipCard(card) {
        if (card.isFlipped || this.flippedCards.length >= 2) return;

        card.isFlipped = true;
        card.symbolText.setVisible(true);
        card.setFillStyle(0x440000);

        this.flippedCards.push(card);

        if (this.flippedCards.length === 2) {
            this.checkMatch();
        }
    }

    checkMatch() {
        const [card1, card2] = this.flippedCards;

        if (card1.symbol === card2.symbol) {
            // Eşleşti!
            // ⚠️ eval ile skor hesaplama
            this.score = calculateScore(this.score, 1, 10);
            this.scoreText.setText('Score: ' + this.score);

            // ⚠️ Leaderboard güncelle
            updateLeaderboard([
                { name: 'You', points: this.score },
                { name: 'Player2', points: 80 },
                { name: 'Player3', points: 60 }
            ]);

            this.flippedCards = [];
        } else {
            // Eşleşmedi, geri çevir
            this.time.delayedCall(1000, () => {
                card1.isFlipped = false;
                card1.symbolText.setVisible(false);
                card1.setFillStyle(0x660000);

                card2.isFlipped = false;
                card2.symbolText.setVisible(false);
                card2.setFillStyle(0x660000);

                this.flippedCards = [];
            });
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
    scene: [BootScene, GameScene]
};

// =============================================================================
// GAME INIT
// =============================================================================

const game = new Phaser.Game(config);
