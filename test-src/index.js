import Preact from "preact";
import { h as createElement, render } from "preact";
import { TestComponent } from "./TestComponent.js";

import(`./test-dynamic-import`).then(({ hi }) => console.log(hi));

import('preact/dist/preact.dev.js').then(() => console.log('oha'));
