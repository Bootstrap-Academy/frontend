<template>
  <div class="lab-workspace">
    <label v-if="scenario === 'input-output'"
      >{{ ui.text
      }}<input
        :value="model.text"
        maxlength="160"
        :disabled="disabled"
        @input="send('text', ($event.target as HTMLInputElement).value)"
    /></label>
    <label v-else-if="!loop"
      >{{ ui.value
      }}<input
        type="number"
        min="0"
        max="30"
        :value="model.value"
        :disabled="disabled"
        @input="send('value', Number(($event.target as HTMLInputElement).value))"
    /></label>
    <label v-if="scenario === 'change-rule'"
      >{{ ui.rule
      }}<select
        :value="model.operation"
        :disabled="disabled"
        @change="send('operation', ($event.target as HTMLSelectElement).value)"
      >
        <option value="double">{{ ui.double }}</option>
        <option value="add">{{ ui.add }}</option>
      </select></label
    >
    <ol v-if="scenario === 'sequence'" class="lab-sequence">
      <li v-for="(instruction, index) in model.order" :key="instruction">
        <span>{{ index + 1 }}. {{ word(instruction) }}</span
        ><button v-if="index < 2" type="button" :disabled="disabled" @click="send('move', index)">
          {{ ui.swap }}
        </button>
      </li>
    </ol>
    <template v-if="loop">
      <label
        >{{ ui.dataset
        }}<select
          :value="model.dataset"
          :disabled="disabled"
          @change="send('dataset', ($event.target as HTMLSelectElement).value)"
        >
          <option value="sum">{{ ui.sumData }}</option>
          <option value="project">{{ ui.projectData }}</option>
          <option value="boundary">{{ ui.boundary }}</option>
          <option value="empty">{{ ui.emptyData }}</option>
        </select></label
      >
      <label
        >{{ ui.resetPosition
        }}<select
          :value="model.resetInside ? 'yes' : 'no'"
          :disabled="disabled"
          @change="send('resetInside', ($event.target as HTMLSelectElement).value)"
        >
          <option value="no">{{ ui.no }}</option>
          <option value="yes">{{ ui.yes }}</option>
        </select></label
      >
    </template>
    <label v-if="scenario === 'state-conditions' || scenario === 'project-generator'"
      >{{ ui.inclusive
      }}<select
        :value="model.inclusive ? 'yes' : 'no'"
        :disabled="disabled"
        @change="send('inclusive', ($event.target as HTMLSelectElement).value)"
      >
        <option value="yes">{{ ui.gte }}</option>
        <option value="no">{{ ui.gt }}</option>
      </select></label
    >
    <div class="lab-actions">
      <button
        type="button"
        :disabled="disabled || model.steps >= trace.length"
        @click="send('step')"
      >
        {{ ui.step }}</button
      ><button
        type="button"
        :disabled="disabled || model.steps >= trace.length"
        @click="send('run')"
      >
        {{ ui.run }}</button
      ><button type="button" :disabled="disabled" @click="send('restart')">{{ ui.restart }}</button>
    </div>
    <div class="lab-observation" aria-live="polite" aria-atomic="true">
      <p>{{ ui.current }}: {{ word(now.instruction) }} ({{ model.steps }}/{{ trace.length }})</p>
      <dl>
        <dt>{{ ui.working }}</dt>
        <dd v-if="scenario === 'input-output'">{{ model.steps ? model.text : "—" }}</dd>
        <dd v-else>
          {{ ui.value }}: {{ now.value
          }}<template v-if="loop">
            · {{ ui.sum }}: {{ now.sum }} · {{ ui.count }}: {{ now.count }}</template
          >
        </dd>
        <dt>{{ ui.output }}</dt>
        <dd>{{ now.output.length ? now.output.map(word).join(", ") : ui.emptyOutput }}</dd>
      </dl>
    </div>
    <p v-if="scenario === 'inside-computer'">{{ ui.cpu }}</p>
    <section
      v-if="scenario === 'project-generator' && model.steps === trace.length"
      class="lab-preview"
    >
      <h3>{{ ui.preview }}</h3>
      <h4>{{ projectTitle }}</h4>
      <p>{{ ui.count }}: {{ now.count }} · {{ ui.sum }}: {{ now.sum }}</p>
      <p>UTF-8: {{ titleBytes }}</p>
      <div class="lab-pixels" aria-label="4 × 4">
        <span
          v-for="(pixel, i) in icon"
          :key="i"
          :style="{ backgroundColor: pixel === '1' ? '#fff' : '#14202f' }"
          >{{ pixel }}</span
        >
      </div>
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import {
  machineTrace,
  projectFiles,
  PROJECT_TITLE,
  machineNow,
  type Machine,
  type LabScenario,
  type LabAction,
} from "~/utils/itLabModels";
import { itLabCopy } from "~/utils/itLabCopy";
const projectTitle = PROJECT_TITLE;
const titleBytes = Array.from(new TextEncoder().encode(PROJECT_TITLE)).join(" ");
const icon = projectFiles().find((f) => f.format === "pixel")!.data;
const props = defineProps<{
  scenario: LabScenario;
  model: Machine;
  locale: string;
  disabled: boolean;
}>();
const emit = defineEmits<{ action: [action: LabAction] }>();
const ui = computed(() => itLabCopy(props.locale));
const word = (s: string) => ui.value[s as keyof typeof ui.value] || s;
const loop = computed(() => ["repeat-state", "project-generator"].includes(props.scenario));
const trace = computed(() => machineTrace(props.scenario, props.model));
const now = computed(() => machineNow(props.scenario, props.model));
function send(type: string, value?: string | number) {
  if (!props.disabled) emit("action", { type, ...(value === undefined ? {} : { value }) });
}
</script>
