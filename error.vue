<template>
    <NuxtLayout name="default">
      <main class="container-fluid pb-container mt-main grid gap-container grid-cols-1 ">
        <section class="bg-secondary card style-card grid gap-card-sm container">
          
            <div :title="error?.statusCode.toString()" class="error-code text-accent ">{{ error?.statusCode }}</div>

            <h1 class="error-message" style="word-break: break-word">{{ error?.message }}</h1>

            <InputBtn class="w-full" @click="navigateTo('/')">
                Go Home
            </InputBtn>
        </section>
      </main>
    </NuxtLayout>    
</template>
  
<script setup lang="ts">
import type { NuxtError } from '#app'
    
const props = defineProps({
  error: Object as () => NuxtError
})
</script>
  
<style scoped>
  .container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  
  .error-code {
    text-align: center;
    font-family: 'Ubuntu Mono', monospace;
    font-size: min(35vw, 200px) ;
    animation: glitch 1s linear infinite;
  }

  .error-message {
    text-align: center;
    font-size: min(10vw, 80px);
    margin-bottom: 50px;
  }

/* https://codepen.io/pgalor/pen/OeRWJQ */

@keyframes glitch{
  2%,64%{
    transform: translate(2px,0) skew(0deg);
  }
  4%,60%{
    transform: translate(-2px,0) skew(0deg);
  }
  62%{
    transform: translate(0,0) skew(5deg); 
  }
}

div:before,
div:after{
  content: attr(title);
  position: absolute;
  left: 0;
}

div:before{
  animation: glitchTop 1s linear infinite;
  clip-path: polygon(0 0, 100% 0, 100% 33%, 0 33%);
  -webkit-clip-path: polygon(0 0, 100% 0, 100% 33%, 0 33%);
}

@keyframes glitchTop{
  2%,64%{
    transform: translate(2px,-2px);
  }
  4%,60%{
    transform: translate(-2px,2px);
  }
  62%{
    transform: translate(13px,-1px) skew(-13deg); 
  }
}

div:after{
  animation: glitchBotom 1.5s linear infinite;
  clip-path: polygon(0 67%, 100% 67%, 100% 100%, 0 100%);
  -webkit-clip-path: polygon(0 67%, 100% 67%, 100% 100%, 0 100%);
}

@keyframes glitchBotom{
  2%,64%{
    transform: translate(-2px,0);
  }
  4%,60%{
    transform: translate(-2px,0);
  }
  62%{
    transform: translate(-22px,5px) skew(21deg); 
  }
}
</style>