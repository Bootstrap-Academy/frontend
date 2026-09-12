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
    const links = computed(() => {
      return authorized.value
        ? [
            {
              label: "CharacterDashboard.Nav",
              pathname: "/dashboard",
            },
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
