import * as bluebird from "bluebird";
import * as browserSync from "browser-sync";
import { extname, join } from "path";
import { SrcEvents } from "./customTypes";
import { handleHtml } from "./handle-html";
import { handleJs } from "./handle-js";
import { loadPackageInfos } from "./load-package-infos";
import { outPath, rootPath } from "./paths";
import { mkdirP, newPromiseQueue } from "./utils";

const rimraf = bluebird.promisify<void, string>(require("rimraf"));

async function start() {
  const bs = browserSync.create();

  await rimraf(outPath);
  await mkdirP(outPath);

  const packageInfos = await loadPackageInfos();

  const done: { [key: string]: boolean } = {};

  // wenn alle imports initial durchlaufen wurden, ist der server bereit zu starten
  const [onReady, addToQueue] = newPromiseQueue();
  let isReady = false;

  onReady(() => {
    isReady = true;
    bs.init({ server: outPath });
    console.timeEnd("start");
  });

  function handleUnlink(path: string) {
    // wenn file gelöscht und später wieder hinzugefügt wird mit gleichem Namen, muss es erneut prozessiert werden
    done[path] = false;
  }

  function handleChange(outputPath: string) {
    if (isReady) {
      bs.reload(outputPath);
    }
  }

  const srcHandler: SrcEvents = {
    onNewSrc: handleNewFile,
    onUnlink: handleUnlink,
    onChange: handleChange
  };

  function handleNewFile(path: string) {
    if (done[path]) {
      return;
    }

    done[path] = true;

    const ext = extname(path);

    switch (ext) {
      case ".mjs":
      case ".js":
        addToQueue(
          handleJs(packageInfos, path, srcHandler).catch(error => {
            console.trace(error);
            process.exit(1);
          })
        );
        break;
      case ".html":
        addToQueue(
          handleHtml(path, srcHandler).catch(error => {
            console.trace(error);
            process.exit(1);
          })
        );
        break;
    }
  }

  handleNewFile(join(rootPath, "index.html"));
}

console.time("start");

start().catch(console.trace);
