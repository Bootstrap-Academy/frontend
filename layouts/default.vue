<template>
  <div class="relative">
    <Language />
    <Navbar :links="links" :authorized="authorized" />
    <slot />
    <LazyClientOnly>
      <!-- <Download /> -->
      <Footer />
    </LazyClientOnly>
  </div>
</template>

<script>
export default {
  setup() {
    const authorized = computed(() => {
      const accessToken = useAccessToken();
      return !!accessToken.value;
    });
    const links = computed(() => {
      return authorized.value
        ? [
          {
            label: "Links.Calendar",
            pathname: "/calendar",
          },
          {
            label: "Links.SkillTree",
            pathname: "/skill-tree",
          },
          {
            label: "Links.Jobs",
            pathname: "/jobs",
          },
          {
            label: "Links.Challenges",
            pathname: "/challenges/all",
          },
        ]
        : [
          {
            label: "Links.Home",
            pathname: "/",
          },
          {
            label: "Links.SkillTree",
            pathname: "/skill-tree",
          },
          {
            label: "Links.Contact",
            pathname: "/contact",
          },
          // {
          // 	label: 'Links.Challenges',
          // 	pathname: '/challenges',
          // },
        ];
    });

    return { links, authorized };
  },
};
</script>

<style scoped></style>
