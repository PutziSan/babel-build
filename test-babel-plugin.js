/*
const dependencyTree = require("dependency-tree");

const path = require("path");

console.log(dependencyTree({
  filename: path.join(__dirname, "test-src", "index.js"),
  directory: path.join(__dirname, "test-src")
}));

console.log(dependencyTree.toList({
  filename: path.join(__dirname, "test-src", "index.js"),
  directory: path.join(__dirname, "test-src")
}));
*/

const https  = require("https");


https.get("https://raw.githubusercontent.com/mui-org/material-ui/master/packages/material-ui/src/index.js", response => {
  response.on('data', data => {
    console.log(data);
  })
});
