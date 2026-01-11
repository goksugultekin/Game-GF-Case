# 🎮 Quality Gate - Case Study

> **Version**: 2.0 | **Tarih**: Ocak 2026

## Genel Bakış

Bu case study, bir **Phaser oyun kalite kontrol sistemi** geliştirmenizi istemektedir. Sistem, otomatik olarak güvenlik açıklarını, debug ifadelerini ve determinizm sorunlarını tespit edip düzeltebilmelidir.

## 🎯 Amaç

Phaser ile yazılmış HTML5 oyunları için bir "Quality Gate" aracı geliştirin:

1. **Güvenlik Taraması** - Tehlikeli kod pattern'lerini tespit
2. **Çalışma Testi** - Oyunu headless browser'da test et
3. **Determinizm Kontrolü** - Tekrarlanabilirlik analizi
4. **Otomatik Düzeltme** - Tespit edilen sorunları düzelt

## 📁 Klasör Yapısı

```
case-study/
├── README.md              # Bu dosya
├── TECHNICAL_SPEC.md      # Teknik detaylar
├── package.json           # Proje bağımlılıkları
├── .gitignore             # Git ignore kuralları
├── tracker/               # Çalışma süresi takip sistemi
├── test-games/            # Test oyunları
│   ├── clean-game/        # ✅ Tüm testlerden geçer
│   ├── debug-game/        # ❌ console.log'lar var
│   ├── unsafe-game/       # ❌ eval(), innerHTML var
│   ├── random-game/       # ❌ Seed yok
│   └── broken-game/       # ❌ Runtime error var
└── solution/              # 👉 ÇÖZÜMÜNÜZÜ BURAYA YAZIN
```

## 📋 Gereksinimler

### Zorunlu (Must Have)

| Özellik | Açıklama |
|---------|----------|
| Safety Scan | `eval()`, `innerHTML`, `debugger`, hardcoded secrets tespiti |
| Runtime Test | Playwright ile oyunu çalıştır, error/exception yakala |
| Determinism Check | `Math.random()` analizi, seed mekanizması kontrolü |
| Auto-Fix | `console.log` kaldırma, `innerHTML` → `textContent` |
| CLI | `npx quality-gate ./game --fix` şeklinde kullanım |
| Raporlama | JSON ve human-readable çıktı |

### İsteğe Bağlı (Nice to Have)

- Screenshot on failure
- Watch mode
- Custom rule tanımlama
- IDE entegrasyonu
- Paralel dosya tarama

## 🚀 Başlangıç

### 1. Kurulum

```bash
# Bağımlılıkları yükle (tracker otomatik kurulur)
npm install

# Git repo oluştur (tracker için gerekli)
git init
git add .
git commit -m "Initial commit"
```

### 2. Çözümünüzü Yazın

`solution/` klasörü içinde çalışın:

```bash
cd solution
# Kendi quality-gate projenizi oluşturun
```

### 3. Test Edin

```bash
# Test oyunlarında deneyin
npx quality-gate ../test-games/clean-game
npx quality-gate ../test-games/debug-game --fix
```

## 🧪 Test Oyunları

Sisteminizi test etmek için hazır oyunlar sağlanmıştır:

| Oyun | Durum | Beklenen Davranış |
|------|-------|-------------------|
| `clean-game/` | ✅ Temiz | Tüm testlerden geçer |
| `debug-game/` | ⚠️ Debug | console.log var → `--fix` ile düzelir |
| `unsafe-game/` | ❌ Güvensiz | eval(), innerHTML var → Kısmen düzelir |
| `random-game/` | ⚠️ Rastgele | Seed yok → `--fix` ile seed enjekte |
| `broken-game/` | ❌ Bozuk | Runtime error → Düzeltilemez |

### Test Senaryoları

```bash
# 1. Temiz oyun - Geçmeli
npx quality-gate ./test-games/clean-game
# Beklenen: ✅ PASSED

# 2. Debug ifadeli oyun
npx quality-gate ./test-games/debug-game
# Beklenen: ❌ FAILED (console.log tespit)

npx quality-gate ./test-games/debug-game --fix
# Beklenen: ✅ PASSED (console.log kaldırıldı)

# 3. Güvenlik açıklı oyun
npx quality-gate ./test-games/unsafe-game
# Beklenen: ❌ FAILED (CRITICAL: eval, HIGH: innerHTML)

# 4. Deterministik olmayan oyun
npx quality-gate ./test-games/random-game --fix
# Beklenen: ✅ PASSED (Seed enjekte edildi)

# 5. Bozuk oyun
npx quality-gate ./test-games/broken-game
# Beklenen: ❌ FAILED (Runtime error)
```

## 🏗️ Önerilen Mimari

