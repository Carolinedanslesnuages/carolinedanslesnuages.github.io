#!/usr/bin/env node
/**
 * Writes dist/poids.json for the desktop weight widget, from Solange's measurement:
 *   node solange.mjs --json > solange.json && node scripts/write-weight.mjs solange.json
 * Only the total and its budget are kept. The file is a few dozen bytes: writing it after the
 * measurement does not change the figure.
 */
import { readFile, writeFile } from 'node:fs/promises';

const [measurementPath, outputPath = 'dist/poids.json'] = process.argv.slice(2);
if (!measurementPath) {
  console.error('Usage : node scripts/write-weight.mjs <mesure de Solange en JSON> [fichier de sortie]');
  process.exit(1);
}
const measurement = JSON.parse(await readFile(measurementPath, 'utf8'));
const total = (measurement.genres || []).find((kindRow) => kindRow.genre === 'total');
if (!total || !Number.isFinite(total.octets) || !Number.isFinite(total.budget)) {
  console.error("write-weight : pas de ligne « total » avec un budget dans la mesure de Solange.");
  process.exit(1);
}
const weight = { totalBytes: total.octets, budgetBytes: total.budget, measuredAt: new Date().toISOString() };
await writeFile(outputPath, JSON.stringify(weight) + '\n');
console.log(`Poids du site : ${Math.round(total.octets / 1000)} Ko sur ${Math.round(total.budget / 1000)} Ko.`);
