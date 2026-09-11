<template>
  <NuxtLayout name="default">
    <main class="mt-main container-fluid grid grid-cols-1 gap-container pb-container">
      <section class="container card grid bg-secondary gap-card-sm style-card">
        <div :title="error?.statusCode.toString()" class="error-code text-accent">
          {{ error?.statusCode }}
        </div>

        <h1 class="error-message" style="word-break: break-word">{{ t(messageKey) }}</h1>

        <InputBtn class="w-full" @click="navigateTo('/')">{{ t("Links.BackToHome") }}</InputBtn>
      </section>
    </main>
  </NuxtLayout>
  <!-- The error entry replaces app.vue, so it owns the same single footer. -->
  <LazyClientOnly><Footer /></LazyClientOnly>
</template>

<script setup lang="ts">
import type { NuxtError } from "#app";
import { useI18n } from "vue-i18n";

const props = defineProps({
  error: Object as () => NuxtError,
});

const { t } = useI18n();

/*
  The message Nuxt puts on the error is written by the framework and is always
  English, which is the wrong language inside a German interface. The status
  code is shown above it, so the sentence only has to say what happened.
*/
const messageKey = computed(() =>
  props.error?.statusCode == 404 ? "Body.PageNotFound" : "Body.UnexpectedError"
);
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
  font-family: "Ubuntu Mono", monospace;
  font-size: min(35vw, 200px);
  animation: glitch 1s linear infinite;
}

.error-message {
  text-align: center;
  font-size: min(10vw, 80px);
  margin-bottom: 50px;
}

/* https://codepen.io/pgalor/pen/OeRWJQ */

@keyframes glitch {
  2%,
  64% {
    transform: translate(2px, 0) skew(0deg);
  }
  4%,
  60% {
    transform: translate(-2px, 0) skew(0deg);
  }
  62% {
    transform: translate(0, 0) skew(5deg);
  }
}

div:before,
div:after {
  content: attr(title);
  position: absolute;
  left: 0;
}

div:before {
  animation: glitchTop 1s linear infinite;
  clip-path: polygon(0 0, 100% 0, 100% 33%, 0 33%);
  -webkit-clip-path: polygon(0 0, 100% 0, 100% 33%, 0 33%);
}

@keyframes glitchTop {
  2%,
  64% {
    transform: translate(2px, -2px);
  }
  4%,
  60% {
    transform: translate(-2px, 2px);
  }
  62% {
    transform: translate(13px, -1px) skew(-13deg);
  }
}

div:after {
  animation: glitchBotom 1.5s linear infinite;
  clip-path: polygon(0 67%, 100% 67%, 100% 100%, 0 100%);
  -webkit-clip-path: polygon(0 67%, 100% 67%, 100% 100%, 0 100%);
}

@keyframes glitchBotom {
  2%,
  64% {
    transform: translate(-2px, 0);
  }
  4%,
  60% {
    transform: translate(-2px, 0);
  }
  62% {
    transform: translate(-22px, 5px) skew(21deg);
  }
}
</style>
