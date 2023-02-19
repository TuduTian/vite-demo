
## vite剖析


### 说明
> vite 采用的是浏览器的es模块进行加载，在开发时加载速度很快



### 准备
1. express 服务器 用来处理浏览器的请求
2. path 和 fs 内置模块
3. vue编译库 compiler-sfc 的使用
### 处理 '/' 路径 
1. 通过fs读取到index.html 返回就可以了
2. 记住html中的script的type为module
3. 如果设置了module浏览器会自动的进行重新发送请求进行加载当前这个路径

### 处理js文件
1. 判断是否为.js 结尾  一个方法 ''.endsWith() // 如果是末尾就返回true 不然返回falsae
2. 通过fs进行加载 并且设置相应类型响应出去
3. 在响应出去钱要对里面的字符串进行重写，替换 import {ref} from 'vue' 类的路径 因为vue不能被浏览器正常解析
4. vite源码替换的是/@modules/xxx **路径重写的这个方法是发送文件都会使用的，最好是封一下**


### 处理 第三方模块 也就是 import {ref} from 'vue'  | import React from 'react' 的情况
1. 分割url 因为此时的url在重写的时候已经假如了/@modules 这个前缀了，因为只要判断是否是这个前缀就可以了
2. 我们要拿到node_modules中xx库的pack.json文件 中的module字段，它保存着esmodules的入口文件
3. 然后通过require的方式读取 pack.json中的module字段
4. fs读取文件并且**重写**后返回4

### 处理sfc 单文件组件
1. 下载包  npm i compiler-sfc -S
2. 引入
3. 通过 它模块中的parse方法进行解析，这个方法会把 模版以及js代码都返回过来
4. 我们先处理 js 
```js
 if (url.indexOf(".vue") > -1) {
    //说明引入的是一个 .vue结束的文件 url是一个 /xxx.vue 的格式 我们要把他转换为 xxx.vue
    const p = path.resolve(__dirname, url.split('?')[0].slice(1)) //改vue文件的绝对路径
    //加载并且使用  compilerSFC.parse 解析 这个 vue文件
    /* 
    descriptor 是一个对象，里面有编译好的模版以及js代码
    */
    const { descriptor } = compilerSFC.parse(fs.readFileSync(p, 'utf-8'));
    if (!query.type) {
      res.format({
        "application/javascript": () => {
          res.send(pathReWirte(
            descriptor.script
              ?
              `${descriptor.script.content.replace('export default', "const __script =")}
          import {render as ___render} from '${url}?type=cc'
          __script.render = ___render
          export default __script`
              : null))
        }
      })
    } else {
      // 写render 函数  然后进行返回
      const template = descriptor.template
      const render = compilerDOM.compile(template.content, { mode: 'module' })
      res.format({
        "application/javascript": function () {
          res.send(pathReWirte(render.code))
        }
      })
    }
  }
```
5. 上面代码可以发现我们处理好js后会在下面拼接一个query参数为type的请求 去请求render函数
6. 在else的逻辑中处理 带有type参数的情况，我们吧render函数返回出去 就可以了

### 处理css文件‘
1. 返回一个js字符串
2. 大概逻辑就是自定义一个style标签，把读取到的文件通过标签.innterHTML的方式进行加入
3. 最后到处这个 css 字符串就可以了


**注意**
1. 环境 因为vue需要使用node_evn来判断环境，所以我们会在相应html模版的时候多加入一个script标签将环境变量挂在上去