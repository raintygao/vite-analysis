# 模块转换

![拦截请求](../.vuepress/public/requests.png)

在开发阶段，我们的代码不会被打包成bundle，那么当浏览器请求`ts`、`tsx`、`scss`等模块时如何返回浏览器支持的结果呢？

![response-type](../.vuepress/public/response-type.png)

可以看到，这些模块返回的Content-Type都为application/javascript，他们返回给浏览器作为js文件执行。

```ts
// src/node/server/index.ts  main transform middleware 
middlewares.use(transformMiddleware(server))
```

得益于Vite的[中间件机制](./middlewares.md),在开发阶段中，所有模块请求经过`transformMiddleware`中间件，这个中间件对模块内容进行转换，返回最终浏览器兼容的结果

```ts
// src/node/server/middlewares/transform
export function transformMiddleware(
  server: ViteDevServer
): Connect.NextHandleFunction {
  //...
  const result = await transformRequest(url, server, {
    html: req.headers.accept?.includes('text/html')
  }) //转换
  if (result) {
    const type = isDirectCSSRequest(url) ? 'css' : 'js'
    const isDep =
      DEP_VERSION_RE.test(url) ||
      (cacheDirPrefix && url.startsWith(cacheDirPrefix))
    return send(
      req,
      res,
      result.code,
      type,
      result.etag,
      // allow browser to cache npm deps!
      isDep ? 'max-age=31536000,immutable' : 'no-cache',
      result.map
    )
    //...
}
```

`transformRequest`集中了模块的转换流程，返回包括模块内容的转换结果与是否需要缓存。

```ts
export async function transformRequest(
  url: string,
  { config, pluginContainer, moduleGraph, watcher }: ViteDevServer,
  options: TransformOptions = {}
): Promise<TransformResult | null> {
  // check if we have a fresh cache
  const module = await moduleGraph.getModuleByUrl(url)
  const cached =
    module && (ssr ? module.ssrTransformResult : module.transformResult)
  if (cached) {
    isDebug && debugCache(`[memory] ${prettyUrl}`)
    return cached
  }
  // resolve
  const id = (await pluginContainer.resolveId(url))?.id || url
  const file = cleanUrl(id)

  let code: string | null = null
  let map: SourceDescription['map'] = null

  // load
  const loadStart = isDebug ? Date.now() : 0
  const loadResult = await pluginContainer.load(id, ssr)
  if (loadResult == null) {
    // if this is an html request and there is no load result, skip ahead to
    // SPA fallback.
    if (options.html && !id.endsWith('.html')) {
      return null
    }
    // try fallback loading it from fs as string
    // if the file is a binary, there should be a plugin that already loaded it
    // as string
    // only try the fallback if access is allowed, skip for out of root url
    // like /service-worker.js or /api/users
    if (options.ssr || isFileAccessAllowed(file, config.server.fsServe)) {
      try {
        code = await fs.readFile(file, 'utf-8')
        isDebug && debugLoad(`${timeFrom(loadStart)} [fs] ${prettyUrl}`)
      } catch (e) {
        if (e.code !== 'ENOENT') {
          throw e
        }
      }
    }
    if (code) {
      try {
        map = (
          convertSourceMap.fromSource(code) ||
          convertSourceMap.fromMapFileSource(code, path.dirname(file))
        )?.toObject()
      } catch (e) {
        logger.warn(`Failed to load source map for ${url}.`, {
          timestamp: true
        })
      }
    }
  } else {
    isDebug && debugLoad(`${timeFrom(loadStart)} [plugin] ${prettyUrl}`)
    if (typeof loadResult === 'object') {
      code = loadResult.code
      map = loadResult.map
    } else {
      code = loadResult
    }
  }
  // transform
  const transformStart = isDebug ? Date.now() : 0
  const transformResult = await pluginContainer.transform(code, id, map, ssr)
  if (
    transformResult == null ||
    (typeof transformResult === 'object' && transformResult.code == null)
  ) {
    // no transform applied, keep code as-is
    isDebug &&
      debugTransform(
        timeFrom(transformStart) + chalk.dim(` [skipped] ${prettyUrl}`)
      )
  } else {
    isDebug && debugTransform(`${timeFrom(transformStart)} ${prettyUrl}`)
    code = transformResult.code!
    map = transformResult.map
  }

  if (map && mod.file) {
    map = (typeof map === 'string' ? JSON.parse(map) : map) as SourceMap
    if (map.mappings && !map.sourcesContent) {
      await injectSourcesContent(map, mod.file)
    }
  }
  return (mod.transformResult = {
    code,
    map,
    etag: getEtag(code, { weak: true })
  } as TransformResult)
}
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