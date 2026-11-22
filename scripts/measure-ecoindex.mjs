#!/usr/bin/env node
/**
 * Measures a page the way the official EcoIndex scraper does (cnumr/EcoIndex_python,
 * components/ecoindex/scraper/scrap.py): a fresh browser context recording a HAR file, a
 * 1920×1080 window, 3 s before scrolling, a scroll to the bottom, 3 s after.
 *   - nodes: every element, minus the elements inside an <svg>;
 *   - requests: every HAR entry;
 *   - size: the sum of the transferred sizes, divided by 1000.
 * Prints { nodes, requests, size } as JSON. The score itself is computed by the official package
 * (scripts/ecoindex.py): the method is not copied here.
 *   node scripts/measure-ecoindex.mjs http://localhost:4173/
 */
import { chromium } from 'playwright';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pageAddress = process.argv[2];
if (!pageAddress) {
  console.error('Usage : node scripts/measure-ecoindex.mjs <adresse de la page>');
  process.exit(1);
}
const WAIT_BEFORE_SCROLL_MS = 3000;
const WAIT_AFTER_SCROLL_MS = 3000;

const harFolder = await mkdtemp(join(tmpdir(), 'ecoindex-'));
const harPath = join(harFolder, 'page.har');
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordHar: { path: harPath } });
  const page = await context.newPage();
  const response = await page.goto(pageAddress);
  if (!response || response.status() !== 200) throw new Error(`la page répond ${response ? response.status() : 'rien'}`);
  await page.waitForLoadState();
  await page.waitForTimeout(WAIT_BEFORE_SCROLL_MS);
  await page.keyboard.press('ArrowDown');
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  await page.waitForTimeout(WAIT_AFTER_SCROLL_MS);
  const nodes = (await page.locator('*').count()) - (await page.locator("//*[local-name()='svg']//*").count());
  await page.close();
  await context.close(); // writes the HAR file
  const entries = JSON.parse(await readFile(harPath, 'utf8')).log.entries;
  const transferredBytes = entries.reduce((total, entry) => {
    const transferSize = entry.response._transferSize;
    return total + (typeof transferSize === 'number' && transferSize !== -1 ? transferSize : Buffer.byteLength(JSON.stringify(entry.response)));
  }, 0);
  console.log(JSON.stringify({ nodes, requests: entries.length, size: transferredBytes / 1000 }));
} finally {
  await browser.close();
  await rm(harFolder, { recursive: true, force: true });
}
