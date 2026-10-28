<template>
  <div class="relative">
    <Language />
    <Navbar :links="links" :authorized="authorized" />
    <slot />
  </div>
</template>

<script>
export default {
  setup() {
    const authorized = computed(() => {
      const accessToken = useAccessToken();
      return !!accessToken.value;
    });
    // The learning journey shows once skills-ms has answered that it offers learning paths.
    const pathsAvailable = useLearningPathsAvailable();
    const journey = (label) =>
      pathsAvailable?.value === true ? [{ label, pathname: "/path" }] : [];
    const links = computed(() => {
      return authorized.value
        ? [
            {
              label: "CharacterDashboard.Nav",
              pathname: "/dashboard",
            },
            ...journey("LearningPlan.Nav"),
            {
              label: "Links.SkillTree",
              pathname: "/skill-tree",
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
              label: "Headings.Courses",
              pathname: "/courses",
            },
            {
              label: "Links.SkillTree",
              pathname: "/skill-tree",
            },
            ...journey("LearningPlan.NavGuest"),
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
