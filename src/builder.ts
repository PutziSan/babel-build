import * as babelCore from "@babel/core";
import * as bluebird from "bluebird";
import * as browserSync from "browser-sync";
import { load } from "cheerio";
import { watch } from "chokidar";
import * as fs from "fs";
import { dirname, extname, join, relative, resolve } from "path";
import {
  CustomModuleInfo,
  ImportInfo,
  ModuleInfo,
  ModuleType,
  NodeModuleInfo,
  PackageInfo,
  SrcEvents
} from "./customTypes";
import { createPlugin } from "./new-babel-plugin-ts";
import { createMemo, fatalWrite, slash, urlRelative } from './utils';

const transformFile = bluebird.promisify(babelCore.transformFile);
const readFile = bluebird.promisify<string, string, string>(fs.readFile);
const writeFile = bluebird.promisify<void, string, string>(fs.writeFile as any);
const unlinkFile = bluebird.promisify<void, string>(fs.unlink);
const mkdirP = bluebird.promisify<void, string>(require("mkdirp"));
const rimraf = bluebird.promisify<void, string>(require("rimraf"));

const rootPath = process.cwd();
const nodeModulesPath = resolve(join(rootPath, "node_modules"));
const outPath = resolve(join(rootPath, ".out"));

async function dependencyToModulePath(dependency: string) {
  const moduleDir = join(nodeModulesPath, dependency);
  const modulePkgStr = await readFile(join(moduleDir, "package.json"), "utf8");

  const { module, main } = JSON.parse(modulePkgStr);

  if (module) {
    return resolve(join(moduleDir, module));
  }

  if (main) {
    return resolve(join(moduleDir, main));
  }

  // fallback to default-require.resolve-algorithm
  return require.resolve(dependency);
}

async function toPackageInfo(dependency: string): Promise<PackageInfo> {
  const defaultFilePath = await dependencyToModulePath(dependency);

  return {
    defaultFilePath,
    packageName: dependency,
    path: join(nodeModulesPath, dependency)
  };
}

function importedIsPackage(importedPath: string, packageName: string) {
  if (importedPath === packageName) {
    return true;
  }

  if (importedPath.split("/")[0] === packageName) {
    return true;
  }

  return false;
}

function isPackageForPath(importedPath: string) {
  return (packageInfo: PackageInfo) => {
    return importedIsPackage(importedPath, packageInfo.packageName);
  };
}

function filePathFromPackage(importedPath: string, packageInfo: PackageInfo) {
  if (packageInfo.packageName === importedPath) {
    return packageInfo.defaultFilePath;
  } else {
    // `import or from 'ramda/or';`
    // node_modules und dann den importierten path dranhängen
    return join(nodeModulesPath, importedPath);
  }
}

function toJsExt(path: string) {
  const ext = extname(path);

  if (ext !== ".js") {
    return path.substr(0, path.length - ext.length) + ".js";
  }
  return path;
}

function toNodeModuleInfo(
  packageInfo: PackageInfo,
  srcPath: string,
  importedPath: string
): NodeModuleInfo {
  const filePath = resolve(filePathFromPackage(importedPath, packageInfo));

  return {
    ...packageInfo,
    type: ModuleType.nodeModule,
    filePath,
    relativeJsImportPath: toJsExt(urlRelative(dirname(srcPath), filePath))
  };
}

function toCustomModuleInfo(
  srcPath: string,
  importedPath: string
): CustomModuleInfo {
  const filePath = resolve(join(dirname(srcPath), importedPath));

  return {
    type: ModuleType.customModule,
    filePath,
    relativeJsImportPath: toJsExt(urlRelative(dirname(srcPath), filePath))
  };
}

