<template>
  <div>
    <body class="relative">
      <main>
        <!-- <img class="bgImg" src="https://media.tacdn.com/media/attractions-splice-spp-674x446/09/c3/33/97.jpg" alt="">     -->
        <article>
          <!--DEMO HTML -->
          <canvas
            class="confetti"
            style="width: 100vw; height: 100vh"
            id="canvas"
          ></canvas>
          <!--End DEMO HTML -->
          <transition name="dontShowAnimationBox">
            <section
              v-if="boxInfo"
              class="absolute bg-white top-[20%] rounded-lg sm:left-[5%] p-5 flex gap-4 items-center mx-3"
            >
              <h6 class="my-4 text-accent font-bold">
                {{ t("Headings.DontShowCongratsAnimationAgain") }}
              </h6>

              <input-switch v-model="hideAnimation" class="mt-2" />
            </section>
          </transition>

          <transition name="infoBox">
            <section
              v-if="boxInfo"
              class="absolute bg-white top-[70%] rounded-lg sm:left-1/2 transform sm:-translate-x-1/2 -translate-y-1/2 p-5 mx-3"
            >
              <h6 class="my-2 text-accent text-lg font-bold">
                {{ t("Headings.CongratsAnimateText") }}
              </h6>
              <div class="flex justify-end w-full">
                <NuxtLink @click="navigateToProfile()">
                  <Btn sm> Go To profile </Btn>
                </NuxtLink>
              </div>
            </section>
          </transition>

          <transition name="closeAnimationBox">
            <section
              v-if="boxInfo"
              class="absolute bg-white cursor-pointer top-[5%] rounded-lg right-[5%] p-4"
              @click="fnHideAnimation()"
            >
              <XMarkIcon class="h-6 w-6" />
            </section>
          </transition>
        </article>
      </main>
    </body>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { XMarkIcon } from "@heroicons/vue/24/outline";
import { useShowConfetti } from "~~/composables/user";
let showConfetti = useShowConfetti();
const hideAnimation: any = useCookie("hideAnimationNextTime");
const boxInfo = ref(false);
const { t } = useI18n();

function fnHideAnimation() {
  showConfetti.value = false;
  boxInfo.value = false;
}

function navigateToProfile() {
  navigateTo("/profile");
  fnHideAnimation();
}

watch(
  () => showConfetti.value,
  (newValue, oldValue) => {
    if (newValue) {
      setTimeout(() => {
        boxInfo.value = true;
      }, 500);
      setTimeout(() => {
        fnHideAnimation();
      }, 10000);
    }
  },
  { immediate: true }
);

watch(
  () => hideAnimation.value,
  () => {
    if (hideAnimation.value) {
      setTimeout(() => {
        fnHideAnimation();
        openSnackbar("success", "Headings.SuccessHideConfettiForever");
      }, 1000);
    }
  }
);

onMounted(() => {
  var canvas: any = document.getElementById("canvas");
  let ctx = canvas?.getContext("2d");
  // canvas.width = window.innerWidth;
  // canvas.height = window.innerHeight;
  let cx = ctx?.canvas.width / 2;
  let cy = ctx?.canvas.height / 2;

  let confetti: any = [];
  const confettiCount = 300;
  const gravity = 0.1;
  const terminalVelocity = 5;
  const drag = 0.075;
  const colors = [
    { front: "red", back: "darkred" },
    { front: "green", back: "darkgreen" },
    { front: "blue", back: "darkblue" },
    { front: "yellow", back: "darkyellow" },
    { front: "orange", back: "darkorange" },
    { front: "pink", back: "darkpink" },
    { front: "purple", back: "darkpurple" },
    { front: "turquoise", back: "darkturquoise" },
  ];

  //-----------Functions--------------
  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cx = ctx.canvas.width / 2;
    cy = ctx.canvas.height / 2;
  };

  const randomRange = (min: any, max: any) => Math.random() * (max - min) + min;

  const initConfetti = () => {
    for (let i = 0; i < confettiCount; i++) {
      confetti.push({
        color: colors[Math.floor(randomRange(0, colors.length))],
        dimensions: {
          x: randomRange(3, 6),
          y: randomRange(6, 12),
        },

        position: {
          x: randomRange(0, canvas?.width),
          y: canvas?.height - 1,
        },

        rotation: randomRange(0, 2 * Math.PI),
        scale: {
          x: 1,
          y: 1,
        },

        velocity: {
          x: randomRange(-25, 25),
          y: randomRange(0, -50),
        },
      });
    }
  };

  //---------Render-----------
  const render = () => {
    ctx?.clearRect(0, 0, canvas?.width, canvas?.height);

    confetti.forEach((confetto: any, index: any) => {
      let width = confetto.dimensions.x * confetto.scale.x;
      let height = confetto.dimensions.y * confetto.scale.y;

      // Move canvas to position and rotate
      ctx?.translate(confetto.position.x, confetto.position.y);
      ctx?.rotate(confetto.rotation);

      // Apply forces to velocity
      confetto.velocity.x -= confetto.velocity.x * drag;
      confetto.velocity.y = Math.min(
        confetto.velocity.y + gravity,
        terminalVelocity
      );
      confetto.velocity.x +=
        Math.random() > 0.5 ? Math.random() : -Math.random();

      // Set position
      confetto.position.x += confetto.velocity.x;
      confetto.position.y += confetto.velocity.y;

      // Delete confetti when out of frame
      if (confetto.position.y >= canvas?.height) confetti.splice(index, 1);

      // Loop confetto x position
      if (confetto.position.x > canvas?.width) confetto.position.x = 0;
      if (confetto.position.x < 0) confetto.position.x = canvas?.width;

      // Spin confetto by scaling y
      confetto.scale.y = Math.cos(confetto.position.y * 0.1);
      ctx.fillStyle =
        confetto.scale.y > 0 ? confetto.color.front : confetto.color.back;

      // Draw confetto
      ctx?.fillRect(-width / 2, -height / 2, width, height);

      // Reset transform matrix
      ctx?.setTransform(1, 0, 0, 1, 0, 0);
    });

    // Fire off another round of confetti
    if (confetti.length <= 10) initConfetti();

    window.requestAnimationFrame(render);
  };

  //---------Execution--------
  initConfetti();
  render();

  //----------Resize----------
  window.addEventListener("resize", function () {
    resizeCanvas();
  });

  //------------Click------------
  window.addEventListener("click", function () {
    initConfetti();
  });
});

