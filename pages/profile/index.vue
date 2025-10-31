<!--
❌ Responsive UI
✅ Page Title
✅ Translation
❌ Animation
✅ middleware

✅ Tested on chrome
✅ Tested on firefox
✅ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

✅ Handle loading if data already exists
✅ Handle loading if data is empty
✅ Display data
✅ Handle empty state
-->

<template>
  <main
    class="mt-main container-fluid grid grid-cols-1 gap-container pb-container midXl:grid-cols-[275px_minmax(0,1fr)] xl:grid-cols-[350px_minmax(0,1fr)]"
  >
    <UserProfile
      :data="user"
      class="midXl:sticky midXl:row-span-4 midXl:self-start midXl:top-container"
    />

    <UserSkillTreeOverview />

    <!-- <UserQuizzes /> -->
  </main>
</template>

<script lang="ts">
definePageMeta({
  middleware: ["auth"],
});

export default {
  head: {
    title: "My Profile",
  },
  setup() {
    const user = useUser();

    return { user };
  },
};
</script>

<style scoped></style>
