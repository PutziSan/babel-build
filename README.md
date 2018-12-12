

## todos

- als eigenständiges CMD-line-tool auslagern

### for production:

allgemein

- minify via terser (es6-minifier)
- add `<script type="module" src="...">` in richtiger reihenfolge
    - dazu muss tree erstellt werden (zusammenhängende js-imports)
- umschreiben der pfade zu kurzen hash-namen (siehe auch `react-like-frameworks-without-bundling/scripts/minify.js` in web-components-overview)
- create external sourcemaps (das passiert schon automatisch via babel) + append

(p)react-specific:

- server-render routes to static files (gemeinsam mit routing-logik)

### dev:

- hot-reloading + own dev-server (toooo big right now)

allgemein auslagern: js/babelplugin, htmlplugin, dev-server, build

name: "webprovide"