import * as bluebird from 'bluebird';
import { load } from 'cheerio';
import { watch } from 'chokidar';
import * as fs from "fs";
import { readFile } from 'fs-extra';
import { dirname, join, relative, resolve } from 'path';
import { SrcEvents } from './customTypes';
import { outPath, rootPath } from './paths';
import { fatalWrite, toJsExt } from './utils';

const mkdirP = bluebird.promisify<void, string>(require("mkdirp"));

export async function handleHtml(
  path: string,
  { onNewSrc, onUnlink, onChange }: SrcEvents
) {
  const outputPath = join(outPath, relative(rootPath, path));
  await mkdirP(dirname(outputPath));

  const checkFile = async () => {
    const htmlCode = await readFile(path, "utf8");

    const $ = load(htmlCode);

    $("script").each((i, ele) => {
      const src = $(ele).attr("src");
      const srcPath = resolve(join(dirname(path), src));
      if (fs.existsSync(srcPath)) {
        onNewSrc(srcPath);

        const jsSrc = toJsExt(src);

        if (jsSrc !== src) {
          $(ele).attr("src", jsSrc);
        }
      }
    });

    await fatalWrite(outputPath, $.html());

    onChange(outputPath);
  };

  watch(path, { disableGlobbing: true })
    .on("change", () => checkFile().catch(console.trace))
    .on("unlink", onUnlink);

  return checkFile().catch(console.trace);
}
