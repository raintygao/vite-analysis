# HTML中间件
`indexHtmlMiddleware`中间件匹配html请求，返回转义处理后的html

```ts
export function indexHtmlMiddleware(
  server: ViteDevServer
): Connect.NextHandleFunction {
  return async function viteIndexHtmlMiddleware(req, res, next) {
    const url = req.url && cleanUrl(req.url)
    if (url?.endsWith('.html') && req.headers['sec-fetch-dest'] !== 'script') {
      const filename = getHtmlFilename(url, server)
      if (fs.existsSync(filename)) {
        try {
          let html = fs.readFileSync(filename, 'utf-8')
          html = await server.transformIndexHtml(url, html, req.originalUrl)
          return send(req, res, html, 'html')
        } catch (e) {
          return next(e)
        }
      }
    }
    next()
  }
}
```


```ts
export async function traverseHtml(
  html: string,
  filePath: string,
  visitor: NodeTransform
): Promise<void> {
  const { parse, transform } = await import('@vue/compiler-dom')
  // @vue/compiler-core doesn't like lowercase doctypes
  html = html.replace(/<!doctype\s/i, '<!DOCTYPE ')
  const ast = parse(html, { comments: true })
  transform(ast, {
    nodeTransforms: [visitor]
  })
}
```
`traverseHtml`中，引用`'@vue/compiler-dom'`的`parse`解析html ast，ast例如下图所示。`visitor`函数中定义了ast节点的转换规则，`transform`最终会应用这些规则
![html-ast](../.vuepress/public/html-ast.png)

```ts
const devHtmlHook: IndexHtmlTransformHook = async (
  html,
  { path: htmlPath, server, originalUrl }
) => {
  const config = server?.config!
  const base = config.base || '/'
  const s = new MagicString(html)
  let scriptModuleIndex = -1
  await traverseHtml(html, htmlPath, (node) => {
    if (node.type !== NodeTypes.ELEMENT) {
      return
    }
    // script tags
    if (node.tag === 'script') {
      const { src, isModule } = getScriptInfo(node)
      if (isModule) {
        scriptModuleIndex++
      }
      if (src) {
        processNodeUrl(src, s, config, htmlPath, originalUrl)
      } else if (isModule) {
        s.overwrite(
          node.loc.start.offset,
          node.loc.end.offset,
          `<script type="module" src="${
            config.base + htmlPath.slice(1)
          }?html-proxy&index=${scriptModuleIndex}.js"></script>`
        )
      }
    }
  })
  html = s.toString()
  return {
    html,
    tags: [
      {
        tag: 'script',
        attrs: {
          type: 'module',
          src: path.posix.join(base, CLIENT_PUBLIC_PATH)
        },
        injectTo: 'head-prepend'
      }
    ]
  }
}
```
`devHtmlHook`里使用了[magic-string]()，通过`overwrite(start,end,content)`这样简易的方法操作ast，start和end为ast某个部分起始结尾坐标，content为要替换的字符串内容。从根结点开始，逐层级遍历。对于非引用别的模块的esmodule script标签，修改其内容为代理模块，比如`<script type="module">import log from './src/b.ts';log();</script>`会被修改为`<script type="module" src="/index.html?html-proxy&index=1.js">`这个代理模块，最后返回了`head-prepend`这个tag用`injectToHead`插入html。

```ts
function injectToHead(
  html: string,
  tags: HtmlTagDescriptor[],
  prepend = false
) {
  const tagsHtml = serializeTags(tags)
  if (prepend) {
    // inject after head or doctype
    for (const re of headPrependInjectRE) {
      if (re.test(html)) {
        return html.replace(re, `$&\n${tagsHtml}`)
      }
    }
  } else {
    // inject before head close
    if (headInjectRE.test(html)) {
      return html.replace(headInjectRE, `${tagsHtml}\n$&`)
    }
  }
  // if no <head> tag is present, just prepend
  return tagsHtml + `\n` + html
}
```
`injectToHead`中通过正则匹配，将`<script type="module" src="/@vite/client"></script>`插入到了head的最前面，这个脚本很重要，包含了热更新等功能.
我们也可以开发自定义插件，定义[transformIndexHtml](https://cn.vitejs.dev/guide/api-plugin.html#transformindexhtml)来处理html内容
