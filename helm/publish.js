#!/usr/bin/env node

const execSync = require('child_process').execSync;
const fs = require('fs');
const thisDir = __dirname;
const chartRoot = `${thisDir}/pulsocat-helm`;
const chartYaml = `${chartRoot}/Chart.yaml`;
const chartYamlContent = fs.readFileSync(chartYaml, 'utf8');
const publicReleaseVersion = execSync('git --no-pager tag --contains', { encoding: 'utf-8' }).toString().trim();

if (publicReleaseVersion) {
  console.info(`Setting ${publicReleaseVersion} as the version of Helm Chart.`);
  const newChartYamlContent = chartYamlContent.replace(/^version: .*/gm, `version: ${publicReleaseVersion.replace(/^v/, '')}`);
  fs.writeFileSync(chartYaml, newChartYamlContent, { encoding: 'utf8' });

  console.info(`Pushing Helm Chart to the OCI registry...`);
  execSync(`echo $DOCKER_PASS | helm registry login --password-stdin --username $DOCKER_USER docker.io`);
  execSync(`rm -rf ${thisDir}/*.tgz`);
  execSync(`helm package ${chartRoot}`);
  const packageTgz = execSync(`ls -1 ${thisDir}/*.tgz`).toString().trim().split('\n');
  execSync(`helm push ${packageTgz} oci://docker.io/tealtools`);
} else {
  console.log('Not a public release. Skipping push Helm Chart.');
}
