import { readFile } from 'fs-extra';
import { join, resolve } from 'path';
import { PackageInfo } from './customTypes';
import { nodeModulesPath, rootPath } from './paths';

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

export async function loadPackageInfos() {
  const pkgStr = await readFile(join(rootPath, "package.json"), "utf8");
  const pkg = JSON.parse(pkgStr);

  return Promise.all<PackageInfo>(
    Object.keys(pkg.dependencies).map(toPackageInfo)
  );
}
