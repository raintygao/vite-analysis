# 预优化

Vite2采用了[esbuild](https://esbuild.github.io/api/)来进行run server前的预优化，esbuild由`go`进行编写，经测试速度比是其它构建工具快10-100倍，现在前端工程化领域的生态非常丰富多彩，比如使用`rust`开发的[swc](https://swc.rs/)等等...

## 重写listen
Vite重写了httpserver的bind函数，因此会先进行预优化再监听端口
```javascript
// packages/vite/src/node/server/index.ts
const listen = httpServer.listen.bind(httpServer)
httpServer.listen = (async (port: number, ...args: any[]) => {
  try {
    await container.buildStart({}) //
    await runOptimize()
  } catch (e) {
    httpServer.emit('error', e)
    return
  }
  return listen(port, ...args)
}) as any
```

`container`是贯穿整个流程的插件系统，`buildstart`会触发所有插件的`buildStart hook`，关于[插件系统](./pluginContainer.md)我们后面再研究，先看`runOptimize`
```javascript
const runOptimize = async () => {
  if (config.cacheDir) {
    server._isRunningOptimizer = true
    try {
      server._optimizeDepsMetadata = await optimizeDeps(config)
    } finally {
      server._isRunningOptimizer = false
    }
    server._registerMissingImport = createMissingImporterRegisterFn(server)
  }
}
```

在`runOptimize`里，会检测是否有`cacheDir`，默认的路径为`project/node_modules/.vite`，接下来分为两步，就是优化的核心流程`optimizeDeps`和`createMissingImporterRegisterFn`

## 优化

```typescript
;({ deps, missing } = await scanImports(config))
```


### hash compare

### scanImports

`scanImports`会检索入口的模块引用，检索会优先检索可配置的`optimizeDeps.entries`和`build.rollupOptions?.input`以及项目代码里的html文件，默认情况下这个入口就是`index.html`，接着

---

未完待续

```
 deps {
  react: '/Users/admin/Desktop/vite-react-ts/node_modules/react/index.js',
  'react-dom': '/Users/admin/Desktop/vite-react-ts/node_modules/react-dom/index.js'
} 
 missing {}
```