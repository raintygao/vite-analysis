# 插件容器

>关于插件介绍和如何使用插件，可先看官方文档[使用插件](https://cn.vitejs.dev/guide/using-plugins.html)和[插件 API](https://cn.vitejs.dev/guide/api-plugin.html)


Vite的插件容器由[wmr plugin-container](https://github.com/preactjs/wmr/blob/main/packages/wmr/src/lib/rollup-plugin-container.js)重构而来，并基于rollup的插件接口额外支持一些Vite独有的配置项。Vite在开发阶段基于自己的工作流，构建阶段基于rollup，因此只需要编写一个 Vite 插件，就可以同时为开发环境和生产环境工作。


```ts
const container = await createPluginContainer()
const resolved = await container.resolveId()
```

在Vite中，主要通过`pluginContainer`调用插件能力，通过createPluginContainer创建`pluginContainer`，再通过`pluginContainer`的API调用各个插件的能力。在服务初始化和预构建时这些需要借用插件能力的场景都会创建`pluginContainer`。

## pluginContainer

```ts
export interface PluginContainer {
  options: InputOptions
  buildStart(options: InputOptions): Promise<void>
  watchChange(id: string, event?: ChangeEvent): void
  resolveId(
    id: string,
    importer?: string,
    skip?: Set<Plugin>,
    ssr?: boolean
  ): Promise<PartialResolvedId | null>
  transform(
    code: string,
    id: string,
    inMap?: SourceDescription['map'],
    ssr?: boolean
  ): Promise<SourceDescription | null>
  load(id: string, ssr?: boolean): Promise<LoadResult | null>
  close(): Promise<void>
}
```

我们先看一下`pluginContainer`的类型，主要提供了resolveId、transform、load、buildStart、watchChange、close这几个方法，其中前面三个方法都是[rollup插件自带的hook](https://rollupjs.org/guide/en/#plugin-development)。

### resolveId

rollup插件提供了resolveId Hook，在每个传入模块请求时被调用，它定义了一个自定义的解析器，通常接受`source`和`importer`两个参数，`source`一般为import表达式所引用的内容，`importer`为导入模块的完全解析id，在入口模块为undefined，通过此可以来定义入口的代理模块，具体请见[rollup resolveId Hook](https://rollupjs.org/guide/en/#resolveid)。

在`pluginContainer`中，`resolveId`主要的逻辑是依次调用每个插件的`resolveId hook`，细节逻辑通常集中在这些自定义插件中，比如[Vite自定义的resolve插件](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/resolve.ts)。
通常会根据请求模块的路径和import表达式的路径解析出模块的实际路径，比如在`/Users/admin/Desktop/vite-react-ts/index.html`通过`/src/main.tsx`引用这个模块，那么将解析为`/Users/admin/Desktop/vite-react-ts/src/main.tsx`

### load

rollup插件提供了load Hook，在每个传入模块请求时被调用，用来读取模块的内容，返回null将会传递给其它load，具体请见[rollup load Hook](https://rollupjs.org/guide/en/#load)。

在`pluginContainer`中，`load`主要的逻辑是依次调用每个插件的`load hook`，

### transform

rollup插件提供了transform Hook，在每个传入模块请求时被调用，用来转换模块内容，具体请见[rollupg transform Hook](https://rollupjs.org/guide/en/#transform)。

在`pluginContainer`中，`transform`主要的逻辑是依次调用每个插件的`transform hook`，返回转换后的结果。例如在dev阶段，`tsx`、`ts`等文件会通过`transform`转换为浏览器兼容的内容返回。


### context

除了提供plugin hook的统一调用能力，还提供了`PluginContext`，其提供了一些自定义插件可能需要用到的能力比如`addWatchFile`、`getModuleInfo`、`watchFiles`，用官方注释来解释就是`we should create a new context for each async hook pipeline so that the active plugin in that pipeline can be tracked in a concurrency-safe manner`，丰富了插件的能力。

```ts
class Context implements PluginContext {
  meta = minimalContext.meta
  ssr = false
  _activePlugin: Plugin | null
  _activeId: string | null = null
  _activeCode: string | null = null
  _resolveSkips?: Set<Plugin>

  constructor(initialPlugin?: Plugin) {
    this._activePlugin = initialPlugin || null
  }

  parse(code: string, opts: any = {}) {
    return parser.parse(code, {
      sourceType: 'module',
      ecmaVersion: 2020,
      locations: true,
      ...opts
    })
  }

  async resolve(
    id: string,
    importer?: string,
    options?: { skipSelf?: boolean }
  ) {
    let skips: Set<Plugin> | undefined
    if (options?.skipSelf && this._activePlugin) {
      skips = new Set(this._resolveSkips)
      skips.add(this._activePlugin)
    }
    let out = await container.resolveId(id, importer, skips, this.ssr)
    if (typeof out === 'string') out = { id: out }
    return out as ResolvedId | null
  }

  getModuleInfo(id: string) {
    let mod = MODULES.get(id)
    if (mod) return mod.info
    mod = {
      /** @type {import('rollup').ModuleInfo} */
      // @ts-ignore-next
      info: {}
    }
    MODULES.set(id, mod)
    return mod.info
  }

  getModuleIds() {
    return MODULES.keys()
  }

  addWatchFile(id: string) {
    watchFiles.add(id)
    if (watcher) ensureWatchedFile(watcher, id, root)
  }

  getWatchFiles() {
    return [...watchFiles]
  }

  emitFile(assetOrFile: EmittedFile) {
    warnIncompatibleMethod(`emitFile`, this._activePlugin!.name)
    return ''
  }

  setAssetSource() {
    warnIncompatibleMethod(`setAssetSource`, this._activePlugin!.name)
  }

  getFileName() {
    warnIncompatibleMethod(`getFileName`, this._activePlugin!.name)
    return ''
  }

  warn(
    e: string | RollupError,
    position?: number | { column: number; line: number }
  ) {
    const err = formatError(e, position, this)
    const msg = buildErrorMessage(
      err,
      [chalk.yellow(`warning: ${err.message}`)],
      false
    )
    logger.warn(msg, {
      clear: true,
      timestamp: true
    })
  }

  error(
    e: string | RollupError,
    position?: number | { column: number; line: number }
  ): never {
  }
}
```

```ts
//load
const ctx = new Context()
for (const plugin of plugins) {
  if (!plugin.load) continue
  ctx._activePlugin = plugin
  const result = await plugin.load.call(ctx as any, id, ssr)
}
```

在最终调用时，会通过call把这个context传入到插件内，这样在自定义插件内即可通过`this.addWatchFile`这样的方式使用context能力。

## 总结

插件容器集成了rollup这套插件接口，构造了集成额外功能的`context`上下文，丰富了插件能力，以中台的角色对外输出插件整体调用的能力，使这套插件运行的工作流更加强大有序。

不过值得注意的是，Vite自带了很多自定义插件，在用到`pluginContainer`提供的API的场景下，**更为具体的逻辑还是集中在了这些插件本身的逻辑中**，这块在用到的时候会具体分析。
 
插件容器主要是对提供rollup接口的插件进行了封装，此外Vite还提供了一些独有的插件hook，比如`configResolved`、`transformIndexHtml`，这些hook会在相应的执行时机单独调用。