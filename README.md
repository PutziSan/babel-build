

## todos

- als eigenständiges CMD-line-tool auslagern

### for production:

allgemein

- minify via terser (es6-minifier)
- add `<script type="module" src="...">` in richtiger reihenfolge
    - dazu muss tree erstellt werden (zusammenhängende js-imports)
- umschreiben der pfade zu kurzen hash-namen (siehe auch `react-like-frameworks-without-bundling/scripts/minify.js` in web-components-overview)
- create external sourcemaps (das passiert schon automatisch via babel) + append
- tree-shaking

(p)react-specific:

- server-render routes to static files (gemeinsam mit routing-logik)

### idee prozessierung allgemein

1. nur prozessieren was nötig ist, indem nicht alle imports sofort weitergegeben wird, sondern
1. vielleicht caching von node_module-dependency-map (mit version)

### Idee für tree-shaking

Idee gesamt (bei production-bundle)
es gibt 2 Durchläufe:
1. read-only, der alle imports sammelt und maps erstellt
1. transform


1. bei 1. babel-durchlauf erstelle für jede Datei die genutzten imports (specifier or all)
1. dann mit 2. babel-durchlauf: entferne unused exports
1. danach plugin minification was alles löschen sollte was unused ist

### dev:

- hot-reloading + own dev-server (toooo big right now)

allgemein auslagern: js/babelplugin, htmlplugin, dev-server, build

name: "webprovide"

