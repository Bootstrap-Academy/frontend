<template>
  <div class="lab-workspace">
    <template v-if="scenario === 'reliable-transfer'">
      <p>{{ ui.transferNote }}</p>
      <div class="lab-actions">
        <button
          v-for="index in [2, 0]"
          :key="index"
          type="button"
          :disabled="disabled || model.received.includes(index)"
          @click="send('deliver', index)"
        >
          {{ ui.deliver }} {{ chunks[index] }} ({{ index * 3 }})</button
        ><button
          type="button"
          :disabled="disabled || model.received.includes(1)"
          @click="send('retry')"
        >
          {{ ui.retryTransfer }}</button
        ><button type="button" :disabled="disabled" @click="send('clearTransfer')">
          {{ ui.clearTransfer }}
        </button>
      </div>
      <p>{{ ui.delivered }}: {{ model.received.map((i) => chunks[i]).join(" → ") || "—" }}</p>
      <p aria-live="polite">
        {{ ui.receive }}:
        {{ [0, 1, 2].map((i) => (model.received.includes(i) ? chunks[i] : "___")).join("") }} ·
        {{ model.received.length === 3 ? "ABCDEFGHI" : ui.incomplete }}
      </p>
    </template>
    <template v-else>
      <p>{{ ui.routeDescription }}</p>
      <p v-if="web">
        {{ ui.url }}: <code>https://infoseite.example{{ model.path }}</code>
      </p>
      <label v-for="key in toggles" :key="key"
        >{{ word(key)
        }}<select
          :value="toggleValue(key) ? 'on' : 'off'"
          :disabled="disabled"
          @change="send(key, ($event.target as HTMLSelectElement).value)"
        >
          <option value="on">{{ ui.on }}</option>
          <option value="off">{{ ui.off }}</option>
        </select></label
      >
      <label v-if="can('target')"
        >{{ ui.target
        }}<select
          :value="model.target"
          :disabled="disabled"
          @change="send('target', ($event.target as HTMLSelectElement).value)"
        >
          <option value="printer">{{ ui.printer }}</option>
          <option value="server">{{ ui.server }}</option>
        </select></label
      >
      <label v-if="can('path')"
        >{{ ui.path
        }}<select
          :value="model.path"
          :disabled="disabled"
          @change="send('path', ($event.target as HTMLSelectElement).value)"
        >
          <option value="/start">/start</option>
          <option value="/hilfe">/hilfe</option>
          <option value="/missing">/missing</option>
        </select></label
      >
      <button type="button" :disabled="disabled" @click="send('test')">
        {{ web ? ui.request : ui.test }}
      </button>
      <section class="lab-observation" aria-live="polite">
        <h3>{{ ui.report }}</h3>
        <p v-if="stale">{{ ui.stale }}</p>
        <ol v-if="model.report.length">
          <li v-for="item in model.report" :key="item">{{ word(item) }}</li>
        </ol>
        <p v-else>{{ ui.noTest }}</p>
      </section>
      <section v-if="model.report.includes('html200')" class="lab-preview">
        <h3>{{ ui.page }}</h3>
        <h4>{{ projectTitle }}</h4>
        <p>19:00 · {{ ui.count }}: 2 · {{ ui.sum }}: 5</p>
        <div
          v-if="model.report.includes('image200')"
          class="lab-pixels lab-preview-pixels"
          aria-label="4 × 4"
        >
          <span
            v-for="(pixel, i) in icon"
            :key="i"
            :style="{ backgroundColor: pixel === '1' ? '#fff' : '#14202f' }"
            >{{ pixel }}</span
          >
        </div>
        <p v-else>{{ ui.missingImage }}</p>
      </section>
      <p v-if="scenario === 'https-access'">{{ ui.trustNote }}</p>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import {
  allowedLabActions,
  networkConfig,
  projectFiles,
  PROJECT_TITLE,
  type NetworkModel,
  type LabScenario,
  type LabAction,
} from "~/utils/itLabModels";
import { itLabCopy } from "~/utils/itLabCopy";
const props = defineProps<{
  scenario: LabScenario;
  model: NetworkModel;
  locale: string;
  disabled: boolean;
}>();
const emit = defineEmits<{ action: [action: LabAction] }>();
const ui = computed(() => itLabCopy(props.locale));
const word = (key: string) => ui.value[key as keyof typeof ui.value] || key;
const can = (t: string) => allowedLabActions(props.scenario).includes(t);
const toggles = computed(() =>
  ["local", "uplink", "route", "dns", "tls", "access", "image"].filter(can)
);
const web = computed(() => !["local-network", "addresses-routes"].includes(props.scenario));
const stale = computed(
  () => !!props.model.testedConfig && props.model.testedConfig !== networkConfig(props.model)
);
const toggleValue = (key: string) =>
  key === "access" ? props.model.allowed : props.model[key as keyof NetworkModel];
const projectTitle = PROJECT_TITLE;
const chunks = ["ABC", "DEF", "GHI"];
const icon = projectFiles().find((f) => f.format === "pixel")!.data;
function send(type: string, value?: string | number) {
  if (!props.disabled) emit("action", { type, ...(value === undefined ? {} : { value }) });
}
</script>
