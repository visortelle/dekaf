#!/usr/bin/env node

const path = require('node:path');
const { execSync } = require('node:child_process');

const version = process.argv[2];
const gitBranch = execSync(`git symbolic-ref HEAD 2>/dev/null`).toString();
const gitTag = `v${version}`;

if (version === undefined) {
  console.info(`You must specify a version`);
  return;
}

const repoRoot = path.join(__dirname, '..');

function checkIsVersionExists() {
  try {
    return execSync(`git tag -l v${version}`, { cwd: repoRoot }).toString() !== '';
  } catch (err) {
    console.log(err);
    return false;
  };
}

const isExists = checkIsVersionExists();
if (isExists) {
  console.info(`Version ${version} already exists`);
  process.exit(1);
}


// function setDesktopAppVersion() {
//   const dekafDesktopRoot = path.join(repoRoot, 'desktop', 'electron');
//   execSync(`npm version ${version} --allow-same-version`, { cwd: dekafDesktopRoot, stdio: 'inherit', encoding: 'utf-8' });

//   const dekafDesktopReleaseRoot = path.join(dekafDesktopRoot, 'release', 'app');
//   execSync(`npm version ${version} --allow-same-version`, { cwd: dekafDesktopReleaseRoot, stdio: 'inherit', encoding: 'utf-8' });
// }

function setAndPushVersion() {
// setDesktopAppVersion(version);

  const gitMessage = `Bump Dekaf version to: ${version}`;

  execSync(`git add ${repoRoot}`, { cwd: repoRoot, stdio: 'inherit', encoding: 'utf-8' });
  execSync(`git commit -m  "${gitMessage}"`, { cwd: repoRoot, stdio: 'inherit', encoding: 'utf-8' });

  execSync(`git tag -a ${gitTag} -m "${gitMessage}"`, { cwd: repoRoot, stdio: 'inherit', encoding: 'utf-8' });

  execSync(`git push origin ${gitBranch}`, { cwd: repoRoot, stdio: 'inherit', encoding: 'utf-8' });
  execSync(`git push origin refs/tags/${gitTag}`, { cwd: repoRoot, stdio: 'inherit', encoding: 'utf-8' });
}

setAndPushVersion();
