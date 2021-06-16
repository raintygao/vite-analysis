module.exports = {
  title: 'Vite技术揭秘',
  description: 'Vite及其生态的源码阅读与解析',
  themeConfig: {
    sidebar: {
      '/guide/': [
        {
          collapsable: false,
          children: [
            '',
            'prepare',
            'preBuild',
            'resolved',
            'pluginContainer',
            'esModuleLexer'
          ],
        }
      ]
    },
    logo: '/logo.png',
    nav: [
      { text: 'Home', link: '/' }
    ],
    repo: 'https://github.com/raintygao/awesome-vite-design',
    smoothScroll: true,
    activeHeaderLinks: true
  },
  configureWebpack: {
    resolve: {
      alias: {
        '@alias': 'docs/.vuepress/public/'
      }
    }
  },
  plugins:['@vuepress/medium-zoom','@vuepress/plugin-back-to-top']
};
