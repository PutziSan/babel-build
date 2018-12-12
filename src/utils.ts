import * as bluebird from 'bluebird';
import * as fs from "fs";
import { dirname, extname, relative } from 'path';
import * as mkdirp from 'mkdirp';
import { outPath } from './paths';

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

export function toJsExt(path: string) {
  const ext = extname(path);

  if (ext !== ".js") {
    return path.substr(0, path.length - ext.length) + ".js";
  }
  return path;
}

export const mkdirP = bluebird.promisify<void, string>(mkdirp);

type OnReady = (fn: () => void) => void;
type AddToQueue = (promise: Promise<any>) => void;

export function newPromiseQueue(): [OnReady, AddToQueue] {
  let isReady = false;
  let called = false;
  const promiseQueue: Promise<any>[] = [];
  const callbacks: (() => void)[] = [];

  async function checkIsReady() {
    if (isReady) {
      return;
    }

    const currentQueue = promiseQueue.slice();
    await Promise.all(currentQueue);

    isReady = currentQueue.length === promiseQueue.length;

    if (isReady && !called) {
      called = true;
      callbacks.forEach(callback => callback());
    }
  }

  const onReady = (fn: () => void) => {
    callbacks.push(fn);
  };

  const addToQueue = (promise: Promise<any>) => {
    promiseQueue.push(promise);
    promise.then(checkIsReady);
  };

  return [onReady, addToQueue];
}
