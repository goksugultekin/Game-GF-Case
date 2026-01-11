
import { QualityGate } from './qualityGate.js';

async function main() {
  const gamePath = process.argv[2];
  const fix = process.argv.includes('--fix');

  if (!gamePath) {
    console.error('Usage: npm run check -- <game-path> [--fix]');
    process.exit(1);
  }

  const gate = new QualityGate();
  const result = await gate.run(gamePath, fix);

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
}

main();
