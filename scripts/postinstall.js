#!/usr/bin/env node
import fs from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundledConfigPath = join(root, 'apicli.yaml');
const userConfigPath = join(homedir(), '.apicli');

const log = (message) => console.log(`[apicli] ${message}`);

if (!fs.existsSync(bundledConfigPath)) process.exit(0);

if (fs.existsSync(userConfigPath)) {
  log(`Using existing ${userConfigPath}`);
  process.exit(0);
}

if (!input.isTTY || !output.isTTY) {
  log(`No interactive terminal detected. Using bundled config at ${bundledConfigPath}`);
  process.exit(0);
}

const rl = createInterface({ input, output });

try {
  const answer = (await rl.question(`Copy apicli.yaml to ${userConfigPath}? [Y/n] `)).trim().toLowerCase();
  if (answer === '' || answer === 'y' || answer === 'yes') {
    fs.copyFileSync(bundledConfigPath, userConfigPath);
    log(`Copied config to ${userConfigPath}`);
  } else {
    log(`Using bundled config at ${bundledConfigPath}`);
  }
} catch (err) {
  log(`Install prompt failed: ${err.message}`);
  log(`Using bundled config at ${bundledConfigPath}`);
} finally {
  rl.close();
}
