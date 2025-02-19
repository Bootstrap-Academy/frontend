<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300" fill="none">
    <path d="M200 200L260 260" :stroke="'#0cc9ab'" stroke-width="18" stroke-linecap="round"/>

    <circle cx="140" cy="140" r="90" :fill="'#0b192e'"/>
      <circle cx="140" cy="140" r="80" :stroke="'#0cc9ab'" stroke-width="16"/>

      <g transform="translate(70, 70) scale(0.8)">

        <circle cx="80" cy="80" r="65" :fill="'#fff'"/>

          <circle cx="55" cy="60" r="5" :fill="'#0b192e'"/>
            <circle cx="85" cy="60" r="5" :fill="'#0b192e'"/>

              <line x1="50" y1="92" x2="90" y2="92" :stroke="'#0b192e'" stroke-width="4" stroke-linecap="round" :fill="'0b192e'"/>
      </g>

      <circle cx="140" cy="140" r="110" :stroke="'#0cc9ab'" stroke-width="14" opacity="0.2">
        <animate attributeName="r" from="110" to="130" dur="1.5s" begin="0s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.2" to="0" dur="1.5s" begin="0s" repeatCount="indefinite"/>
      </circle>
  </svg>
</template>

<script>
export default {};
</script>

<style scoped></style>