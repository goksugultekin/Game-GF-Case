# Technical Specification - Quality Gate


Bu döküman, Quality Gate sisteminin teknik detaylarını açıklar.

---

## 1. Güvenlik Taraması (Safety Scan)

### Aranacak Pattern'ler

| Pattern | Regex | Ciddiyet | Risk |
|---------|-------|----------|------|
| `eval()` | `/\beval\s*\(/g` | CRITICAL | Kod enjeksiyonu |
| `Function()` | `/\bnew\s+Function\s*\(/g` | CRITICAL | Dinamik kod |
| `innerHTML =` | `/\.innerHTML\s*=/g` | HIGH | XSS |
| `outerHTML =` | `/\.outerHTML\s*=/g` | HIGH | XSS |
| `document.write` | `/document\.write\s*\(/g` | HIGH | DOM bozulması |
| `debugger` | `/\bdebugger\b/g` | MEDIUM | Debug kodu |
| `console.log` | `/console\.(log|debug|info)\s*\(/g` | MEDIUM | Debug kodu |
| Hardcoded secret | Aşağıya bak | HIGH | Güvenlik sızıntısı |

### Hardcoded Secret Tespiti

```javascript
// Aranacak pattern'ler
const SECRET_PATTERNS = [
  /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
  /secret[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
  /password\s*[:=]\s*['"][^'"]+['"]/i,
  /token\s*[:=]\s*['"][^'"]{20,}['"]/i,
  /['"]sk-[a-zA-Z0-9]{32,}['"]/,  // OpenAI key
  /['"]ghp_[a-zA-Z0-9]{36,}['"]/,  // GitHub token
];
```

### Yorum İçi Tespiti Engelleme

```javascript
// Bu satırlar ATLANMALI:
// eval() is dangerous  ← Yorum içinde
/* innerHTML kullanma */ ← Yorum içinde

// Bu satırlar TESPİT EDİLMELİ:
eval(userInput);  ← Gerçek kullanım
element.innerHTML = data;  ← Gerçek kullanım
```

### Yorum Temizleme Algoritması

```typescript
function stripComments(content: string): string {
  // Tek satır yorumları kaldır
  let result = content.replace(/\/\/.*$/gm, '');

  // Çok satırlı yorumları kaldır
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');

  return result;
}

// Tarama öncesi yorum temizle
const cleanContent = stripComments(fileContent);
const issues = scanForPatterns(cleanContent);
```

---

## 2. Çalışma Testi (Runtime Test)

### Playwright Kullanımı

```typescript
import { chromium } from 'playwright';

async function runtimeTest(gamePath: string): Promise<RuntimeResult> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors: string[] = [];
  const exceptions: string[] = [];

  // Console error'ları yakala
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Uncaught exception'ları yakala
  page.on('pageerror', (err) => {
    exceptions.push(err.message);
  });

  // Sayfaya git
  const indexPath = path.join(gamePath, 'index.html');
  await page.goto(`file://${indexPath}`);

  // Canvas kontrolü
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    return {
      width: canvas.width,
      height: canvas.height
    };
  });

  await browser.close();

  return {
    passed: errors.length === 0 && exceptions.length === 0,
    consoleErrors: errors,
    uncaughtExceptions: exceptions,
    canvasFound: canvasInfo !== null,
    canvasDimensions: canvasInfo
  };
}
```

### Bekleme Stratejisi

```typescript
// Oyunun yüklenmesini bekle
await page.waitForSelector('canvas', { timeout: 10000 });

// Ek bekleme (animasyon/init için) - 3 saniye önerilir
await page.waitForTimeout(3000);
```

> **Not**: 3 saniyelik bekleme, Phaser oyunlarının tam olarak başlatılması için yeterli süre sağlar. Daha kısa süreler false-positive hatalara neden olabilir.

### Screenshot on Failure (Bonus)

```typescript
if (!result.passed) {
  const screenshotPath = path.join(outputDir, 'failure-screenshot.png');
  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });
  result.screenshotPath = screenshotPath;
}
```

---

## 3. Determinizm Kontrolü

### Statik Analiz

```typescript
// Math.random() kullanımlarını say
const randomCalls = content.match(/Math\.random\s*\(\s*\)/g) || [];

