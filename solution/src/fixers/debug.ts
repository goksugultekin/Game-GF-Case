import fs from 'fs';
import { glob } from 'glob';




export async function removeDebug(gamePath: string): Promise<boolean> {
  let changed = false;

  const files = await glob('**/*.js', {
    cwd: gamePath,
    absolute: true,
    ignore: ['**/node_modules/**'],
  });

  for (const file of files) {
    const original = fs.readFileSync(file, 'utf-8');

    const cleaned = original

      .replace(
        /^\s*console\.(log|debug|info)\(.*?\);\s*(\/\/.*)?$/gm,
        ''
      )

      .replace(
        /^\s*debugger;\s*(\/\/.*)?$/gm,
        ''
      );

    if (cleaned !== original) {
      fs.writeFileSync(file, cleaned, 'utf-8');
      changed = true;
    }
  }

  return changed;
}
