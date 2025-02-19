<template>
  <section class="justify-between">
    <div class="flex flex-wrap gap-box items-start justify-between mb-2">
      <SectionTitle
          sub
          heading="Headings.MyProfileVisibility"
          body="Body.MyProfileVisibility"
          class="!m-0"
      />
    </div>

    <div class="flex sm:mt-4">
      <article class="flex flex-wrap gap-card-sm mt-4 sm:mt-0 sm:flex-nowrap w-full">
        <Btn
            :secondary="!isPublic"
            class="inline-block transition-basic font-heading text-xl py-3 px-4 style-box sm:min-w-[100px] sm:max-w-[175px] w-full justify-center cursor-pointer border-4 border-accent"
            :class="isPublic ? 'bg-accent scale-105 text-black' : 'text-white'"
            @click="onclickUpdateProfileStatus(true)"
        >
          {{ t("Buttons.Public") }}
        </Btn>
        <Btn
            :secondary="isPublic"
            class="inline-block transition-basic font-heading text-xl py-3 px-4 style-box sm:min-w-[100px] sm:max-w-[175px] w-full justify-center cursor-pointer border-4 border-accent"
            :class="!isPublic ? 'bg-accent scale-105 text-black' : 'text-white'"
            @click="onclickUpdateProfileStatus(false)"
        >
          {{ t("Buttons.Private") }}
        </Btn>
      </article>
    </div>
  </section>

  <ProfileOverviewShare
      v-if="isPublic && profileUrl"
      class="mt-4"
      :copyShareSettings="copyShareSettings"
      :isMobile="isMobile"
      :heading="shareHeading"
      :body="shareBody"
  />
</template>

<script lang="ts">
import {defineComponent, onMounted} from 'vue';
import {useI18n} from "vue-i18n";
import {updateProfileStatus} from "~/composables/publicProfile";

export default defineComponent({
  setup() {
    const {t} = useI18n();

    const config = useRuntimeConfig().public;

    const publicProfileInfo: any = usePublicProfileInfo();

    const isMobile = computed(() => {
      return !!navigator.share;
    });

    const isPublic = computed(() => {
      return publicProfileInfo.value?.public;
    });

    const profileId = computed(() => {
      return publicProfileInfo.value?.id;
    });

    const profileName = computed(() => {
      return publicProfileInfo.value?.name ?? "";
    });

    const profileTotalSkills = computed(() => {
      return publicProfileInfo.value?.total_skills;
    });

    const profileUrl = computed(() => {
      return `${config.BASE_WEB_URL}/profile/overview/${publicProfileInfo.value?.id}`;
    });

    const copyShareSettings = computed(() => {
      const settings = {url: profileUrl?.value ?? ""};
      if (isMobile.value) {
        return {
          ...settings,
          title: `${profileName.value} - Overview`,
          text: `${profileName.value} has picked up ${profileTotalSkills.value} skills. Check out the profile for more!`
        }
      }
      return {
        ...settings,
        successMsg: "Success.PublicProfileUrlCopied"
      }
    })

    const shareHeading = computed(() => "Headings.PublicProfileShare")
    const shareBody = computed(() => isMobile.value ? 'Body.PublicProfileShareUrl' : 'Body.PublicProfileCopyUrl')


    onMounted(async () => {
      await getPublicProfileStatus();
    });

    async function onclickUpdateProfileStatus(newProfileStatus: boolean) {
      if (!profileId) {
        return;
      }
      if (isPublic.value === newProfileStatus) {
        return;
      }

      setLoading(true);
      const [success, error] = await updateProfileStatus({
        public: newProfileStatus
      });
      setLoading(false);

      success ? successHandler(`Success.UpdateTo${newProfileStatus ? "Public" : "Private"}ProfileStatus`) : errorHandler(error);
    }

    function successHandler(res: any) {
      openSnackbar('success', res);
    }

    function errorHandler(res: any) {
      openSnackbar('error', res?.detail ?? '');
    }

    return {
      t,
      onclickUpdateProfileStatus,
      isPublic,
      profileId,
      profileUrl,
      isMobile,
      copyShareSettings,
      shareHeading,
      shareBody
    };
  },
});
</script>

<style scoped>
</style>