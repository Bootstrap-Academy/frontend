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
    class="container-fluid pb-container mt-main grid gap-container grid-cols-1 midXl:grid-cols-[275px_minmax(0,1fr)] xl:grid-cols-[350px_minmax(0,1fr)]"
  >
    <UserProfile
      :data="user"
      class="midXl:row-span-4 midXl:sticky midXl:top-container midXl:self-start"
    />

    <UserProgress />

    <UserCourses />

    <UserChallenges />

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
