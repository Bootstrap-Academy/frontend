<template>
  <button
    type="submit"
    :class="classes"
    class="min-w-[150px] text-center justify-center"
    @click.prevent="onclick"
  >
    <Transition mode="out-in">
      <svg
        v-if="loading"
        aria-hidden="true"
        class="icon text-tertiary rotating fill-white"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>

      <div
        v-else
        class="flex gap-2 items-center"
        :class="iconRight ? 'flex-row-reverse' : ''"
      >
        <component
          v-if="icon"
          :is="icon"
          :class="[!!iconColor ? `red` : '']"
          class="icon"
        ></component>
        <slot></slot>
      </div>
    </Transition>
  </button>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    mt: { type: Boolean, default: false },
    mb: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    full: { type: Boolean, default: false },
    sm: { type: Boolean, default: false },
    md: { type: Boolean, default: true },
    lg: { type: Boolean, default: false },
    bgColor: { type: String, default: "bg-accent" },
    borderColor: { type: String, default: "border-accent" },
    primary: { type: Boolean, default: true },
    secondary: { type: Boolean, default: false },
    tertiary: { type: Boolean, default: false },
    icon: { type: Object, default: null },
    iconRight: { type: Boolean, default: false },
    iconColor: { type: String, default: "" },
  },
  emits: ["click"],
  setup(props, { emit }) {
    function onclick() {
      emit("click", true);
    }

    const classes = computed(() => {
      return [
        {
          lg: props.lg,
          md: props.md && !props.lg && !props.sm,
          sm: props.sm,
          "flex-row-reverse": props.iconRight,
          "w-full": props.full,
          "mt-2 md:mt-4 xl:mt-6": props.mt,
          "mb-2 md:mb-4 xl:mb-6": props.mb,
        },
        props.primary && !props.secondary && !props.tertiary
          ? `${props.bgColor} text-primary font-semibold hover:${props.bgColor} border ${props.borderColor} hover:ring-8 hover:ring-tertiary`
          : "",
        props.secondary
          ? `bg-transparent text-heading font-medium hover:bg-transparent border ${props.borderColor} hover:ring-8 hover:ring-tertiary`
          : "",
        props.tertiary
          ? `bg-transparent text-heading font-medium hover:bg-transparent hover:scale-105 border border-transparent hover:ring-8 hover:ring-transparent`
          : "",
      ];
    });

    return { classes, onclick };
  },
});
</script>
<style scoped>
.v-enter-active,
.v-leave-active {
  transition: all 0.25s ease-out;
}

.v-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.v-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

button {
  font-family: Arial, Helvetica, sans-serif;
  @apply h-fit rounded flex items-center text-center 
			 uppercase tracking-widest transition-basic;
}

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ SIZE */
.sm {
  @apply text-xs px-3.5 py-2 gap-2;
}
.md {
  @apply text-base px-5 py-3 gap-3;
}
.lg {
  @apply text-base px-6 py-4 gap-4;
}
:is(.sm, .md, .lg).tertiary {
  @apply px-0;
}

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ICON */
.sm .icon {
  @apply w-4 h-4;
}
.md .icon {
  @apply w-6 h-6;
}
.lg .icon {
  @apply w-8 h-8;
}
.primary .icon {
  @apply fill-primary;
}
.secondary .icon {
  @apply fill-white;
}
.tertiary .icon {
  @apply fill-accent;
}
.red.icon {
  @apply text-[#FF0000];
}
@-webkit-keyframes rotating /* Safari and Chrome */ {
  from {
    -webkit-transform: rotate(0deg);
    -o-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  to {
    -webkit-transform: rotate(360deg);
    -o-transform: rotate(360deg);
    transform: rotate(360deg);
  }
}
@keyframes rotating {
  from {
    -ms-transform: rotate(0deg);
    -moz-transform: rotate(0deg);
    -webkit-transform: rotate(0deg);
    -o-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  to {
    -ms-transform: rotate(360deg);
    -moz-transform: rotate(360deg);
    -webkit-transform: rotate(360deg);
    -o-transform: rotate(360deg);
    transform: rotate(360deg);
  }
}
.rotating {
  -webkit-animation: rotating 1s linear infinite;
  -moz-animation: rotating 1s linear infinite;
  -ms-animation: rotating 1s linear infinite;
  -o-animation: rotating 1s linear infinite;
  animation: rotating 1s linear infinite;
}
</style>
