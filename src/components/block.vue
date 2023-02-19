
<template>
  <div>
    测试
    <span class="demo">{{ count }}</span>
    <button @click="count++">点我+1</button>
  </div>
</template>

<script >
import { ref } from 'vue'
export default {
  setup(){
    const count = ref(0)
    return {
      count
    }
  }
}

</script>