```
solution/
├── src/
│   ├── index.ts           # Ana entry point
│   ├── quality-gate.ts    # Orkestratör
│   ├── cli.ts             # CLI arayüzü
│   ├── types.ts           # Tip tanımları
│   │
│   ├── checks/            # Kontrol modülleri
│   │   ├── safety-scan.ts     # Statik analiz
│   │   ├── runtime-test.ts    # Playwright test
│   │   └── determinism.ts     # Determinizm kontrolü
│   │
│   └── fixers/            # Düzeltici modüller
│       ├── debug-remover.ts       # console.log kaldırma
│       ├── innerhtml-sanitizer.ts # XSS düzeltme
│       └── random-seeder.ts       # Seed enjeksiyonu
│
├── package.json
├── tsconfig.json
└── README.md              # Kurulum talimatları
```

## 📊 Değerlendirme Kriterleri

| Kriter | Ağırlık | Açıklama |
|--------|---------|----------|
| **Doğruluk** | 30% | Test oyunlarında doğru sonuç |
| **Kod Kalitesi** | 25% | TypeScript best practices, clean code |
| **Mimari** | 20% | Modülerlik, genişletilebilirlik |
| **Dokümantasyon** | 10% | README, kod yorumları |
| **Çalışma Süresi** | 10% | Verimli zaman kullanımı (hedef: 4-6 saat) |
| **Bonus Özellikler** | 5% | Nice to have özellikler |

## 🔧 Teknik Gereksinimler

- **Dil**: TypeScript (strict mode)
- **Runtime**: Node.js 18+
- **Browser Automation**: Playwright
- **CLI Framework**: Tercihe bağlı (Commander.js, yargs, vb.)
- **Test Framework**: Vitest veya Jest

## ⏱️ Süre

| Süre | Açıklama |
|------|----------|
| **Hedef süre** | 4-6 saat aktif çalışma |
| **Maksimum süre** | 48 saat (teslim için) |

> **Not**: Çalışma süreniz otomatik olarak takip edilmektedir.

## 📊 Çalışma Süresi Takibi

Bu proje, çalışma sürenizi **otomatik olarak** takip eder.

### Nasıl Çalışır?

```
┌─────────────────────────────────────────────────────────────┐
│  npm install → Tracker Kurulur                              │
│       ↓                                                     │
│  Dosya değişikliği → Otomatik kayıt                         │
│       ↓                                                     │
│  Git commit → Commit kaydedilir                             │
│       ↓                                                     │
│  git push → Rapor otomatik oluşur                           │
└─────────────────────────────────────────────────────────────┘
```

1. **`npm install`** yaptığınızda tracker otomatik kurulur
2. Dosya değişiklikleriniz ve git commit'leriniz kaydedilir
3. **15 dakika inaktivite** = yeni oturum başlangıcı
4. **Push yaptığınızda** otomatik rapor oluşturulur

### Tracker Komutları

```bash
# Anlık istatistiklerinizi görün
npm run stats

# Detaylı rapor oluştur
npm run report

# Teslim için hazırla
npm run submit
```

### Örnek Çıktı

```
📊 Quick Stats
──────────────
   Active Time: 3h 45m
   Sessions:    2
   Commits:     8
   Files:       12
```

### Şeffaflık Politikası

| Ne Kaydedilir | Ne Kaydedilmez |
|---------------|----------------|
| ✅ Çalışma süreleri | ❌ Kod içeriği |
| ✅ Dosya adları | ❌ Kişisel bilgiler |
| ✅ Commit sayıları | ❌ Ekran görüntüsü |
| ✅ Oturum bilgileri | ❌ Tuş vuruşları |

> `tracker-report.json` dosyasını istediğiniz zaman inceleyebilirsiniz.

## 📤 Teslim

### Teslim Edilecekler

1. **GitHub Reposu** (public veya private + invite)
2. **README.md** ile kurulum talimatları
3. **Çalışan demo** (test oyunlarında)
4. **tracker-report.json** (otomatik oluşur)

### Teslim Kontrol Listesi

```bash
# Teslim öncesi kontrol
npm run submit

# Bu komut:
# ✅ Tüm testleri çalıştırır
# ✅ Rapor oluşturur
# ✅ Eksikleri gösterir
```

### Teslim Formatı

```bash
# GitHub üzerinden
git push origin main

# veya ZIP olarak
# solution/ klasörünü + tracker-report.json'ı gönderin
```

## 💡 İpuçları

1. **Önce basit başla**: İlk olarak bir check'i tam çalıştır
2. **TDD kullan**: Test oyunlarını baz al
3. **Modüler yaz**: Her check/fixer bağımsız olsun
4. **Error handling**: Edge case'leri düşün
5. **Commit sık**: İlerlemenizi kaydedin

## ❓ Sorular

Case study hakkında sorularınız varsa:
- Teknik detaylar için **TECHNICAL_SPEC.md** dosyasına bakın
- Genel sorular için iletişime geçin

---

**İyi çalışmalar!** 🚀
