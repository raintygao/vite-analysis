# transformMiddleware

`transformMiddleware`是代码转换的核心，我们项目里的ts、tsx等文件都通过这个中间价转换为js返回给前端

```ts
  async transform(code, id, inMap, ssr) {
    debugger
    const ctx = new TransformContext(id, code, inMap as SourceMap)
    ctx.ssr = !!ssr
    for (const plugin of plugins) {
      if (!plugin.transform) continue
      ctx._activePlugin = plugin
      ctx._activeId = id
      ctx._activeCode = code
      const start = isDebug ? Date.now() : 0
      let result
      try {
        result = await plugin.transform.call(ctx as any, code, id, ssr)
      } catch (e) {
        ctx.error(e)
      }
      if (!result) continue
      isDebug &&
        debugPluginTransform(
          timeFrom(start),
          plugin.name,
          prettifyUrl(id, root)
        )
      if (typeof result === 'object') {
        code = result.code || ''
        if (result.map) ctx.sourcemapChain.push(result.map)
      } else {
        code = result
      }
    }
    return {
      code,
      map: ctx._getCombinedSourcemap()
    }
  },
```

其中依次调用了所有插件的`transform`方法，对代码内容做转义，这里基于Vite 的 pluginContainer，开发自定义插件也可以定义与rollup兼容的[transform](https://rollupjs.org/guide/en/#transform)方法。
vite:esbuild:`code:'import React from "react";\nimport ReactDOM from "react-dom";\nimport "./index.css";\nimport App from "./App";\nReactDOM.render(/* @__PURE__ */ React.createElement(React.StrictMode, null, /* @__PURE__ */ React.createElement(App, null)), document.getElementById("root"));\n'`
vite:import-analysis:`'import __vite__cjsImport0_react from "/node_modules/.vite/react.js?v=a265756d"; const React = __vite__cjsImport0_react.__esModule ? __vite__cjsImport0_react.default : __vite__cjsImport0_react;\nimport __vite__cjsImport1_reactDom from "/node_modules/.vite/react-dom.js?v=a265756d"; const ReactDOM = __vite__cjsImport1_reactDom.__esModule ? __vite__cjsImport1_reactDom.default : __vite__cjsImport1_reactDom;\nimport "/src/index.css";\nimport App from "/src/App.tsx";\nReactDOM.render(/* @__PURE__ */ React.createElement(React.StrictMode, null, /* @__PURE__ */ React.createElement(App, null)), document.getElementById("root"));\n'`

`'import __vite__cjsImport0_react from "/node_modules/.vite/react.js?v=a265756d"; const React = __vite__cjsImport0_react.__esModule ? __vite__cjsImport0_react.default : __vite__cjsImport0_react;\nimport __vite__cjsImport1_reactDom from "/node_modules/.vite/react-dom.js?v=a265756d"; const ReactDOM = __vite__cjsImport1_reactDom.__esModule ? __vite__cjsImport1_reactDom.default : __vite__cjsImport1_reactDom;\nimport "/src/index.css";\nimport App from "/src/App.tsx";\nimport {a} from "/src/afafa.ts";\nconsole.log("a", a);\nReactDOM.render(/* @__PURE__ */ React.createElement(React.StrictMode, null, /* @__PURE__ */ React.createElement(App, null)), document.getElementById("root"));\n'`
以及vite:define、vite:json等中间件也会执行，他们会发挥各自的职能。

```ts
  class TransformContext extends Context {
    filename: string
    originalCode: string
    originalSourcemap: SourceMap | null = null
    sourcemapChain: NonNullable<SourceDescription['map']>[] = []
    combinedMap: SourceMap | null = null

    constructor(filename: string, code: string, inMap?: SourceMap | string) {
      super()
      this.filename = filename
      this.originalCode = code
      if (inMap) {
        this.sourcemapChain.push(inMap)
      }
    }

    _getCombinedSourcemap(createIfNull = false) {
      let combinedMap = this.combinedMap
      for (let m of this.sourcemapChain) {
        if (typeof m === 'string') m = JSON.parse(m)
        if (!('version' in (m as SourceMap))) {
          // empty, nullified source map
          combinedMap = this.combinedMap = null
          this.sourcemapChain.length = 0
          break
        }
        if (!combinedMap) {
          combinedMap = m as SourceMap
        } else {
          combinedMap = combineSourcemaps(this.filename, [
            {
              ...(m as RawSourceMap),
              sourcesContent: combinedMap.sourcesContent
            },
            combinedMap as RawSourceMap
          ]) as SourceMap
        }
      }
      if (!combinedMap) {
        return createIfNull
          ? new MagicString(this.originalCode).generateMap({
              includeContent: true,
              hires: true,
              source: this.filename
            })
          : null
      }
      if (combinedMap !== this.combinedMap) {
        this.combinedMap = combinedMap
        this.sourcemapChain.length = 0
      }
      return this.combinedMap
    }

    getCombinedSourcemap() {
      return this._getCombinedSourcemap(true) as SourceMap
    }
  }
```