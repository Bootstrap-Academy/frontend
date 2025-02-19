<template>
  <article class="progress-card rounded bg-primary">
    <!-- skill -->
    <article class="flex items-center flex-wrap py-3 px-4 bg-primary rounded gap-3 md:gap-5">
      <img
          :src="image"
          class="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded order-1"
          :alt="t('AltAttributes.SkillCover')"
      />

      <div class="grow order-3 md:order-2 w-full md:w-min">
        <h6 class="text-body-1 break-words capitalize">
          {{ name }}
        </h6>
      </div>

      <div
          class="flex items-center justify-between md:justify-between-0 gap-x-3 md:gap-x-5 order-2 md:order-3 grow md:grow-0">

        <div class="flex gap-2">
          <Icon
              @click="onclickViewSkillPath"
              class="cursor-pointer"
              rounded
              sm
              :icon="EyeIcon"
          />
          <Icon
              @click="onclickViewSkillProgressDetails"
              class="cursor-pointer"
              :class="show ? 'rotate-180' : 'rotate-0'"
              rounded
              sm
              :icon="ChevronDownIcon"
          />
        </div>
      </div>

    </article>
    <ProfileOverviewSkillsTable
        v-if="show"
        :data="skills"
        :rootSkillId="id"
    />
  </article>
</template>

<script lang="ts">
import {useI18n} from "vue-i18n";

import {defineComponent} from "vue";
import type {PropType} from "vue";
import {EyeIcon, ChevronDownIcon} from "@heroicons/vue/24/outline";

export default defineComponent({
  components: {
    EyeIcon,
    ChevronDownIcon,
  },
  props: {
    data: {type: Object as PropType<any>, default: null}
  },
  setup(props) {
    const {t} = useI18n();

    const id = computed(() => {
      return props.data?.skill ?? "";
    });

    const name = computed(() => {
      return (props.data?.skill ?? "").replace(/_/g, " ");
    });

    const image = computed(() => {
      return props.data?.image ?? `/svgs/${id.value}.svg`;
    });

    const router = useRouter();

    const route = useRoute();

    const show = computed({
      get(): boolean {
        let rootSkillID = route?.query?.details ?? "";
        return rootSkillID == id.value;
      },
      set(rootSkillID: any) {
        if (!rootSkillID) {
          router.replace({
            path: route.path,
          });
        } else {
          router.replace({
            path: route.path,
            query: {details: rootSkillID},
          });
        }
      },
    });

    function onclickViewSkillPath() {
      router.push(`/skill-tree/${id.value}`);
    }

    function onclickViewSkillProgressDetails() {
      show.value = show.value ? "" : id.value;
    }

    const skills = computed((): any[] => {
      return props.data?.skills ?? [];
    });

    return {
      image,
      name,
      t,
      onclickViewSkillPath,
      onclickViewSkillProgressDetails,
      skills,
      show,
      EyeIcon,
      ChevronDownIcon,
      id,
    };
  },
});
</script>
