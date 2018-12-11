import * as babelCore from "@babel/core";
import * as bluebird from "bluebird";
import * as fs from "fs";
import { dirname, join, relative, resolve } from "path";
import {
  ImportInfo,
  ModuleInfo,
  ModuleType,
  NodeModuleInfo,
  PackageInfo
} from "./customTypes";
import { createPlugin } from "./new-babel-plugin-ts";
import { slash } from "./utils";

const transformFile = bluebird.promisify(babelCore.transformFile);
const readFile = bluebird.promisify<string, string, string>(fs.readFile);
// @ts-ignore
const writeFile = bluebird.promisify<string, string>(fs.writeFile);
const mkdirP = bluebird.promisify<void, string>(require("mkdirp"));

const rootPath = process.cwd();
const nodeModulesPath = resolve(join(rootPath, "node_modules"));
const srcPath = resolve(join(rootPath, "src"));

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
    type: ModuleType.nodeModule,
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

async function babelifyFile(
  packageInfos: PackageInfo[],
  path: string,
  onNewImport: (importInfo: ImportInfo) => void
) {
  function moduleInfoFromPath(importedPath: string): ModuleInfo {
    const packageInfo = packageInfos.find(isPackageForPath(importedPath));

    if (packageInfo) {
      return {
        ...packageInfo,
        filePath: resolve(filePathFromPackage(importedPath, packageInfo))
      };
    }

    return {
      type: ModuleType.customModule,
      filePath: resolve(join(path, importedPath))
    };
  }

  function newImportPath(moduleInfo: ModuleInfo): string {
    return slash(relative(rootPath, moduleInfo.filePath));
  }

  const customPlugin = createPlugin({
    moduleInfoFromPath,
    newImportPath,
    onNewImport
  });

  const { code } = await transformFile(path, {
    babelrc: false,
    configFile: false,
    plugins: [customPlugin]
  });

  const outputPath = join(rootPath, ".out", "js", relative(rootPath, path));

  await mkdirP(dirname(outputPath));

  return writeFile(outputPath, code);
}

async function doIt() {
  const pkgStr = await readFile(join(rootPath, "package.json"), "utf8");
  const pkg = JSON.parse(pkgStr);

  const packageInfos = await Promise.all<PackageInfo>(
    Object.keys(pkg.dependencies).map(toPackageInfo)
  );

  const done: { [key: string]: boolean } = {};

  async function doFile(path: string): Promise<any> {
    if (done[path]) {
      return;
    }

    done[path] = true;

    return babelifyFile(packageInfos, path, async importInfo => {
      return doFile(importInfo.moduleInfo.filePath);
    });
  }

  return doFile(join(rootPath, "test-src", "index.js"));
}

doIt();
// (node:12388) UnhandledPromiseRejectionWarning: Error: ENOENT: no such file or directory, open '
// C:\Users\bahsi\dev_projects\babel-plugin\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\test-src\index.js\node_modules\preact\dist\preact.mjs'