// Seeding kütüphanelerini tespit et
const seedLibraries = [
  'seedrandom',
  'chance',
  'mersenne-twister',
  'random-seed'
];

const hasSeeding = seedLibraries.some(lib =>
  content.includes(lib) || content.includes('__GAME_SEED')
);
```

### Runtime Doğrulama

```typescript
// Math.random'ı proxy'le
await page.addInitScript(() => {
  window.__randomCalls = [];
  const original = Math.random;
  Math.random = function() {
    const value = original.call(Math);
    window.__randomCalls.push(value);
    return value;
  };
});

// İki çalıştırma karşılaştır
const run1 = await getRandomCalls(page);
const run2 = await getRandomCalls(page);

const isReproducible = JSON.stringify(run1) === JSON.stringify(run2);
```

### Determinizm Skoru

```typescript
interface DeterminismScore {
  score: number;           // 0-100
  randomCallCount: number;
  hasSeeding: boolean;
  isReproducible: boolean;
}

function calculateDeterminismScore(result: DeterminismResult): number {
  let score = 100;

  if (!result.seedingMechanismFound && result.randomCallsDetected > 0) {
    score -= 50; // Seeding yok ama random kullanılıyor
  }

  if (!result.isReproducible) {
    score -= 30; // Tekrarlanabilir değil
  }

  if (result.randomCallsDetected > 10) {
    score -= 10; // Çok fazla random çağrısı
  }

  return Math.max(0, score);
}
```

---

## 4. Otomatik Düzeltme (Fixers)

### Debug Remover

```typescript
// Kaldırılacak pattern'ler
const DEBUG_PATTERNS = [
  /^\s*console\.(log|debug|info)\s*\([^)]*\)\s*;?\s*$/gm,
  /^\s*debugger\s*;?\s*$/gm
];

function removeDebug(content: string): string {
  let result = content;
  for (const pattern of DEBUG_PATTERNS) {
    result = result.replace(pattern, '');
  }
  // Boş satırları temizle
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
  return result;
}
```

### innerHTML Sanitizer

```typescript
// innerHTML → textContent dönüşümü
function sanitizeInnerHtml(content: string): string {
  // Basit string atama - değiştirme
  // element.innerHTML = "static"; → Olduğu gibi bırak (statik string)

  // Değişken atama - textContent'e çevir
  // element.innerHTML = variable; → textContent'e çevir
  return content.replace(
    /(\w+)\.innerHTML\s*=\s*(\w+)\s*;/g,
    '/* SECURITY FIX */ $1.textContent = $2;'
  );
}
```

### Random Seeder

```typescript
// Enjekte edilecek PRNG kodu
const SEED_INJECTION = `
(function() {
  function mulberry32(seed) {
    return function() {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var urlSeed = new URLSearchParams(location.search).get('seed');
  var seed = urlSeed ? hashCode(urlSeed) : 12345;

  function hashCode(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) || 1;
  }

  Math.random = mulberry32(seed);
  window.__GAME_SEED = seed;
  console.log('[QualityGate] Seed injected:', seed);
})();
`;
```

### Enjeksiyon Stratejisi

```typescript
function injectSeed(htmlContent: string): string {
  const scriptTag = `<script>${SEED_INJECTION}</script>`;

  // <head> içine veya <body> başına ekle
  if (htmlContent.includes('<head>')) {
    return htmlContent.replace('<head>', `<head>\n${scriptTag}`);
  } else if (htmlContent.includes('<body>')) {
    return htmlContent.replace('<body>', `<body>\n${scriptTag}`);
  } else {
    return scriptTag + '\n' + htmlContent;
  }
}
```

---

## 5. CLI Arayüzü

### Komut Yapısı

```bash
quality-gate <game-path> [options]

