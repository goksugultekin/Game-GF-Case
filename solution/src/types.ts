

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export interface ScanResult {
  file: string;
  line: number;
  column: number;
  pattern: string;
  severity: Severity;
  snippet: string;
}

export interface RuntimeResult {
  passed: boolean;
  loadTimeMs?: number;
  consoleErrors?: string[];
}

export interface DeterminismResult {
  isDeterministic: boolean;
  randomCalls?: number;
}

export interface QualityGateResult {
  passed: boolean;
  safetyIssues: ScanResult[];
  runtime: RuntimeResult;
  determinism: DeterminismResult;
  fixesApplied?: boolean;
}
