import * as babelCore from "@babel/core";
import * as bluebird from "bluebird";
import { watch } from "chokidar";
import { unlink } from "fs-extra";
import { dirname, join, relative, resolve } from "path";
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
import { nodeModulesPath, outPath, rootPath } from "./paths";
import { createMemo, fatalWrite, slash, toJsExt, urlRelative } from "./utils";

const transformFile = bluebird.promisify(babelCore.transformFile);
const mkdirP = bluebird.promisify<void, string>(require("mkdirp"));

function filePathFromPackage(importedPath: string, packageInfo: PackageInfo) {
  if (packageInfo.packageName === importedPath) {
    return packageInfo.defaultFilePath;
  } else {
    // `import or from 'ramda/or';`
    // node_modules und dann den importierten path dranhängen
    return join(nodeModulesPath, importedPath);
  }
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

export async function handleJs(
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

  // umschreiben zu relativen pfaden als slash, da es bei win10 teilweise probleme  gibt sonst:
  // zb https://github.com/paulmillr/chokidar/issues/668
  watch(slash(relative(rootPath, path)), { disableGlobbing: true })
    .on("change", babelify)
    .on("unlink", () => {
      unlink(outputPath).catch(error => console.trace(error));
      onUnlink(path);
    });

  return babelify().catch(console.trace);
}