Options:
  -f, --fix              Apply automatic fixes
  -j, --json             Output as JSON
  -s, --skip <checks>    Skip checks (comma-separated)
  -t, --timeout <ms>     Runtime test timeout (default: 30000)
  -v, --verbose          Verbose output
  --no-screenshot        Disable failure screenshots
  -h, --help             Show help
```

### Exit Codes

| Code | Anlam |
|------|-------|
| 0 | Tüm kontroller geçti |
| 1 | En az bir kontrol başarısız |
| 2 | Sistem hatası (dosya bulunamadı, vb.) |

### Örnek Kullanımlar

```bash
# Temel tarama
quality-gate ./my-game

# Düzeltme ile
quality-gate ./my-game --fix

# JSON çıktı
quality-gate ./my-game --json > report.json

# Belirli kontrolleri atla
quality-gate ./my-game --skip runtime,determinism

# Verbose mod
quality-gate ./my-game -v --fix
```

---

## 6. Çıktı Formatları

### JSON Format

```json
{
  "passed": false,
  "iterations": 1,
  "totalTimeMs": 1234,
  "checks": {
    "safety": {
      "passed": false,
      "issues": [
        {
          "file": "src/main.js",
          "line": 42,
          "column": 5,
          "pattern": "eval()",
          "severity": "CRITICAL",
          "snippet": "eval(userInput)"
        }
      ]
    },
    "runtime": {
      "passed": true,
      "loadTimeMs": 500,
      "consoleErrors": [],
      "canvasFound": true
    },
    "determinism": {
      "passed": false,
      "randomCallsDetected": 15,
      "seedingMechanismFound": false
    }
  },
  "fixes": [
    {
      "file": "src/main.js",
      "fixer": "DebugRemover",
      "applied": true,
      "linesRemoved": 5
    }
  ]
}
```

### Human-Readable Format

```
════════════════════════════════════════════════════════════
                    QUALITY GATE REPORT
════════════════════════════════════════════════════════════

📁 Game: ./my-game
🕐 Time: 1234ms
🔄 Iterations: 2

────────────────────────────────────────────────────────────
                     SAFETY SCAN
────────────────────────────────────────────────────────────

❌ CRITICAL: eval() detected
   📍 src/main.js:42:5
   💻 eval(userInput)

⚠️ HIGH: innerHTML assignment
   📍 src/ui.js:15:3
   💻 element.innerHTML = data

────────────────────────────────────────────────────────────
                     RUNTIME TEST
────────────────────────────────────────────────────────────

✅ Page loaded successfully (500ms)
✅ Canvas found (800x600)
✅ No console errors
✅ No uncaught exceptions

────────────────────────────────────────────────────────────
                   DETERMINISM CHECK
────────────────────────────────────────────────────────────

❌ Math.random() calls: 15
❌ Seeding mechanism: NOT FOUND
⚠️ Game is NOT reproducible

────────────────────────────────────────────────────────────
                       FIXES APPLIED
────────────────────────────────────────────────────────────

✅ DebugRemover: Removed 5 console.log statements
✅ RandomSeeder: Injected PRNG with URL seed support

════════════════════════════════════════════════════════════
                    RESULT: ❌ FAILED
════════════════════════════════════════════════════════════
```

---

## 7. Tip Tanımları

```typescript
// Severity levels
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

// Scan result
interface ScanResult {
  file: string;
  line: number;
  column: number;
  pattern: string;
  severity: Severity;
  snippet: string;
}

// Runtime result
interface RuntimeResult {
  passed: boolean;
  loadTimeMs: number;
  consoleErrors: string[];
  uncaughtExceptions: string[];
  canvasFound: boolean;
  canvasDimensions: { width: number; height: number } | null;
  screenshotPath?: string;  // Bonus
}

