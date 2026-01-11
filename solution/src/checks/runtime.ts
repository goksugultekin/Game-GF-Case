import path from 'path';
import { chromium, type ConsoleMessage, type Page } from 'playwright';

export interface RuntimeResult {
  passed: boolean;
  consoleErrors: string[];
  uncaughtExceptions: string[];
  canvasFound: boolean;
}

export async function runtimeTest(gamePath: string): Promise<RuntimeResult> {
  const browser = await chromium.launch({ headless: true });
  const page: Page = await browser.newPage();

  const consoleErrors: string[] = [];
  const uncaughtExceptions: string[] = [];

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err: Error) => {
    uncaughtExceptions.push(err.message);
  });


  const indexPath = path.resolve(gamePath, 'index.html');
  await page.goto(`file://${indexPath}`, { timeout: 10000 });

  await page.waitForTimeout(3000);

  const canvasFound = await page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    return !!canvas && canvas.width > 0 && canvas.height > 0;
  });

  await browser.close();

  const passed =
    consoleErrors.length === 0 &&
    uncaughtExceptions.length === 0 &&
    canvasFound;

  return {
    passed,
    consoleErrors,
    uncaughtExceptions,
    canvasFound,
  };
}
