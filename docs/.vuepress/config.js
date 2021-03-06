module.exports = {
  title: 'Vite技术揭秘',
  description: 'Vite及其生态的源码阅读与解析',
  themeConfig: {
    sidebar: {
      '/guide/': [
        {
          collapsable: false,
          sidebarDepth: 4,
          children: [
            '',
            'prepare',
            'preBuild',
            'pluginContainer',
            {
              title: '中间件机制',
              path: 'middlewares',
              collapsable: true,
              children: ['middlewares', 'htmlMiddleware'],
            },
            'transformMiddleware'
          ],
        },
      ],
    },
    logo: '/logo.png',
    nav: [{ text: 'Home', link: '/' }],
    repo: 'https://github.com/raintygao/awesome-vite-design',
    smoothScroll: true,
    activeHeaderLinks: true,
  },
  configureWebpack: {
    resolve: {
      alias: {
        '@alias': 'docs/.vuepress/public/',
      },
    },
  },
  head: [
    ['meta', { name: 'keywords', content: 'Vite 技术揭秘, 前端 构建工具,Vue.js,源码解析,源码分析,打包工具' }],
    ['meta', { property: 'og:title', content: 'Vite 技术揭秘' }],
    ['meta', { property: 'og:description', content: '构建工具Vite及其生态的源码阅读与解析' }],
  ],
  plugins: ['@vuepress/medium-zoom', '@vuepress/plugin-back-to-top'],
};
