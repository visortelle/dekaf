#!/usr/bin/env node

const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

function getEnvoyBin() {
  const arch = os.arch();
  const platform = os.platform();

  const repoRoot = path.join(__dirname, '..');
  const dir = `${repoRoot}/bin/${platform}/${arch}`;

  if (!fs.existsSync(dir)) {
    throw new Error(`Binary dependencies directory not found: ${dir}`);
  }

  return dir;
}

console.log(getEnvoyBin());
