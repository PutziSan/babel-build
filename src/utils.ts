import { mkdir, exists } from 'fs';
import { dirname } from 'path';

export function either(a: (val: any) => boolean, b: (val: any) => boolean) {
  return (val: any) => {
    return a(val) || b(val);
  }
}

export function when<T, R>(cond: (val: T) => boolean, then: (val: T) => R) {
  return (val: T) => {
    if (cond(val)) {
      return then(val);
    }
  }
}

export function slash(str: string) {
  return str.replace(/\\/g, '/');
}
