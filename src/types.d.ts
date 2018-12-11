declare module '@babel/traverse' {
  import { Node } from '@babel/types';

  class NodePath {
    parent: NodePath;
    node: Node;
    replaceWith(node: Node): void;
    hub: any;
    contexts: any;
    data: any;
    shouldSkip: any;
    shouldStop: any;
    removed: any;
    state: any;
    opts: any;
    skipKeys: any;
    parentPath: any;
    context: any;
    container: any;
    listKey: any;
    inList: any;
    parentKey: any;
    key: any;
    scope: any;
    type: any;
    typeAnnotation: any;
  }
}

declare module '@babel/core' {
  export function transform(code: string, opts: TransformOptions, callback: (err: any, result: BabelFileResult) => void): void;
  export function transformFile(filename: string, opts: TransformOptions, callback: (err: any, result: BabelFileResult) => void): void;

  export interface BabelFileResult {
    code?: string;
    ignored?: boolean;
    map?: object;
  }

  export interface TransformOptions {
    babelrc?: boolean;
    configFile?: boolean;
    plugins?: any[];
  }
}

declare module '@babel/plugin-syntax-dynamic-import';

declare module '@babel/template';

declare module 'mkdirp';
