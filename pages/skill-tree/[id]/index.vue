<template>
  <main class="relative h-screen-main grid place-items-center">
    <Head>
      <Title>Sub Skill Tree - {{ subTreeName }}</Title>
    </Head>

    <SkillTreeHeader
      @zoomLevel="zoomLevel = $event"
      :breadcrumbs="breadcrumbs"
    />

    <LoadingDots v-if="loading">
      {{ t("Body.SubSkillTreeLoading", { placeholder: subTreeName }) }}
    </LoadingDots>

    <section
      v-else-if="nodes && nodes.length"
      class="map w-screen h-fit m-auto max-w-[100vw] h-screen-main overflow-auto"
      ref="mainRef"
    >
      <svg :width="mapWidth" :height="mapHeight" :viewBox="mapViewBox">
        <g v-if="setupComplete && selectedNode.id == ''">
          <SkillTreePathway
            v-for="(pathway, p) of pathways"
            :key="p"
            :pathway="pathway.path"
            :zoomLevel="zoomLevel"
            @click="scrollViaPathway(pathway.node, pathway.parent)"
          />
        </g>

        <template v-for="(row, i) in map" :key="i">
          <template v-for="(column, j) in row" :key="`${i}${j}`">
            <SkillTreeNode
              class="relative z-30"
              v-if="
                selectedNode.id == '' ||
                (selectedNode.row == i && selectedNode.column == j)
              "
              :row="i"
              :column="j"
              @ref="insertRefInMap($event, i, j)"
              :node="getNode(i, j)"
              :zoomLevel="zoomLevel"
              @size="nodeSize = $event"
              @click="scrollToNode(i, j, true)"
              @move="setSelectedNode($event)"
              :active="selectedNode.row == i && selectedNode.column == j"
              :completed="getNode(i, j)?.completed ?? false"
              :xp="xp"
            />
          </template>
        </template>
      </svg>
    </section>

    <article
      v-else
      class="w-full h-full flex flex-col gap-container justify-center items-center"
    >
      <SvgSkillTree class="max-w-sm" />
      <SectionTitle
        center
        heading="EmptyStates.SkillTree.Heading"
        body="EmptyStates.SkillTree.Body"
      />
    </article>
  </main>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import type { Ref } from "vue";

export default {
  head: {
    title: "Sub Skill Tree",
  },
  setup() {
    const subTreeId = computed(() => {
      return <string>(route.params?.id ?? "");
    });

    const subTreeName = computed(() => {
      return subTreeId.value.replace(/_/g, " ");
    });

    const breadcrumbs = computed(() => {
      return [
        {
          label: "Headings.RootSkillTree",
          to: "/skill-tree",
        },
        {
          label: subTreeName.value,
        },
      ];
    });

    const { t } = useI18n();

    // ! ======================================================= Set Up
    const setupComplete = ref(false);
    const loading = ref(true);

    const cookie_nextNode = useCookie<{ row: number; column: number }>(
      "subTree_nextNode"
    );
    const nextNode = computed({
      get() {
        return cookie_nextNode.value || { row: 10, column: 10 };
      },
      set(data: { row: number; column: number }) {
        cookie_nextNode.value = data;
      },
    });

    const subSkillTree: Ref<any> = useSubSkillTree();
    const nodes: any[] = reactive([]);

    // ! ======================================================= Node
    const getInitialNode = () => {
      return {
        id: "",
        name: "",
        dependencies: [],
        courses: [],
        row: null,
        column: null,
        icon: "",
      };
    };

    const nodeSize = ref(0);

    let selectedNode = reactive(getInitialNode());
    const router = useRouter();
    const route = useRoute();

    function setSelectedNode(node: any) {
      if (node.id == "") {
        Object.assign(selectedNode, { ...node });
      } else {
        let n = nodes.find((_n) => _n.id == node.id);
        Object.assign(selectedNode, { ...n });

        if (!!!getAccessToken()) {
          openDialog(
            "warning",
            "Headings.NotLoggedIn",
            "Body.NotLoggedIn",
            false,
            {
              label: "Buttons.Okay",
              onclick: () => {
                router.push(
                  `/auth/login?redirect=${route.path}/${selectedNode.id}`
                );
              },
            },
            {
              label: "Buttons.Cancel",
              onclick: () => {
                Object.assign(selectedNode, {
                  id: "",
                  name: "",
                  dependencies: [],
                  row: null,
                  column: null,
                  icon: "",
                });
              },
            }
          );
        } else if (selectedNode && selectedNode.id) {
          router.push(`${route.path}/${selectedNode.id}`);
        }
      }
    }

    watch(
      () => selectedNode,
      (newValue, oldValue) => {
        if (newValue.id == "" && oldValue.id != "") {
          setupComplete.value = false;
        }

        nextTick(() => {
          createPathways();

          let row = nextNode.value.row;
          let column = nextNode.value.column;

          scrollToNode(row, column, false);
          setupComplete.value = true;
        });
      },
      { deep: true }
    );

    const xp = useXP();

    onMounted(async () => {
      if (!!!subTreeId.value) {
        loading.value = false;
        return;
      }

      await getXP();
      
      console.log("xp", xp.value);  

      const [success, error] = await getSubSkillTree(subTreeId.value);

      if (!!error) {
        loading.value = false;
        return;
      }

      Object.assign(nodes, [...subSkillTree.value.skills]);

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
        return subSkillTree?.value?.rows ?? 5;
      },
      set(data: number) {
        subSkillTree.value.rows = data;
      },
    });
    const totalColumns = computed({
      get() {
        return subSkillTree?.value?.columns ?? 5;
      },
      set(data: number) {
        subSkillTree.value.columns = data;
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

    watch(
      () => zoomLevel.value,
      (newValue, oldValue) => {
        if (newValue != oldValue) {
          setupComplete.value = false;
        }

        nextTick(() => {
          createPathways();

          let row = nextNode.value.row;
          let column = nextNode.value.column;

          scrollToNode(row, column, false);
          setupComplete.value = true;
        });
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
      setupComplete,
      loading,

      selectedNode,
      setSelectedNode,
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
      t,
      subTreeName,
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
