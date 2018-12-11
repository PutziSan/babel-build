import Preact from "../node_modules/preact/dist/preact.mjs";
import { h as createElement, render } from "../node_modules/preact/dist/preact.mjs";
import { TestComponent } from "./TestComponent.js";
import(`./test-dynamic-import`).then(({
  hi
}) => console.log(hi));
import("../node_modules/preact/dist/preact.dev.js").then(() => console.log('oha'));