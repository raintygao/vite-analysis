# 简介


Vite是新一代构建工具，开发环境基于bundless这一基础，并兼容了生产环境，关于Vite的最大特点以及和其他打包工具的最大区别，可以用[Vite官网](https://cn.vitejs.dev/guide/why.html#slow-server-start)的两张图片概括。


![bundle based server](../.vuepress/public/bundler.png)
![esm based server](../.vuepress/public/esm.png)

<br>

* 笔者认为，除了完美利用浏览器原生支持esm这一特性去贯彻bundless概念，Vite自带了预编译、热替换、支持ssr，以及兼容了Rollup去建设一套完整的生态系统，这些都是让人耳目一新的；从源码中解读发现开发者对社区各种npm包都达到了极致，非常值得去学习。
* 在此也推荐云谦大佬写的简易版vite[toy-vite](https://github.com/sorrycc/toy-vite)，可以借此了解Vite的核心功能。
* 此外，这是笔者第一次去写对外的解读分享，如果有错误或者探讨欢迎提issue或pr。预计每五天左右可以更新一篇，没写大概率是工作没时间或者看完了不知道怎么去叙述出来=_=

