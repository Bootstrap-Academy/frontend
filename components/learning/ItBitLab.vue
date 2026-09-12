<template>
  <div class="lab-workspace">
    <template v-if="scenario === 'bits-values'">
      <div class="lab-bits">
        <button
          v-for="(bit, index) in model.bits"
          :key="index"
          type="button"
          :aria-pressed="bit === 1"
          :aria-label="`${ui.bit} ${index + 1}, ${ui.weight} ${2 ** (3 - index)}`"
          :disabled="disabled"
          @click="send('bit', index)"
        >
          <small>{{ 2 ** (3 - index) }}</small
          ><strong>{{ bit }}</strong>
        </button>
      </div>
      <p aria-live="polite">
        {{ ui.value }}: <strong>{{ bitValue(model) }}</strong> · {{ ui.states }}: 16 ·
        {{ ui.maximum }}: 15
      </p>
    </template>
    <template v-else-if="scenario === 'text-bytes'">
      <label
        >{{ ui.text
        }}<input
          :value="model.text"
          maxlength="160"
          :disabled="disabled"
          @input="send('text', ($event.target as HTMLInputElement).value)"
      /></label>
      <p>
        {{ ui.bytes }}: <span class="lab-bytes">{{ textBytes(model).join(" ") || "—" }}</span>
      </p>
      <p>{{ ui.byteCount }}: {{ textBytes(model).length }}</p>
      <label
        >{{ ui.decoder
        }}<select
          :value="model.latin ? 'latin' : 'utf8'"
          :disabled="disabled"
          @change="send('decoder', ($event.target as HTMLSelectElement).value)"
        >
          <option value="utf8">{{ ui.utf8 }}</option>
          <option value="latin">{{ ui.latin }}</option>
        </select></label
      >
      <p aria-live="polite">{{ ui.decoded }}: {{ decodedText(model) }}</p>
    </template>
    <template v-else>
      <label
        >{{ ui.palette
        }}<select
          :value="model.depth"
          :disabled="disabled"
          @change="send('depth', Number(($event.target as HTMLSelectElement).value))"
        >
          <option :value="1">{{ ui.twoColours }}</option>
          <option :value="2">{{ ui.fourColours }}</option>
        </select></label
      >
      <p v-if="model.notice" role="status">
        {{ ui.paletteLoss }}
        <button type="button" :disabled="disabled" @click="send('remap')">{{ ui.remap }}</button>
      </p>
      <div class="lab-pixels" :aria-label="`${ui.pixel}: 4 × 4`">
        <button
          v-for="(colour, index) in model.pixels"
          :key="index"
          :ref="
            (el) => {
              if (el) cells[index] = el as HTMLButtonElement;
            }
          "
          type="button"
          :tabindex="model.cell === index ? 0 : -1"
          :aria-label="`${ui.row} ${Math.floor(index / 4) + 1}, ${ui.column} ${(index % 4) + 1}, ${ui.colour} ${colour}`"
          :aria-pressed="model.cell === index"
          :style="{ backgroundColor: colours[colour], color: colour === 0 ? '#fff' : '#111' }"
          :disabled="disabled"
          @click="send('cell', index)"
          @keydown="navigate($event, index)"
        >
          {{ colour }}
        </button>
      </div>
      <label
        >{{ ui.pixel
        }}<select
          :value="model.cell"
          :disabled="disabled"
          @change="send('cell', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="i in 16" :key="i" :value="i - 1">
            {{ ui.row }} {{ Math.floor((i - 1) / 4) + 1 }}, {{ ui.column }} {{ ((i - 1) % 4) + 1 }}
          </option>
        </select></label
      >
      <label
        >{{ ui.colour
        }}<select
          :value="model.colour"
          :disabled="disabled"
          @change="send('colour', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="i in 2 ** model.depth" :key="i" :value="i - 1">
            {{ i - 1 }} · {{ names[i - 1] }}
          </option>
        </select></label
      ><button type="button" :disabled="disabled" @click="send('paint')">{{ ui.paint }}</button>
      <p aria-live="polite">
        {{ ui.payload }}:
        <strong
          >16 × {{ model.depth }} = {{ 16 * model.depth }} bit ({{ 2 * model.depth }}
          {{ ui.byteCount }})</strong
        >
      </p>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick } from "vue";
import {
  bitValue,
  textBytes,
  decodedText,
  type BitModel,
  type LabScenario,
  type LabAction,
} from "~/utils/itLabModels";
import { itLabCopy } from "~/utils/itLabCopy";
const props = defineProps<{
  scenario: LabScenario;
  model: BitModel;
  locale: string;
  disabled: boolean;
}>();
const emit = defineEmits<{ action: [action: LabAction] }>();
const ui = computed(() => itLabCopy(props.locale));
const colours = ["#14202f", "#f5f5f5", "#74b9ff", "#ffbc65"];
const names = computed(() => [ui.value.black, ui.value.white, ui.value.blue, ui.value.orange]);
const cells: HTMLButtonElement[] = [];
function send(type: string, value?: string | number) {
  if (!props.disabled) emit("action", { type, ...(value === undefined ? {} : { value }) });
}
async function navigate(event: KeyboardEvent, index: number) {
  if (props.disabled) return;
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    send("cell", index);
    send("paint");
    return;
  }
  const offsets: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -4,
    ArrowDown: 4,
  };
  if (event.key in offsets) {
    event.preventDefault();
    const cell = Math.max(0, Math.min(15, index + offsets[event.key]));
    send("cell", cell);
    await nextTick();
    cells[cell]?.focus();
  }
}
</script>
