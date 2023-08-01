<template>
  <div class="flex items-center gap-2 group" @click="gotoSubscription()">
    <div class="text-heading hover:text-white">
      <article
        class="flex items-center gap-0.5 bg-tertiary px-3 py-0.5 rounded-full"
      >
        <HeartIcon
          class="flex-shrink-0 text-accent block w-4 h-4 group-hover:animate-pulse group-hover:scale-105"
        />{{ hearts }}
        <PlusIcon class="flex-shrink-0 text-headiacang block w-3.5 h-3.5" />
      </article>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { PlusIcon, HeartIcon } from "@heroicons/vue/24/solid";

export default defineComponent({
  props: {
    sm: { type: Boolean, default: false },
  },
  components: { PlusIcon, HeartIcon },
  setup() {
    const loading = ref(true);
    const hearts = useHearts();

    function gotoSubscription() {
      const router = useRouter();
      router.push("/subscription");
    }

    onMounted(async () => {
      loading.value = false;
    });

    return { loading, hearts, gotoSubscription };
  },
});
</script>

<style scoped></style>
