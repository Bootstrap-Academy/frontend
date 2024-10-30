<template>
  <main class="relative h-screen-main min grid place-items-center">
    <SkillTreeHeader @zoomLevel="zoomLevel = $event" :breadcrumbs="breadcrumbs" :quizzesQuickStart="true" />

    <LoadingDots v-if="loading">
      {{ t("Body.RootSkillTreeLoading") }}
    </LoadingDots>

    <section v-else-if="nodes && nodes.length"
      class="map w-screen h-fit m-auto max-w-[100vw] h-screen-main max overflow-auto" ref="mainRef">
      <svg :width="mapWidth" :height="mapHeight" :viewBox="mapViewBox">
        <g v-if="setupComplete">
          <SkillTreePathway v-for="(pathway, p) of pathways" :key="p" :pathway="pathway.path" :zoomLevel="zoomLevel"
            @click="scrollViaPathway(pathway.node, pathway.parent)" />
        </g>

        <template v-for="(row, i) in map" :key="i">
          <SkillTreeNode v-for="(column, j) in row" :key="`${i}${j}`" :row="i" :column="j"
            @ref="insertRefInMap($event, i, j)" :node="getNode(i, j)" :zoomLevel="zoomLevel" @size="nodeSize = $event"
            @click="scrollToNode(i, j, true)" view-subtree :completed="getNode(i, j) && getNode(i, j).id == 'start'" :xp="xp" />
        </template>
      </svg>
    </section>

    <h1 v-else>No Data</h1>
  </main>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import { PlusCircleIcon, ArrowUpTrayIcon } from "@heroicons/vue/24/solid";
import type { Ref } from "vue";

export default {
  head: {
    title: "Root Skill Tree",
  },
  components: { PlusCircleIcon, ArrowUpTrayIcon },
  setup() {
    const breadcrumbs = computed(() => {
      return [
        {
          label: "Headings.RootSkillTree",
        },
      ];
    });
    const { t } = useI18n();
    const user = useUser();
    const xp = useXP();

    // ! ======================================================= Set Up
    function onclickUploadCertificates() {
      openDialog(
        "info",
        "Headings.UploadCertificates",
        `${t("Body.UploadCertificates")} hallo@bootstrap.academy`,
        false,
        {
          label: "Buttons.Okay",
          onclick: () => { },
        },
        null
      );
    }

    const setupComplete = ref(false);
    const loading = ref(true);

    const cookie_nextNode = useCookie<{ row: number; column: number }>(
      "rootTree_nextNode"
    );
    const nextNode = computed({
      get() {
        return cookie_nextNode.value || { row: 10, column: 10 };
      },
      set(data: { row: number; column: number }) {
        cookie_nextNode.value = data;
      },
    });

    const rootSkillTree: Ref<any> = useRootSkillTree();

    const nodes: any[] = reactive([]);
    const nodeSize = ref(0);

    onMounted(async () => {
      const [success, error] = await getRootSkillTree();

      await getXP();

      if (!!error || !!!success) {
        loading.value = false;
        return;
      }

      Object.assign(nodes, [...rootSkillTree.value.skills]);
      resetMap();
      loading.value = false;
    });

    // ! ======================================================= Nodes
    function getNode(row: number, column: number) {
      return nodes.find((n) => n.row == row && n.column == column);
    }

    function scrollToNode(row: number, column: number, smooth: boolean) {
      nextNode.value = { row: row, column: column };

      scrollMapToNode(
        map,
        mainRef.value,
        nodeSize.value,
        zoomLevel.value,
        row,
        column,
        smooth
      );
    }

    // ! ======================================================= Pathways
    const pathways: any[] = reactive([]);

    function createPathways() {
      let newPathways = createPathwaysForTree(map, nodes, nodeSize.value);

      while (pathways.length > 0) {
        pathways.pop();
      }

      Object.assign(pathways, [...newPathways]);
    }

    function scrollViaPathway(_node: any, parent: any) {
      let node = nodes.find((n) => n.id == _node);
      if (!!!node) return;

      let parentNode = nodes.find((n) => n.id == parent);
      if (!!!parentNode) return;

      let previous = { row: parentNode.row, column: parentNode.column };

      if (
        nextNode.value.row == node.row &&
        nextNode.value.column == node.column
      ) {
        nextNode.value = { ...previous };
      } else if (!!previous) {
        nextNode.value = { row: node.row, column: node.column };
      }

      scrollToNode(nextNode.value.row, nextNode.value.column, true);
    }

    // ! ======================================================= Rows & Columns
    const totalRows = computed({
      get() {
        return rootSkillTree?.value?.rows ?? 5;
      },
      set(data: number) {
        rootSkillTree.value.rows = data;
      },
    });
    const totalColumns = computed({
      get() {
        return rootSkillTree?.value?.columns ?? 5;
      },
      set(data: number) {
        rootSkillTree.value.columns = data;
      },
    });

    // ! ======================================================= Map
    const mapWidth = computed(() => {
      return nodeSize.value * totalRows.value;
    });
    const mapHeight = computed(() => {
      return nodeSize.value * totalColumns.value;
    });
    const mapViewBox = computed(() => {
      return `0 0 ${mapWidth.value} ${mapHeight.value}`;
    });
    const mainRef = ref<HTMLDivElement | null>(null);

    const getInitialMap = () => {
      return new Array(totalRows.value)
        .fill(null)
        .map(() => new Array(totalColumns.value).fill(null));
    };
    const map: any[] = reactive([]);

    function insertRefInMap(ref: any, row: number, column: number) {
      map[row].splice(column, 1, ref);
    }

    function resetMap() {
      while (map.length > 0) {
        map.pop();
      }

      Object.assign(map, getInitialMap());
    }

    // ! ======================================================= Controls
    const zoomLevel = ref(-1);
    const showMap = ref(false);

    watch(
      () => zoomLevel.value,
      (newValue, oldValue) => {
        if (newValue != oldValue) {
          setupComplete.value = false;
          nextTick(() => {
            createPathways();
            let row = nextNode.value.row;
            let column = nextNode.value.column;
            scrollToNode(row, column, false);
            setupComplete.value = true;
          });
        }
      }
    );

    watch(
      () => map,
      (newValue, oldValue) => {
        if (!!newValue && !!newValue[0] && !!newValue[0][0]) {
          nextTick(() => {
            createPathways();

            let row = nextNode.value.row;
            let column = nextNode.value.column;

            scrollToNode(row, column, false);
            setupComplete.value = true;
          });
        }
      },
      { immediate: true, deep: true }
    );

    return {
      user,
      setupComplete,
      loading,

      nodeSize,
      nodes,
      getNode,
      scrollToNode,

      map,
      mapWidth,
      mapHeight,
      mapViewBox,
      mainRef,
      insertRefInMap,

      totalRows,
      totalColumns,

      pathways,
      scrollViaPathway,

      zoomLevel,
      showMap,
      t,
      onclickUploadCertificates,
      ArrowUpTrayIcon,
      breadcrumbs,
      
      xp,
    };
  },
};
</script>

<style scoped>
/* width */
.map::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

/* hides the horizontal scrollbar with tablet and handy to avoid white pixels*/
@media (pointer: coarse) {
  .map::-webkit-scrollbar {
    height: 0;
  }
}

/* Track */
.map::-webkit-scrollbar-track {
  background: var(--color-tertiary);
}

/* Handle */
.map::-webkit-scrollbar-thumb {
  background: var(--color-accent);
}

/* Handle on hover */
.map::-webkit-scrollbar-thumb:hover {
  background: var(--color-accent);
}
</style>
