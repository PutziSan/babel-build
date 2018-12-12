import { join, resolve } from 'path';

export const rootPath = process.cwd();
export const nodeModulesPath = resolve(join(rootPath, "node_modules"));
export const outPath = resolve(join(rootPath, ".out"));
