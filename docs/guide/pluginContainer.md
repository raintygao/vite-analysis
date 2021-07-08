# 插件容器

>关于如何插件介绍和如何使用插件，可先看官方文档[使用插件](https://cn.vitejs.dev/guide/using-plugins.html)和[插件 API](https://cn.vitejs.dev/guide/api-plugin.html)，以及[rollup的插件机制](https://rollupjs.org/guide/en/#plugin-development)

Vite的插件容器基于rollup的插件接口，并额外支持一些Vite独有的配置项。Vite在开发阶段基于自己的工作流，构建阶段基于rollup，因此只需要编写一个 Vite 插件，就可以同时为开发环境和生产环境工作。

## pluginContainer

```ts
const container = await createPluginContainer()
const resolved = await container.resolveId()
```
在Vite中，主要通过`pluginContainer`调用插件能力，通过createPluginContainer创建`pluginContainer`，再通过`pluginContainer`的API调用各个插件的能力。在服务初始化和预构建时这些需要借用插件能力的场景都会创建`pluginContainer`。

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