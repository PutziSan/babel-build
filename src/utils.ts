import * as bluebird from 'bluebird';
import * as fs from "fs";
import { dirname, relative } from "path";

export function either(a: (val: any) => boolean, b: (val: any) => boolean) {
  return (val: any) => {
    return a(val) || b(val);
  };
}

export function when<T, R>(cond: (val: T) => boolean, then: (val: T) => R) {
  return (val: T) => {
    if (cond(val)) {
      return then(val);
    }
  };
}

export function slash(str: string) {
  return str.replace(/\\/g, "/");
}

export function urlRelative(from: string, to: string) {
  let res = slash(relative(from, to));

  if (res.charAt(0) !== ".") {
    res = "./" + res;
  }

  return res;
}

export function createMemo() {
  const map: { [key: string]: boolean } = {};

  return (key: string, memoKey?: string) => {
    if (map[key]) {
      return true;
    }

    map[memoKey !== undefined ? memoKey : key] = true;
    return false;
  };
}

const writeFile = bluebird.promisify<void, string, string>(fs.writeFile as any);

export function fatalWrite(path: string, content: string) {
  return writeFile(path, content)
    .catch(error => {
      console.trace(error);
      process.exit(1);
    })
}
