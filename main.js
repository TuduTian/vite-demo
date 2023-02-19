
import { add } from './src/utils.js'
import { createApp, h } from "vue"
import block from "./src/components/block.vue"
import "./src/index.css"
/* const App = {
  render() {
    return h('div', null,
      [h('div', 'hello vite ! ')]
    )
  }
} */
createApp(block).mount('#web')