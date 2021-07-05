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
//define
import { Connect } from 'types/connect'
export function customMiddleware(config: any): Connect.NextHandleFunction {
  const data = doSomething(config);
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
在server初始化的时候传入config,customMiddleware函数根据初始化的config执行，返回一个新函数作为请求时的中间件，通过闭包可以获得初始化的data。当浏览器请求发送过来，在`next`前处理request,在`next`后处理response，类似koa的洋葱模型。

在Vite中默认使用很多内置中间件，例如[htmlMiddleware](./htmlMiddleware.md)、[transMiddleware](./transformMiddleware.md)等
