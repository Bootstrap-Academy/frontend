<template>
  <div id="page h-full w-full">
    <div id="container">
      <div
        id="ring"
        :class="[
          {
            'h-36 w-36': lg && !xxl && !xl && !l && !sm,
            'h-44 w-44': xxl,
            'h-40 w-40': xl,
            'h-32 w-32': l,
            'h-28 w-28': sm,
          },
        ]"
      ></div>
      <div
        id="ring"
        :class="[
          {
            'h-36 w-36': lg && !xxl && !xl && !l && !sm,
            'h-44 w-44': xxl,
            'h-40 w-40': xl,
            'h-32 w-32': l,
            'h-28 w-28': sm,
          },
        ]"
      ></div>
      <div
        id="ring"
        :class="[
          {
            'h-36 w-36': lg && !xxl && !xl && !l && !sm,
            'h-44 w-44': xxl,
            'h-40 w-40': xl,
            'h-32 w-32': l,
            'h-28 w-28': sm,
          },
        ]"
      ></div>
      <div
        id="ring"
        :class="[
          {
            'h-36 w-36': lg && !xxl && !xl && !l && !sm,
            'h-44 w-44': xxl,
            'h-40 w-40': xl,
            'h-32 w-32': l,
            'h-28 w-28': sm,
          },
        ]"
      ></div>
      <div
        :class="[
          textSize ? `${textSize}` : 'text-xs',
          textColor ? `${textColor}` : '',
        ]"
        id="h3 "
      >
        {{ text }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    text: { type: String, default: "Default" },
    textSize: { type: String, default: "text-2xl" },
    textColor: { type: String, default: "text-white" },
    xxl: { type: String, default: false },
    xl: { type: String, default: false },
    lg: { type: String, default: true },
    l: { type: String, default: false },
    sm: { type: String, default: false },
  },
  setup() {},
};
</script>

<style scoped>
#page {
  display: flex;
  justify-content: center;
  align-items: center;
}

#container {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

#h3 {
  color: rgb(82, 79, 79);
}

#ring {
  border: 1px solid transparent;
  border-radius: 50%;
  position: absolute;
}

#ring:nth-child(1) {
  border-bottom: 8px solid rgb(240, 42, 230);
  animation: rotate1 2s linear infinite;
}

@keyframes rotate1 {
  from {
    transform: rotateX(50deg) rotateZ(110deg);
  }

  to {
    transform: rotateX(50deg) rotateZ(470deg);
  }
}

#ring:nth-child(2) {
  border-bottom: 8px solid rgb(240, 19, 67);
  animation: rotate2 2s linear infinite;
}

@keyframes rotate2 {
  from {
    transform: rotateX(20deg) rotateY(50deg) rotateZ(20deg);
  }

  to {
    transform: rotateX(20deg) rotateY(50deg) rotateZ(380deg);
  }
}

#ring:nth-child(3) {
  border-bottom: 8px solid rgb(3, 170, 170);
  animation: rotate3 2s linear infinite;
}

@keyframes rotate3 {
  from {
    transform: rotateX(40deg) rotateY(130deg) rotateZ(450deg);
  }

  to {
    transform: rotateX(40deg) rotateY(130deg) rotateZ(90deg);
  }
}

#ring:nth-child(4) {
  border-bottom: 8px solid rgb(207, 135, 1);
  animation: rotate4 2s linear infinite;
}

@keyframes rotate4 {
  from {
    transform: rotateX(70deg) rotateZ(270deg);
  }

  to {
    transform: rotateX(70deg) rotateZ(630deg);
  }
}
/* Improving visualization in light mode */
</style>