async function handleJs(
  packageInfos: PackageInfo[],
  path: string,
  { onNewSrc, onUnlink, onChange }: SrcEvents
) {
  const outputPath = toJsExt(join(outPath, relative(rootPath, path)));
  await mkdirP(dirname(outputPath));

  function moduleInfoFromPath(importedPath: string): ModuleInfo {
    const packageInfo = packageInfos.find(isPackageForPath(importedPath));

    return packageInfo
      ? toNodeModuleInfo(packageInfo, path, importedPath)
      : toCustomModuleInfo(path, importedPath);
  }

  const isKnown = createMemo();

  function handleNewImport(importInfo: ImportInfo) {
    // das wird doppelt aufgerufen, da `replacePath` im babel-plugin ein neues import-node hinzufügt
    // und für dieses import-node wird erneut in den plugin-visitor gegangen wodurch es auch wieder handleNewImport aufruft
    // da wir die umgeschriebenen imports aber nicht beobachten oder händeln wollen, werden sie ignoriert
    if (isKnown(importInfo.importedPath, importInfo.newImportPath)) {
      return;
    }
    onNewSrc(importInfo.moduleInfo.filePath);
  }

  const transformOpts = {
    plugins: [
      createPlugin({ moduleInfoFromPath, onNewImport: handleNewImport })
    ],
    sourceMaps: "inline"
  };

  const babelify = async () => {
    const { code } = await transformFile(path, transformOpts);

    console.log(`write to ${outputPath}`);

    await fatalWrite(outputPath, code);

    onChange(outputPath);
  };

  watch(path, { disableGlobbing: true })
    .on("change", babelify)
    .on("unlink", () => {
      unlinkFile(outputPath).catch(error => console.trace(error));
      onUnlink(path);
    });

  return babelify().catch(console.trace);
}

async function loadPackageInfos() {
  const pkgStr = await readFile(join(rootPath, "package.json"), "utf8");
  const pkg = JSON.parse(pkgStr);

  return Promise.all<PackageInfo>(
    Object.keys(pkg.dependencies).map(toPackageInfo)
  );
}

async function handleHtml(
  path: string,
  { onNewSrc, onUnlink, onChange }: SrcEvents
) {
  const outputPath = join(outPath, relative(rootPath, path));
  await mkdirP(dirname(outputPath));

  const checkFile = async () => {
    const htmlCode = await readFile(path, "utf8");

    const $ = load(htmlCode);

    $("script").each((i, ele) => {
      const src = $(ele).attr("src");
      const srcPath = resolve(join(dirname(path), src));
      if (fs.existsSync(srcPath)) {
        onNewSrc(srcPath);

        const jsSrc = toJsExt(src);

        if (jsSrc !== src) {
          $(ele).attr("src", jsSrc);
        }
      }
    });

    await fatalWrite(outputPath, $.html());

    onChange(outputPath);
  };

  watch(path, { disableGlobbing: true })
    .on("change", () => checkFile().catch(console.trace))
    .on("unlink", onUnlink);

  return checkFile().catch(console.trace);
}

async function start() {
  const bs = browserSync.create();

  await rimraf(outPath);
  await mkdirP(outPath);

  const packageInfos = await loadPackageInfos();

  const done: { [key: string]: boolean } = {};
  const firstPromises: Promise<any>[] = [];
  let isReady = false;

  function handleUnlink(path: string) {
    // wenn file gelöscht und später wieder hinzugefügt wird mit gleichem Namen, muss es erneut prozessiert werden
    done[path] = false;
  }

  function handleChange(outputPath: string) {
    if (isReady) {
      console.log(`changed ${outputPath}, rel: ${slash(relative(outPath, outputPath))}`);
      bs.reload(slash(relative(outPath, outputPath)));
    }
  }

  const srcHandler: SrcEvents = {
    onNewSrc: handleNewFile,
    onUnlink: handleUnlink,
    onChange: handleChange
  };

  async function checkIsReady() {
    if (isReady) {
      return;
    }

    const currentPromises = firstPromises.slice();
    await Promise.all(currentPromises);

    if (isReady) {
      return;
    }

    isReady = currentPromises.length === firstPromises.length;

    if (isReady) {
      bs.init({ server: outPath });
      console.timeEnd('start');
    }
  }

  function handleNewFile(path: string) {
    if (done[path]) {
      return;
    }

    done[path] = true;

    const ext = extname(path);

    let firstProm;

    switch (ext) {
      case ".mjs":
      case ".js":
        firstProm = handleJs(packageInfos, path, srcHandler).catch(error => {
          console.trace(error);
          process.exit(1);
        });
        break;
      case ".html":
        firstProm = handleHtml(path, srcHandler).catch(error => {
          console.trace(error);
          process.exit(1);
        });
        break;
    }

    if (firstProm) {
      firstPromises.push(firstProm);
      firstProm.then(checkIsReady);
    }
  }

  handleNewFile(join(rootPath, "index.html"));
}

console.time('start');

start().catch(console.trace);
// handleHtml(join(rootPath, "index.html")).catch(console.trace);
