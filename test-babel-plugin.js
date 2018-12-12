const chokidar = require("chokidar");
const path = require("path");

chokidar.watch(path.join(__dirname, "test-src")).on("all", (event, evPath) => {
  console.log(path.relative(path.join(__dirname, 'test-src'), evPath));

  console.log(event, evPath);
});