//-----------Var Inits--------------
</script>

<style scoped>
.infoBox-enter-from {
  scale: 0;
  opacity: 0;
  top: 0%;
}

.infoBox-enter-to {
  scale: 1;
  opacity: 1;
  top: 70%;
}
.infoBox-enter-active {
  transition: all 2s;
}
.dontShowAnimationBox-enter-from {
  scale: 0;
  opacity: 0;
  left: -100%;
  top: 0%;
}

.dontShowAnimationBox-enter-to {
  scale: 1;
  opacity: 1;
  top: 20%;
  left: 5%;
}
.closeAnimationBox-enter-active {
  transition: all 2s;
}
.closeAnimationBox-enter-from {
  scale: 0;
  opacity: 0;
  right: -100%;
  top: 0%;
}

.closeAnimationBox-enter-to {
  scale: 1;
  opacity: 1;
  top: 5%;
  right: 5%;
}
.dontShowAnimationBox-enter-active {
  transition: all 2s;
}
body {
  font-family: "Roboto", sans-serif;
  font-style: normal;
  font-weight: 300;
  position: fixed;
  z-index: 1000;
  top: 0px;
  /* font-smoothing: antialiased; */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-size: 15px;
  background: transparent;
}
main {
  @apply backdrop-blur-sm;
}
.intro {
  background: #fff;
  padding: 60px 30px;
  color: #333;
  margin-bottom: 15px;
  line-height: 1.5;
  text-align: center;
}
.intro h1 {
  font-size: 18pt;
  padding-bottom: 15px;
}
.intro p {
  font-size: 14px;
}

.action {
  text-align: center;
  display: block;
  margin-top: 20px;
}

a.btn {
  text-decoration: none;
  color: #666;
  border: 2px solid #666;
  padding: 10px 15px;
  display: inline-block;
  margin-left: 5px;
}
a.btn:hover {
  background: #666;
  color: #fff;
  transition: 0.3s;
  -webkit-transition: 0.3s;
}
.btn:before {
  font-family: FontAwesome;
  font-weight: normal;
  margin-right: 10px;
}
.github:before {
  content: "\f09b";
}
.down:before {
  content: "\f019";
}
.back:before {
  content: "\f112";
}
.credit {
  background: #fff;
  padding: 12px;
  font-size: 9pt;
  text-align: center;
  color: #333;
  margin-top: 40px;
}
.credit span:before {
  font-family: FontAwesome;
  color: #e41b17;
  content: "\f004";
}
.credit a {
  color: #333;
  text-decoration: none;
}
.credit a:hover {
  color: #1dbf73;
}
.credit a:hover:after {
  font-family: FontAwesome;
  content: "\f08e";
  font-size: 9pt;
  position: absolute;
  margin: 3px;
}

article li {
  color: #444;
  font-size: 15px;
  margin-left: 33px;
  line-height: 1.5;
  padding: 5px;
}
article h1,
article h2,
article h3,
article h4,
article p {
  padding: 14px;
  color: #333;
}
article p {
  font-size: 15px;
  line-height: 1.5;
}

@media only screen and (min-width: 720px) {
  main {
    width: 100vw;
  }
}

.set-overlayer,
.set-glass,
.set-sticky {
  cursor: pointer;
  height: 45px;
  line-height: 45px;
  padding: 0 15px;
  color: #333;
  font-size: 16px;
}
.set-overlayer:after,
.set-glass:after,
.to-active:after,
.set-sticky:after {
  font-family: FontAwesome;
  font-size: 18pt;
  position: relative;
  float: right;
}
.set-overlayer:after,
.set-glass:after,
.set-sticky:after {
  content: "\f204";
  transition: 0.6s;
}

.to-active:after {
  content: "\f205";
  color: #008080;
  transition: 0.6s;
}
.set-overlayer,
.set-glass,
.set-sticky,
.source,
.theme-tray {
  margin: 10px;
  background: #f2f2f2;
  border-radius: 5px;
  border: 2px solid #f1f1f1;
  box-sizing: border-box;
}
/* Syntax Highlighter*/

pre.prettyprint {
  padding: 15px !important;
  margin: 10px;
  border: 0 !important;
  background: #f2f2f2;
  overflow: auto;
}

.source {
  white-space: pre;
  overflow: auto;
  max-height: 400px;
}
code {
  border: 1px solid #ddd;
  padding: 2px;
  border-radius: 2px;
}
</style>
