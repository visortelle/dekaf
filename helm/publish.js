#!/usr/bin/env node

const execSync = require('child_process').execSync;
const fs = require('fs');
const os = require('os');
const path = require('path');

const thisDir = __dirname;
const chartRoot = `${thisDir}/pulsocat-helm`;

function publishChart(name, version) {
  const tmpDir = path.join(os.tmpdir(), `pulsocat-helm-${new Date().getTime()}`);
  console.info(`Copying Helm Chart to ${tmpDir}`);
  execSync(`mkdir -p ${tmpDir}`);
  execSync(`cp -r "${chartRoot}" ${tmpDir}/`);
  const tmpChartRoot = `${tmpDir}/pulsocat-helm`;
  const chartYaml = `${tmpChartRoot}/Chart.yaml`;

  try {
    console.info(`Setting ${name} as the name of Helm Chart.`);
    const chartFiles = readDirRecursive(tmpDir);
    chartFiles.forEach(file => {
      const fileContent = fs.readFileSync(file, 'utf8');
      const newFileContent = fileContent.replace(/_chart-name/g, name);
      fs.writeFileSync(file, newFileContent, { encoding: 'utf8' });
    });

    console.info(`Setting ${publicReleaseVersion} as the version of Helm Chart.`);
    const chartYamlContent = fs.readFileSync(chartYaml, 'utf8');
    const newChartYamlContent = chartYamlContent.replace(/^version: .*/gm, `version: ${version}`);
    fs.writeFileSync(chartYaml, newChartYamlContent, { encoding: 'utf8' });

    console.info(`Pushing Helm Chart to the OCI registry...`);
    execSync(`echo $DOCKER_PASS | helm registry login --password-stdin --username $DOCKER_USER docker.io`);
    execSync(`rm -rf ${tmpDir}/*.tgz`);
    execSync(`helm package ${tmpChartRoot}`, { cwd: tmpDir });
    const packageTgz = execSync(`ls -1 ${tmpDir}/*.tgz`).toString().trim().split('\n');
    execSync(`helm push ${packageTgz} oci://docker.io/tealtools`, { cwd: tmpDir });
  } catch (e) {
    throw e;
  } finally {
    console.info(`Cleaning up. Deleting ${tmpDir}`);
    execSync(`rm -rf ${tmpDir}`);
  }
}

const gitRev = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).toString().trim();
const publicReleaseVersion = execSync('git --no-pager tag --contains', { encoding: 'utf-8' }).toString().trim().replace(/^v/, '');

publishChart('pulsocat-helm-dev', `0.0.0-${gitRev}`);

if (publicReleaseVersion) {
  publishChart('pulsocat-helm', publicReleaseVersion);
}

// Thanks to Copilot :)
function readDirRecursive(dir) {
  const files = fs.readdirSync(dir);
  const filesWithDir = files.map(file => `${dir}/${file}`);
  const filesWithDirAndSubdir = filesWithDir.map(file => {
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      return readDirRecursive(file);
    } else {
      return file;
    }
  });
  return filesWithDirAndSubdir.flat();
}
