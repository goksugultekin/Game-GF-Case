

import fs from 'fs';
import path from 'path';

export async function injectSeed(gamePath: string): Promise<boolean> {
  const entry = path.join(gamePath, 'src', 'main.js');

  if (!fs.existsSync(entry)) return false;

  const content = fs.readFileSync(entry, 'utf-8');

  if (content.includes('__GAME_SEED')) return false;

  const seedCode = `
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
`;

  fs.writeFileSync(entry, seedCode + '\n' + content);
  return true;
}
