import path from 'node:path';
import fsAsync from 'node:fs/promises';
import fs from "node:fs";
import fsExtra from "fs-extra";
import os from 'node:os';
import tar from "tar";

async function prepare() {
  const platform = os.platform();
  const arch = os.arch();

  console.info('Preparing Dekaf dependencies.');

  const depsDir = path.resolve(path.join(process.cwd(), "dependencies"));
  console.info("Dependencies dir:", depsDir);

  const platformDepsDir = path.resolve(path.join(depsDir, "src", platform, arch));
  console.info("Platform dependencies dir:", platformDepsDir);

  const depsOutDir = path.resolve(path.join(depsDir, "build"));
  console.info("Dependencies out dir:", depsOutDir);

  const graalvmSrc = path.resolve(path.join(platformDepsDir, platform === "win32" ? "graalvm.zip" : "graalvm.tar.gz"));
  const graalvmOut = path.resolve(path.join(depsOutDir, "graalvm"));
  await fsExtra.ensureDir(graalvmOut);
  fs.createReadStream(graalvmSrc).pipe(tar.x({ strip: 1, C: graalvmOut }));
}

prepare();