// Determinism result
interface DeterminismResult {
  randomCallsDetected: number;
  seedingMechanismFound: boolean;
  seedingLibrary?: string;
  isReproducible: boolean;
}

// Fix result
interface FixResult {
  file: string;
  fixer: string;
  applied: boolean;
  changes?: string;
  linesRemoved?: number;
  linesAdded?: number;
}

// Main result
interface QualityGateResult {
  passed: boolean;
  iterations: number;
  totalTimeMs: number;
  checks: {
    safety: { passed: boolean; issues: ScanResult[] };
    runtime: RuntimeResult;
    determinism: DeterminismResult;
  };
  fixes: FixResult[];
}

// CLI Options
interface CLIOptions {
  fix: boolean;
  json: boolean;
  skip: string[];
  timeout: number;
  verbose: boolean;
  screenshot: boolean;
}
```

---

## 8. Edge Cases

### Dikkat Edilmesi Gerekenler

1. **Minified kod**: Satır numaraları anlamsız olabilir
2. **Source maps**: Varsa kullan
3. **Çok satırlı string**: `console.log(\`...\`)` düzgün handle et
4. **Async error**: Promise rejection'ları yakala
5. **Iframe içi oyun**: Ana sayfa dışındaki canvas'ları kontrol et
6. **Dynamic import**: Lazy loaded modülleri de tara
7. **Node modules**: `node_modules/` klasörünü tara**ma**

### Hata Toleransı

```typescript
// Tek dosya hatası tüm işlemi durdurmamalı
try {
  await scanFile(file);
} catch (error) {
  results.push({
    file,
    error: error.message,
    skipped: true
  });
}
```

### Dosya Filtreleme

```typescript
const SCAN_EXTENSIONS = ['.js', '.ts', '.mjs', '.jsx', '.tsx'];
const IGNORE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  '*.min.js',
  '*.bundle.js'
];

function shouldScan(filePath: string): boolean {
  const ext = path.extname(filePath);
  if (!SCAN_EXTENSIONS.includes(ext)) return false;

  return !IGNORE_PATTERNS.some(pattern =>
    minimatch(filePath, pattern)
  );
}
```

---

## 9. Test Stratejisi

### Unit Test Örnekleri

```typescript
describe('SafetyScan', () => {
  it('should detect eval()', () => {
    const content = 'eval(userInput);';
    const result = safetyScan(content);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].pattern).toBe('eval()');
    expect(result.issues[0].severity).toBe('CRITICAL');
  });

  it('should ignore eval in comments', () => {
    const content = '// eval() is dangerous';
    const result = safetyScan(content);
    expect(result.issues).toHaveLength(0);
  });
});

describe('DebugRemover', () => {
  it('should remove console.log', () => {
    const content = 'console.log("test");\nconst x = 1;';
    const result = removeDebug(content);
    expect(result).not.toContain('console.log');
    expect(result).toContain('const x = 1');
  });
});
```

### Integration Test

```typescript
describe('QualityGate Integration', () => {
  it('should pass clean-game', async () => {
    const result = await qualityGate('./test-games/clean-game');
    expect(result.passed).toBe(true);
  });

  it('should fail debug-game without fix', async () => {
    const result = await qualityGate('./test-games/debug-game');
    expect(result.passed).toBe(false);
  });

  it('should pass debug-game with fix', async () => {
    const result = await qualityGate('./test-games/debug-game', { fix: true });
    expect(result.passed).toBe(true);
  });
});
```

---

## 10. Performans Önerileri

| Alan | Öneri |
|------|-------|
| Dosya Okuma | Paralel `Promise.all()` kullan |
| Regex | Compile edilmiş regex'leri cache'le |
| Playwright | Browser instance'ı reuse et |
| Büyük Dosyalar | Stream okuma kullan |

```typescript
// Paralel dosya tarama
const files = await glob('**/*.js');
const results = await Promise.all(
  files.map(file => scanFile(file))
);

// Browser reuse
let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}
```

---


