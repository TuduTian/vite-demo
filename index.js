const express = require('express')
const fs = require('fs')
const path = require('path')
const app = express()
const compilerSFC = require('@vue/compiler-sfc')
const compilerDOM = require('@vue/compiler-dom')

app.use((req, res) => {
  const { url, query } = req
  if (url == '/') {
    //访问的是主页面 读取出来给她
    let content = fs.readFileSync('./index.html', "utf-8")

    //假如环境变量 因为她需要环境变量
    content = content.replace("<script",
      `
        <script>
        window.process ={env:{NODE_ENV:'dev'}}
        </script>
        <script
      `
    )
    res.format({
      "text/html": function () {
        res.send(content) // 把 index.html 发送出去
      }
    })// 吧读取到的内容发送出去
  } else if (url.endsWith('.js')) {
    // 如果是以 .js 结尾的 那么就自己拼接一下 然后返回给他
    const p = path.resolve(__dirname, url.slice(1))
    const content = fs.readFileSync(p, "utf-8")
    res.format({
      "application/javascript": function () {
        res.send(pathReWirte(content))
      }
    })
  }

  //解决 node_modules 中的模块引入
  else if (url.startsWith('/@modules')) {
    //说明是模块，我们要加载 模块中的 esm 的入口
    const prefix = path.resolve(__dirname, 'node_modules', url.replace('/@modules/', ''))
    const module = require(prefix + '/package.json').module //拿到模块的es模块入口
    const content = fs.readFileSync(prefix + '/' + module, 'utf-8')

    res.format({
      "application/javascript": function () {
        res.send(pathReWirte(content))
      }
    })
  }

  // 解决 单文件组件的支持  sfc 
  else if (url.indexOf(".vue") > -1) {
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
  else if (url.endsWith('.css')) {
    const p = path.resolve(__dirname, url.slice(1))
    const file = fs.readFileSync(p, 'utf-8')

    const content = `
      const css = "${file.replace(/\n/g, '')}"  
      let link =document.createElement('style')
      link.setAttribute('type','text/css')
      document.head.appendChild(link)
      link.innerHTML =css
      export default link
    `
    res.format({
      "application/javascript": () => {
        res.send(content)
      }
    })
  }


  // 重写 node_modules的路径
  function pathReWirte(content = "") {
    // 把 vue 改写成 /@modules/vue <===  import { createApp, h } from "vue"
    return content.replace(/ from ['|"]([^'"]+)['|"]/g, (s1, s2) => {
      /* 
      from './src/utils.js' ./src/utils.js
      from "vue"  vue
      */
      if (!s2.startsWith('.') && !s2.startsWith('/')) {
        //说明是模块
        return ` from "/@modules/${s2}"`
      } else {
        return s1
      }
    })
  }
})

app.listen(3000, () => {
  console.log('vite start at 3000 ...')
})