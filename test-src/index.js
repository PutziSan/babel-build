import { h, render } from "preact";
import { TestComponent } from "./TestComponent.js";

import(`./test-dynamic-import.js`).then(({ hi }) => console.log(hi));

// must provided here, cause babel will normally check for `React.createElement`
render(
  <div id="foo">
    <span>Hello, world!!</span>
    <button onClick={e => alert("hi!")}>Click Me!</button>
    <TestComponent />
  </div>,
  document.body
);
