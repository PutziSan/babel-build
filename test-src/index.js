import { h, render } from "preact";
import { TestComponent } from "./TestComponent.js";
import { add } from 'lodash-es';
import('./test-dynamic-import.js').then(({ hi }) => console.log(hi));

// must provided here, cause babel will normally check for `React.createElement`
render(
  <div id="foo">
    <span>Hello world!!! {add(1,4)}</span>
    <button onClick={e => alert("hi!")}>Click Me!</button>
    <TestComponent />
  </div>,
  document.body
);

export const getHi = () => 'hi!';

