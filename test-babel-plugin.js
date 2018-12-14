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
