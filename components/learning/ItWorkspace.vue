<template>
  <div class="lab-workspace">
    <label v-if="model.files.length"
      >{{ ui.files
      }}<select
        :value="model.selected"
        :disabled="disabled"
        @change="send('select', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="file in model.files" :key="file.path" :value="file.path">
          {{ file.path }}
        </option>
      </select></label
    >
    <p v-else>{{ ui.noFiles }}</p>
    <div v-if="file" class="lab-observation">
      <p>{{ ui.savedData }}</p>
      <pre>{{ file.data }}</pre>
    </div>
    <button v-if="can('open')" type="button" :disabled="disabled || !file" @click="send('open')">
      {{ ui.open }}
    </button>
    <label v-if="can('switch') && model.processes.length"
      >{{ ui.process
      }}<select
        :value="model.active"
        :disabled="disabled"
        @change="send('switch', Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="p in model.processes" :key="p.id" :value="p.id">
          {{ p.id }} · {{ p.job ? ui.jobLabel : p.file }}
        </option>
      </select></label
    >
    <label v-if="process && !process.job"
      >{{ ui.edit }} · {{ process.file
      }}<textarea
        :value="process.draft"
        maxlength="160"
        rows="3"
        :readonly="!can('edit')"
        :disabled="disabled"
        @input="send('edit', ($event.target as HTMLTextAreaElement).value)"
      />
    </label>
    <p v-else-if="!process">{{ ui.noProcess }}</p>
    <div class="lab-actions">
      <button
        v-for="action in mainActions"
        :key="action"
        type="button"
        :disabled="
          disabled ||
          (['save', 'saveCopy', 'close'].includes(action) && !process) ||
          (['copy', 'rename', 'viewImage', 'delete'].includes(action) && !file)
        "
        @click="send(action)"
      >
        {{ word(action) }}
      </button>
    </div>
    <template v-if="can('backup') || can('backupChoice')">
      <label v-if="can('backupChoice')"
        >{{ ui.backupChoice
        }}<select
          :value="model.backupLabel"
          :disabled="disabled"
          @change="send('backupChoice', ($event.target as HTMLSelectElement).value)"
        >
          <option value="old">{{ ui.old }}</option>
          <option value="complete">{{ ui.complete }}</option>
        </select></label
      >
      <h3>{{ ui.backupFiles }}</h3>
      <ul v-if="model.backup.length">
        <li v-for="f in model.backup" :key="f.path">
          <strong>{{ f.path }}</strong
          >: {{ f.data }}
        </li>
      </ul>
      <p v-else>{{ ui.noBackup }}</p>
      <div class="lab-actions">
        <button v-if="can('restore')" type="button" :disabled="disabled" @click="send('restore')">
          {{ ui.restore }}</button
        ><button
          v-if="can('syncDelete')"
          type="button"
          :disabled="disabled"
          @click="send('syncDelete')"
        >
          {{ ui.syncDelete }}
        </button>
      </div>
    </template>
    <template v-if="scenario === 'resource-limits'"
      ><dl class="lab-observation">
        <dt>{{ ui.ram }}</dt>
        <dd>{{ usage.ram }}/8</dd>
        <dt>{{ ui.cpuSteps }}</dt>
        <dd>{{ usage.cpu }}/4</dd>
        <dt>{{ ui.storage }}</dt>
        <dd>{{ usage.storage }}</dd>
      </dl>
      <p>{{ ui.resourcesNote }}</p></template
    >
    <p v-if="scenario === 'program-process'">{{ ui.programKept }}</p>
    <p v-if="model.notice" class="lab-feedback" role="status">{{ word(model.notice) }}</p>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import {
  activeProcess,
  selectedFile,
  workspaceUsage,
  allowedLabActions,
  type Workspace,
  type LabScenario,
  type LabAction,
} from "~/utils/itLabModels";
import { itLabCopy } from "~/utils/itLabCopy";
const props = defineProps<{
  scenario: LabScenario;
  model: Workspace;
  locale: string;
  disabled: boolean;
}>();
const emit = defineEmits<{ action: [action: LabAction] }>();
const ui = computed(() => itLabCopy(props.locale));
const word = (key: string) => ui.value[key as keyof typeof ui.value] || key;
const can = (type: string) => allowedLabActions(props.scenario).includes(type);
const process = computed(() => activeProcess(props.model)),
  file = computed(() => selectedFile(props.model)),
  usage = computed(() => workspaceUsage(props.model));
const mainActions = computed(() =>
  [
    "save",
    "saveCopy",
    "power",
    "copy",
    "rename",
    "viewImage",
    "backup",
    "delete",
    "close",
    "job",
  ].filter(can)
);
function send(type: string, value?: string | number) {
  if (!props.disabled) emit("action", { type, ...(value === undefined ? {} : { value }) });
}
</script>
