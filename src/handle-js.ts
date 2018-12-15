import * as babelCore from "@babel/core";
import { TransformOptions } from "@babel/core";
import * as bluebird from "bluebird";
import { dirname, join, relative, resolve } from "path";
import {
  CustomModuleInfo,
  NewImportInfo,
  ModuleInfo,
  ModuleType,
  NodeModuleInfo,
  PackageInfo
} from "./customTypes";
import { createPlugin } from "./new-babel-plugin-ts";
import { nodeModulesPath, outPath, rootPath } from "./paths";
import { createMemo, createNewEvent, toJsExt, urlRelative } from "./utils";

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

  const pkgNameLen = packageName.length;

  if (
    // check for importing submodules like: `import Button from '@material-ui/core/Button';`
    importedPath.substr(0, pkgNameLen) === packageName &&
    importedPath.charAt(pkgNameLen) === "/"
  ) {
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
  transformOptions: TransformOptions
) {
  const outputPath = toJsExt(join(outPath, relative(rootPath, path)));
  await mkdirP(dirname(outputPath));

  const [onNewSrc, fireNewSrc] = createNewEvent<[string]>();

  function moduleInfoFromPath(importedPath: string): ModuleInfo {
    const packageInfo = packageInfos.find(isPackageForPath(importedPath));

    return packageInfo
      ? toNodeModuleInfo(packageInfo, path, importedPath)
      : toCustomModuleInfo(path, importedPath);
  }

  const isKnown = createMemo();

  function handleNewImport(importInfo: NewImportInfo) {
    // das wird doppelt aufgerufen, da `replacePath` im babel-plugin ein neues import-node hinzufügt
    // und für dieses import-node wird erneut in den plugin-visitor gegangen wodurch es auch wieder handleNewImport aufruft
    // da wir die umgeschriebenen imports aber nicht beobachten oder händeln wollen, werden sie ignoriert
    if (isKnown(importInfo.importedPath, importInfo.newImportPath)) {
      return;
    }
    fireNewSrc(importInfo.moduleInfo.filePath);
  }

  const transformOpts = {
    ...transformOptions,
    plugins: [
      ...transformOptions.plugins,
      createPlugin({ moduleInfoFromPath, onNewImport: handleNewImport })
    ]
  };

  return [() => transformFile(path, transformOpts), { onNewSrc }];
}

/*
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
 */
