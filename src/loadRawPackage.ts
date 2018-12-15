import 'source-map-support/register';
import * as babelCore from "@babel/core";
import * as bluebird from "bluebird";
import { writeFile } from "fs-extra";
import { dirname, join, normalize, relative, resolve } from 'path';
import { createPlugin, ImportInfo } from "./babel-plugin-get-imports";
import { createMemo, fatalWrite, GET, mkdirP, slash } from './utils';
import babelPluginJsxSyntax from '@babel/plugin-syntax-jsx';
import babelPluginClassPropSyntax from '@babel/plugin-syntax-class-properties';


const rimraf = bluebird.promisify<void, string>(require("rimraf"));
const transform = bluebird.promisify(babelCore.transform);

async function tryPaths(
  url: string,
  extensions: string[]
): Promise<{ data: string; loadedUrl: string }> {
  const len = extensions.length;

  for (let i = 0; i < len; i++) {
    const loadedUrl = url + extensions[i];

    console.log(`try loading ${loadedUrl}`);

    const { data, statusCode } = await GET('https://' + loadedUrl);

    if (statusCode === 200) {
      return { data, loadedUrl };
    }
  }

  throw new Error(
    `url ${url}  with extensions (${extensions.join(
      ", "
    )}) not found or other problems`
  );
}

async function loadRawPackage(startUrl: string, dist: string) {
  await rimraf(dist);
  await mkdirP(dist);

  const dir = dirname(startUrl);

  const isDone = createMemo();

  function handleNewUrl(url: string) {
    if (isDone(url)) {
      return;
    }

    loadFile(url).catch(error => {
      console.error(error);
      console.trace(error);
      process.exit(1);
    });
  }

  async function loadFile(url: string) {
    const { data, loadedUrl } = await tryPaths(url, ["", ".js", "/index.js"]);
    isDone(loadedUrl);

    const strain = dirname(loadedUrl);

    const outPath = join(dist, relative(dir, loadedUrl));

    await mkdirP(dirname(outPath));

    const { onNewImport, plugin } = createPlugin();

    function handleNewImport(importInfo: ImportInfo) {
      if (importInfo.importedPath.charAt(0) !== '.') {
        return;
      }

      const newFile = slash(normalize(join(strain, importInfo.importedPath)));
      handleNewUrl(newFile);
    }

    onNewImport(handleNewImport);

    const { code } = await transform(data, {
      configFile: false,
      babelrc: false,
      plugins: [babelPluginJsxSyntax, babelPluginClassPropSyntax, plugin]
    });

    return fatalWrite(outPath, code)
  }

  handleNewUrl(startUrl);
}

loadRawPackage(
  "raw.githubusercontent.com/mui-org/material-ui/master/packages/material-ui/src/index.js",
  join(process.cwd(), ".copied_node_modules", "@material-ui/core")
).catch(err => {
  console.error(err);
  console.trace(err);
});
