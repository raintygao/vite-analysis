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

在Vite里一般以如下方式定义和使用中间件
```ts
import { Connect } from 'types/connect'
export function customMiddleware(config: any): Connect.NextHandleFunction {
  const data = doSome(config);
  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
  return function finalCustomMiddleware(req, res, next) {
    console.log('req',data);
    next()
    console.log('res',data);
  }
}
//use
middlewares.use(customMiddleware(config));
```
在server初始化的时候传入config,customMiddleware直接根据初始化的数据执行，保存了data数据，返回一个实际函数作为请求时的中间件，在`next`前处理request,在`next`后处理response，有点类似koa的洋葱模型。
