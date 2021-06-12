module.exports = {
  title: 'awesome-vite-design',
  description: 'source code analysis of vite and vite ecosystem',
  themeConfig: {
    sidebar: {
      '/guide/': [
        {
          collapsable: false,
          children: [
            '',
            'prepare',
            'progress'
          ],
        }
      ]
    },
    logo: '/logo.png',
    nav: [
      { text: 'Home', link: '/' }
    ],
    repo: 'https://github.com/raintygao',
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
