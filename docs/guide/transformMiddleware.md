# 模块转换

![拦截请求](../.vuepress/public/requests.png)

在开发阶段，我们的代码不会被打包成bundle，那么当浏览器请求`ts`、`tsx`、`scss`、`json`、`svg`等模块时如何返回浏览器支持的结果呢？

![response-type](../.vuepress/public/response-type.png)

可以看到，这些模块返回的Content-Type都为application/javascript，他们返回给浏览器作为js文件执行。

```ts
// src/node/server/index.ts  main transform middleware 
middlewares.use(transformMiddleware(server))
```

得益于Vite的[中间件机制](./middlewares.md),在开发阶段中，所有模块请求经过`transformMiddleware`中间件，这个中间件对模块内容进行转换，返回最终浏览器兼容的结果

## transformMiddleware中间件

```ts
// src/node/server/middlewares/transform
export function transformMiddleware(
  server: ViteDevServer
): Connect.NextHandleFunction {
  //...
  const result = await transformRequest(url, server, {
    html: req.headers.accept?.includes('text/html')
  })    //代码转换逻辑
  if (result) {
    const type = isDirectCSSRequest(url) ? 'css' : 'js'
    const isDep =
      DEP_VERSION_RE.test(url) ||
      (cacheDirPrefix && url.startsWith(cacheDirPrefix))
    return send(   //send = res.end
      req,
      res,
      result.code,
      type,
      result.etag,
      isDep ? 'max-age=31536000,immutable' : 'no-cache',
      result.map
    )
    //...
}
```

自定义中间件`transformMiddleware`中，主要逻辑集中在`transformRequest`，它定义了模块的转换流程，返回模块内容的转换结果code以及是否需要缓存etag

## transformRequest

```ts
export async function transformRequest(
  url: string,
  { config, pluginContainer, moduleGraph, watcher }: ViteDevServer,
  options: TransformOptions = {}
): Promise<TransformResult | null> {
  // check cache
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
  return (mod.transformResult = {
    code,
    map,
    etag: getEtag(code, { weak: true })
  } as TransformResult)
}
```

transformRequest主要分为四个步骤，分别为`check cache`、`resolve`、`load`、`transform`。

`check cache`用来检查缓存，如果该模块已经被转换过，直接返回缓存结果。

`resolve`通过[pluginContainer的resolveId](./pluginContainer.md#resolveid)解析模块路径

`load`用来加载模块的内容，将`resolve`返回的id传入[pluginContainer的load](./pluginContainer.md#load)，读取模块的内容，一般没有自定义插件返回null的情况下，会接着通过fs直接读取模块内容

### transform

`transform`会转换模块的内容，`ts`、`tsx`、`scss`等文件也是在这一步转换成浏览器可以执行的js文件，这一步调用了[pluginContainer的transform](./pluginContainer.md#transform)，这里主要分析一下转换用到的几个插件。

#### vite:esbuild
TS transform
```ts
//before transform
export interface Ha {
  a:string
}
const a:Ha = {
  a:'2'
};
export {
  a
};
console.log('aaa',a);
//after transform
const a = {
   a: "2"
};
export { a };
console.log("aaa", a);
```
TSX transform
```ts
//before transform 
import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import {a} from './afafa';
import './b.js';
import './a.json';
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)
//after transform
import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import {a} from "./afafa";
import "./b.js";
import "./a.json";
console.log("a", a);
ReactDOM.render(/* @__PURE__ */ React.createElement(React.StrictMode, null, /* @__PURE__ */ React.createElement(App, null)), document.getElementById("root"));
```
上面两个简单的文件转换的例子，我们可以看到，ts文件的interface消失了，tsx中的tsx标签被转换为了`React.createElement`，这些都是符合预期的，通过`vite:esbuild`插件，
它们均被被转换为了ts和tsx均被转换为了js文件。
```ts
const result = await transform(code, {
  loader: "tsx",
  sourcemap: true,
  sourcefile: "/Users/admin/Desktop/vite-react-ts/src/main.tsx",
});
```
`vite:esbuild`会对`tsx`、`jsx`、`ts`模块编译，其中主要是通过esbuild[transform API](https://esbuild.github.io/api/#transform-api)输出转换后的结果。
然而，现在仍然有个问题，代码里引用的`react`、`react-dom`这种bare name，以及`./App`这种相对引用在浏览器里都是无法识别的，因此还需要对这些`import`进行转换。

#### vite:import-analysis
 
在`import-analysis`中，import statement得以转换。WIP
