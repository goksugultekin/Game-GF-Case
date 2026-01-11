import fs from 'fs';
import { glob } from 'glob';

export interface DeterminismResult {
  randomCallsDetected: number;
  seedingMechanismFound: boolean;
  isDeterministic: boolean;
}

export async function determinismCheck(
  gamePath: string
): Promise<DeterminismResult> {
  let randomCalls = 0;
  let seedingFound = false;

  const files = await glob('**/*.js', {
    cwd: gamePath,
    absolute: true,
    ignore: ['**/node_modules/**'],
  });

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');

   
    const randomMatches = content.match(/Math\.random\s*\(/g);
    if (randomMatches) {
      randomCalls += randomMatches.length;
    }


    if (
      content.includes('seedrandom') ||
      content.includes('GAME_SEED') ||
      content.includes('Math.random =')
    ) {
      seedingFound = true;
    }
  }

  const isDeterministic =
    randomCalls === 0 || (randomCalls > 0 && seedingFound);

  return {
    randomCallsDetected: randomCalls,
    seedingMechanismFound: seedingFound,
    isDeterministic,
  };
}
