README.md: |
  # Quality Gate – Case Study

  Version: 2.0  
  Stack: TypeScript · Node.js 18+ · Playwright

  ------------------------------------------------------------------------------

  ## Overview

  This project implements an automated Quality Gate for Phaser-based HTML5 games.
  The gate validates security, runtime stability, and determinism before a game can pass.

  The system detects issues, applies rule-based auto-fixes where allowed, and produces
  both JSON and human-readable reports.

  Critical security issues always fail closed and are never auto-fixed.

  ------------------------------------------------------------------------------

  ## Quality Gate Layers

  - Safety Scan (static analysis)
  - Runtime Smoke Test (Playwright)
  - Determinism Check (Math.random + seed)
  - Auto-Fix Pipeline (rule-based, no LLM)

  ------------------------------------------------------------------------------

  ## Project Structure

  case-study/
    README.md
    TECHNICAL_SPEC.md
    package.json
    tsconfig.json
    tsconfig.build.json
    tracker/
    test-games/
      clean-game/
      debug-game/
      unsafe-game/
      random-game/
      broken-game/
    solution/
      src/

  ------------------------------------------------------------------------------

  ## Mandatory Requirements

  - Detect eval, new Function, innerHTML, document.write, debugger
  - Runtime validation using Playwright
  - Determinism detection via Math.random and seeding
  - Auto-fix:
    - remove console.*
    - remove debugger
    - inject seed when missing
  - CLI: check <path> [--fix] [--json]
  - JSON and human-readable output
  - Offline execution
  - No LLM usage

  ------------------------------------------------------------------------------

  ## Installation

  npm install
  npx playwright install

  ------------------------------------------------------------------------------

  ## Type Check

  npm run typecheck

  ------------------------------------------------------------------------------

  ## Build

  npm run build

  ------------------------------------------------------------------------------

  ## Running the Quality Gate

  npm run check -- test-games/clean-game
  npm run check -- test-games/debug-game
  npm run check -- test-games/debug-game --fix
  npm run check -- test-games/random-game
  npm run check -- test-games/random-game --fix
  npm run check -- test-games/unsafe-game
  npm run check -- test-games/broken-game

  ------------------------------------------------------------------------------

  ## Expected Outputs

  clean-game
    check                -> PASSED

  debug-game
    check                -> FAILED
    check --fix           -> PASSED

  random-game
    check                -> FAILED
    check --fix           -> PASSED

  unsafe-game
    check                -> FAILED (CRITICAL security issues)
    check --fix           -> FAILED

  broken-game
    check                -> FAILED (runtime error)

  ------------------------------------------------------------------------------

  ## Architecture

  solution/src/
    index.ts
    quality-gate.ts
    cli.ts
    types.ts
    checks/
      safety-scan.ts
      runtime-test.ts
      determinism.ts
    fixers/
      debug-remover.ts
      innerhtml-sanitizer.ts
      random-seeder.ts

  ------------------------------------------------------------------------------

  ## Security Policy

  CRITICAL security issues (eval, new Function):
  - Are detected
  - Are reported
  - Are NOT auto-fixed
  - Cause the Quality Gate to FAIL

  ------------------------------------------------------------------------------

  ## Submission Checklist

  npm run typecheck
  npm run build
  npm run check -- test-games/clean-game
  npm run submit

  ------------------------------------------------------------------------------

  ## Notes

  - Auto-fix pipeline is idempotent
  - Fixes trigger a full re-scan
  - Runtime failures always fail the gate
  - Determinism requires reproducibility, not absence of randomness

  ------------------------------------------------------------------------------

  Status: Submission Ready
