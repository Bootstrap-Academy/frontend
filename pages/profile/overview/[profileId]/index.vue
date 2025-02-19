<template>
  <template v-if="!exists">
    <ProfileOverviewEmptyState />
  </template>
  <main
      v-else
      class="container-fluid pb-container mt-main grid gap-container grid-cols-1 midXl:grid-cols-[275px_minmax(0,1fr)] xl:grid-cols-[350px_minmax(0,1fr)]"
  >
    <div class="mb-main midXl:row-span-4 midXl:sticky midXl:top-container midXl:self-start ">
      <section
          class="card style-card bg-secondary">
        <img
            :src="image"
            :alt="t('AltAttributes.UserAvatar')"
            class="w-32 h-32 rounded-full bg-tertiary mx-auto mb-box shadow-xl shadow-primary"
        />
        <h2 class="text-heading-2 text-center clamp line-1">{{ name }}</h2>

        <p class="text-body-1 text-heading text-justify mb-card mt-box">
          {{ description }}
        </p>

        <IconText :icon="registration.icon">{{ registration.text }}</IconText>

        <article
            class="flex gap-x-3 gap-y-3.5 flex-wrap mt-card"
            v-if="tags && tags.length"
        >
          <Chip v-for="tag of tags" :key="tag">{{ tag }}</Chip>
        </article>
      </section>

      <ProfileOverviewShare
          v-if="profileUrl"
          class="mt-4"
          :copyShareSettings="copyShareSettings"
          :isMobile="isMobile"
          :heading="shareHeading"
          :body="shareBody"
      />
    </div>

    <!-- Share Profile-->

    <section
        v-for="{ heading, body, skills } of skillsProgress"
        :key="heading"
        class="card style-card bg-secondary grid gap-card-sm"
    >
      <SectionTitle sub :heading="heading" :body="body" class="mb-0"/>

      <template v-if="skills && skills.length > 0">
        <ProfileOverviewSkills
            v-for="(skill, i) of skills"
            :key="`${heading}-${i}`"
            :data="skill"
        />
      </template>
    </section>
  </main>
</template>


<script lang="ts">
import {useI18n} from "vue-i18n";
import {defineComponent, onMounted} from 'vue'
import {getPublicProfileOverview, usePublicProfileOverview} from "~/composables/publicProfile";
import {CalendarIcon} from "@heroicons/vue/24/outline";

export default defineComponent({
  head: {title: "Overview"},
  components: {CalendarIcon},
  setup() {
    const {t} = useI18n();

    const route = useRoute();
    const publicProfileOverview: any = usePublicProfileOverview();

    const profileId = computed(() => {
      return <string>(route.params?.profileId ?? "")
    });

    const isMobile = computed(() => {
      return !!navigator.share;
    });

    const profileUrl = computed(() => {
      return window.location.href
    });
    const exists = computed(() =>(!!publicProfileOverview.value?.id))
    const name = computed(() => publicProfileOverview.value?.name ?? "")
    const registration = computed(() => {
      let timestamp = publicProfileOverview.value?.user?.registration ?? null;

      let {month, year} = convertTimestampToDate(timestamp);

      return {
        icon: CalendarIcon,
        text: !!timestamp ? `${t(month.string)}, ${year}` : "",
      };
    });
    const _skills = computed(() => publicProfileOverview.value?.total_skills ?? 0)
    const skills = computed(() => publicProfileOverview.value?.root_skills ?? [])
    const image = computed(() => publicProfileOverview.value?.user?.avatar_url ?? "")
    const tags = computed(() => publicProfileOverview.value?.user?.tags ?? [])
    const description = computed(() => publicProfileOverview.value?.user?.description ?? "")

    const shareHeading = computed(() => "Headings.PublicProfileShare")
    const shareBody = computed(() => isMobile.value ? 'Body.PublicProfileShareUrl' : 'Body.PublicProfileCopyUrl')
    const copyShareSettings = computed(() => {
      const settings = {url: profileUrl?.value ?? ""};
      if (isMobile.value) {
        return {
          ...settings,
          title: `${publicProfileOverview.value} - Overview`,
          text: `${name.value} has picked up ${_skills.value} skills. Check out the profile for more!`
        }
      }
      return {
        ...settings,
        successMsg: "Success.PublicProfileUrlCopied"
      }
    })

    onMounted(async () => {
      if (!profileId.value) {
        return;
      }
      setLoading(true)
      await getPublicProfileOverview(profileId.value);
      setLoading(false)
    });

    const skillsProgress = computed(() => {
      return [
        {
          heading: 'Headings.ActiveSkills',
          body: t('Body.ProfileOverviewSkills', {name: name.value}),
          skills: skills.value,
        },
      ];
    });

    return {
      registration,
      name,
      _skills,
      skills,
      image,
      tags,
      description,
      copyShareSettings,
      profileUrl,
      isMobile,
      skillsProgress,
      shareHeading,
      shareBody,
      t,
      exists
    }
  }
})
</script>

<style scoped>

</style>