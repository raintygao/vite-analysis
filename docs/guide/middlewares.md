# 中间件机制

Vite2以原生`http server`的方式启动服务，结合[connect](https://www.npmjs.com/package/connect)以plugins方式注册中间件，在服务启动前依次注册各中间件。

```ts
//resolveHttpServer
export async function resolveHttpServer(
  { proxy }: ServerOptions,
  app: Connect.Server,
  httpsOptions?: HttpsServerOpticons
): Promise<HttpServer> {
  //...
  return require('http').createServer(app)
  //...
}

// packages/vite/src/node/server/index.ts
const middlewares = connect() as Connect.Server
const httpServer = middlewareMode ? null: await resolveHttpServer(serverConfig, middlewares, httpsOptions)
middlewares.use(fn)
```

在Vite里一般以如下方式使用


