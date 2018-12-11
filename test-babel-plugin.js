const bluebird = require("bluebird");
const dynamicImportSyntaxPlugin = require("@babel/plugin-syntax-dynamic-import")
  .default;

const transformFile = bluebird.promisify(require("@babel/core").transformFile);
const readFile = bluebird.promisify(require("fs").readFile);
const writeFile = bluebird.promisify(require("fs").writeFile);

const path = require("path");

const { createPlugin, ModuleType } = require("./dist/new-babel-plugin-ts.js");

const pkg = require('./package');

async function doIt() {

  const modules = Promise.all(pkg.dependencies.map(async dep => {
    const file = await readFile()
  }));

}

Promise.all()

transformFile(path.join(__dirname, "test-src", "index.js"), {
  babelrc: false,
  configFile: false,
  plugins: [
    dynamicImportSyntaxPlugin,
    createPlugin({
      newImportPath: importedPath => `./node_modules/${importedPath}`,
      onNewImport: console.log,
      isNodeModule:
    })
  ]
})
  .then(({ code }) => writeFile('test-output.js', code));
