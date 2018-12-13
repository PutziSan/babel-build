import { readFile } from "fs-extra";
import { join, resolve } from "path";
import { PackageInfo } from "./customTypes";
import { nodeModulesPath, rootPath } from "./paths";

interface NodePackageJson {
  name: string;
  module?: string;
  main?: string;
  dependencies?: {
    [key: string]: string;
  };
}

async function loadPkgJson(packagePath: string): Promise<NodePackageJson> {
  const pgkStr = await readFile(join(packagePath, "package.json"), "utf8");
  return JSON.parse(pgkStr);
}

function modulePathFromPackageJson(packageJson: NodePackageJson) {
  const { name, main, module } = packageJson;

  const moduleDir = join(nodeModulesPath, name);

  if (module) {
    return resolve(join(moduleDir, module));
  }

  if (main) {
    return resolve(join(moduleDir, main));
  }

  // fallback to default-require.resolve-algorithm
  try {
    return require.resolve(name);
  } catch (e) {
    console.warn(e);
    return moduleDir;
  }
}

function toPackageInfo(packageJson: NodePackageJson): PackageInfo {
  return {
    defaultFilePath: modulePathFromPackageJson(packageJson),
    packageName: packageJson.name,
    path: join(nodeModulesPath, packageJson.name)
  };
}

/**
 * loads all dependencies (recursive)
 */
export async function loadPackageInfos() {
  const rootPkg = await loadPkgJson(rootPath);

  const done = new Map<string, boolean>();

  const queue = rootPkg.dependencies ? Object.keys(rootPkg.dependencies) : [];
  const res: PackageInfo[] = [];

  async function loadPackageInfo(packageName: string) {
    if (done.get(packageName)) {
      return;
    }
    done.set(packageName, true);

    const pkgJson = await loadPkgJson(join(nodeModulesPath, packageName));

    if (pkgJson.dependencies) {
      queue.push(...Object.keys(pkgJson.dependencies));
    }

    res.push(toPackageInfo(pkgJson));
  }

  while (true) {
    if (queue.length <= 0) {
      break;
    }

    const pkgs = queue.splice(0, queue.length); // clears array and returns all elements

    await Promise.all(pkgs.map(loadPackageInfo));
  }

  return res;
}
