import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import type { ScanResult, Severity } from '../types.js';




function stripComments(code: string): string {
  return code

    .replace(/\/\*[\s\S]*?\*\//g, '')

    .replace(/\/\/.*$/gm, '');
}

const PATTERNS: {
  name: string;
  regex: RegExp;
  severity: Severity;
}[] = [
  { name: 'eval()', regex: /\beval\s*\(/g, severity: 'CRITICAL' },
  { name: 'new Function()', regex: /\bnew\s+Function\s*\(/g, severity: 'CRITICAL' },
  { name: 'innerHTML assignment', regex: /\.innerHTML\s*=/g, severity: 'HIGH' },
  { name: 'document.write()', regex: /\bdocument\.write\s*\(/g, severity: 'HIGH' },
  { name: 'debugger', regex: /\bdebugger\b/g, severity: 'MEDIUM' },
];

export async function safetyScan(gamePath: string): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  const files = await glob('**/*.js', {
    cwd: gamePath,
    absolute: true,
    ignore: ['**/node_modules/**'],
  });

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf-8');




    const scanTarget = stripComments(rawContent);

    for (const pattern of PATTERNS) {

      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(scanTarget)) !== null) {
        const index = match.index;


        const before = rawContent.slice(0, index);
        const line = before.split('\n').length;
        const column = index - before.lastIndexOf('\n');

        const snippet = rawContent
          .slice(Math.max(0, index - 20), index + 20)
          .replace(/\s+/g, ' ')
          .slice(0, 50);

        results.push({
          file: path.relative(gamePath, file),
          line,
          column,
          pattern: pattern.name,
          severity: pattern.severity,
          snippet,
        });
      }
    }
  }

  return results;
}
