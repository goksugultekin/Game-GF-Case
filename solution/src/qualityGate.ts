import { safetyScan } from './checks/safety.js';
import { runtimeTest } from './checks/runtime.js';
import { determinismCheck } from './checks/determinism.js';
import { removeDebug } from './fixers/debug.js';
import { injectSeed } from './fixers/seed.js';

export class QualityGate {
  async run(gamePath: string, fix: boolean) {



    let safetyIssues = await safetyScan(gamePath);
    let runtime = await runtimeTest(gamePath);
    let determinism = await determinismCheck(gamePath);

    let passed =
      safetyIssues.length === 0 &&
      runtime.passed &&
      determinism.isDeterministic;

    let fixesApplied = false;



    if (fix && !passed) {
      if (safetyIssues.length > 0) {
        await removeDebug(gamePath);
        fixesApplied = true;
      }

      if (!determinism.isDeterministic) {
        await injectSeed(gamePath);
        fixesApplied = true;
      }

      
      
      safetyIssues = await safetyScan(gamePath);
      runtime = await runtimeTest(gamePath);
      determinism = await determinismCheck(gamePath);

      passed =
        safetyIssues.length === 0 &&
        runtime.passed &&
        determinism.isDeterministic;
    }

    return {
      passed,
      safetyIssues,
      runtime,
      determinism,
      fixesApplied,
    };
  }
}
