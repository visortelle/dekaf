#!/usr/bin/env node

const path = require('node:path');
const { execSync } = require('node:child_process');

const version = process.argv[2];
const gitTag = `v${version}`;

if (version === undefined) {
  console.info(`You must specify a version`);
  return;
}

const repoRoot = path.join(__dirname, '..');

function checkIsVersionExists(version) {
  try {
    return execSync(`git tag -l v${version}`, { cwd: repoRoot }).toString() !== '';
  } catch (err) {
    console.log(err);
    return false;
  };
}

const isExists = checkIsVersionExists(version);
if (isExists) {
  console.info(`Version ${version} already exists`);
  process.exit(1);
}


function setDesktopAppVersion(version) {
  const dekafDesktopRoot = path.join(repoRoot, 'desktop', 'electron');
  execSync(`npm version ${version} --allow-same-version`, { cwd: dekafDesktopRoot, stdio: 'inherit', encoding: 'utf-8' });
}

function setVersion(version) {
  execSync(`git tag -a ${gitTag} -m "Bump Dekaf version to: ${version}"`, { cwd: repoRoot, stdio: 'inherit', encoding: 'utf-8' });
}

function pushGitTag(gitTag) {
  execSync(`git push origin refs/tags/${gitTag}`, { cwd: repoRoot, stdio: 'inherit', encoding: 'utf-8' });

}

setDesktopAppVersion(version);
setVersion(version);
pushGitTag(gitTag);
