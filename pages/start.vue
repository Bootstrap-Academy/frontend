<template>
  <GuestFrame @login="login">
    <main v-if="view" class="guest-learning">
      <h1>{{ copy.activity }}</h1>
      <p v-if="!online" class="notice" role="status">{{ copy.offline }}</p>
      <template v-if="!view.draft.finished && !view.draft.saved">
        <LoopExplorer
          :content="content"
          :state="view.draft.state"
          :locale="locale"
          :disabled="view.busy || !!view.draft.pending"
          @change="data.edit"
          @complete="finish"
        />
        <p v-if="hasWork" class="local-note" role="status">
          {{ view.persisted ? copy.local : copy.temporary }}
        </p>
      </template>
      <section
        v-else-if="view.draft.finished && !view.draft.saved"
        class="result"
        aria-labelledby="guest-result"
      >
        <h2 id="guest-result" ref="resultHeading" tabindex="-1">{{ copy.result }}</h2>
        <p>{{ copy.resultBody }}</p>
        <p class="local-note">{{ view.persisted ? copy.local : copy.temporary }}</p>
      </section>

      <section
        v-if="(view.draft.finished || view.draft.saved || wantsHandoff) && hasWork"
        class="handoff"
        aria-labelledby="guest-keep"
      >
        <template v-if="!authenticated">
          <h2 id="guest-keep">{{ copy.keep }}</h2>
          <p>{{ copy.keepBody }}</p>
          <NuxtLink v-slot="{ href, navigate }" to="/auth/signup" custom>
            <a :href="href || undefined" class="primary" @click="openAuth($event, navigate)">{{
              copy.signup
            }}</a>
          </NuxtLink>
        </template>
        <template v-else-if="view.draft.saved">
          <h2 id="guest-keep">{{ copy.saved }}</h2>
          <NuxtLink :to="guestDestination" class="primary">{{ copy.continue }}</NuxtLink>
        </template>
        <template v-else>
          <h2 id="guest-keep">{{ copy.confirm }}</h2>
          <p>
            {{ copy.accountNote }} <strong>{{ user?.display_name || user?.name }}</strong
            >.
          </p>
          <template v-if="!profileLoaded">
            <p>{{ copy.profileBody }}</p>
            <button type="button" class="primary" @click="getUser()">{{ copy.profile }}</button>
          </template>
          <template v-else-if="!user?.email_verified">
            <p>{{ copy.verifyBody }}</p>
            <NuxtLink v-slot="{ href, navigate }" to="/auth/verify-account" custom>
              <a :href="href || undefined" class="primary" @click="openAuth($event, navigate)">{{
                copy.verify
              }}</a>
            </NuxtLink>
          </template>
          <template v-else>
            <p>{{ copy.draftOnly }}</p>
            <button
              v-if="!['conflict', 'changed', 'session'].includes(view.error) && !reauthRequired"
              type="button"
              class="primary"
              :disabled="view.busy || !online"
              @click="transfer"
            >
              {{ view.busy ? copy.saving : view.error ? copy.retry : copy.transfer }}
            </button>
          </template>
        </template>
        <div v-if="view.error || reauthRequired" role="alert" class="notice">
          <p>{{ errorCopy }}</p>
          <NuxtLink v-if="['conflict', 'changed'].includes(view.error)" :to="guestDestination">{{
            copy.continue
          }}</NuxtLink>
          <NuxtLink v-if="view.error === 'limit'" to="/learn">{{ copy.resume }}</NuxtLink>
          <button v-if="view.error === 'session' || reauthRequired" type="button" @click="signIn">
            {{ copy.login }}
          </button>
        </div>
        <button
          v-if="view.draft.finished && !view.draft.saved && !view.draft.pending && !view.busy"
          type="button"
          class="secondary"
          @click="data.edit(view.draft.state)"
        >
          {{ copy.later }}
        </button>
        <NuxtLink v-if="!authenticated" to="/skill-tree" class="secondary">{{
          copy.browse
        }}</NuxtLink>
      </section>
    </main>
  </GuestFrame>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import LoopExplorer from "~/components/learning/LoopExplorer.vue";
import { guestCopy } from "~/utils/guest/copy";
import { guestReturnPath, takeGuestAuthorization } from "~/utils/guest/handoff";
import { guestExercise, guestDestination } from "~/utils/guest/learning";

definePageMeta({ layout: false });
const { locale } = useI18n();
const copy = computed(() => guestCopy(locale.value));
useHead({ title: computed(() => `${copy.value.activity} · Bootstrap Academy`) });
const content = computed(() => guestExercise.content[locale.value.startsWith("en") ? "en" : "de"]);
const { view, data, user, authenticated, reauthRequired, reauthenticate } = useGuestLearning();
const profileLoaded = useProfileLoaded();
const router = useRouter();
const wantsHandoff = ref(!!guestReturnPath());
const resultHeading = ref<HTMLElement | null>(null);
const online = ref(navigator.onLine);
const connection = () => {
  online.value = navigator.onLine;
};
window.addEventListener("online", connection);
window.addEventListener("offline", connection);
onBeforeUnmount(() => {
  window.removeEventListener("online", connection);
  window.removeEventListener("offline", connection);
});
const hasWork = computed(() => Object.keys(view.value?.draft.state || {}).length > 0);
const errorCopy = computed(() => {
  const key = reauthRequired.value ? "session" : view.value?.error;
  return key === "save" ? copy.value.saveError : key ? copy.value[key] : "";
});
async function finish() {
  data.finish();
  await nextTick();
  resultHeading.value?.focus();
}
function login(event: MouseEvent) {
  if (!hasWork.value) return;
  wantsHandoff.value = true;
  handoff(event);
}
function handoff(event: MouseEvent) {
  if (!data.beginHandoff()) event.preventDefault();
}
function openAuth(event: MouseEvent, navigate: (event: MouseEvent) => unknown) {
  handoff(event);
  if (!event.defaultPrevented) void navigate(event);
}
async function transfer() {
  if (!user.value?.email_verified || !profileLoaded.value) return;
  if (await data.transfer()) await router.push(guestDestination);
}
watch(
  () => [
    authenticated.value,
    user.value?.id,
    user.value?.email_verified,
    profileLoaded.value,
    view.value?.draft.id,
  ],
  () => {
    if (
      authenticated.value &&
      user.value?.email_verified &&
      profileLoaded.value &&
      view.value &&
      !view.value.busy &&
      !view.value.draft.saved &&
      takeGuestAuthorization(user.value.id, view.value.draft.id)
    )
      void transfer();
  },
  { immediate: true }
);
async function signIn() {
  if (data.beginHandoff()) await reauthenticate();
}
</script>
<style scoped>
.guest-learning {
  max-width: 824px;
  padding: 1.25rem clamp(1rem, 4vw, 2rem) 2rem;
  margin: auto;
}
.guest-learning > h1 {
  color: #a8bfd0;
  font-size: 0.95rem;
  margin-bottom: 1.4rem;
}
.result,
.handoff {
  display: grid;
  gap: 1.1rem;
  line-height: 1.65;
}
.result h2 {
  font-size: clamp(1.8rem, 5vw, 2.4rem);
  font-weight: 700;
  line-height: 1.2;
  color: #85e4d2;
}
.handoff {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #294256;
}
.handoff h2 {
  font-size: 1.4rem;
  font-weight: 650;
}
.local-note {
  color: #a8bfd0;
  font-size: 0.85rem;
  margin-top: 1rem;
}
.notice {
  border-left: 3px solid #85e4d2;
  padding: 0.75rem 1rem;
  background: #102c3b;
  margin-bottom: 1rem;
}
.notice :is(a, button) {
  display: inline-block;
  padding: 0.75rem 0;
  color: #85e4d2;
  text-decoration: underline;
  min-height: 44px;
}
.primary {
  display: inline-flex;
  justify-self: start;
  padding: 0.85rem 1.1rem;
  background: #0cc9ab;
  color: #07312c;
  border-radius: 0.6rem;
  min-height: 48px;
  font-weight: 700;
  text-align: left;
}
.secondary {
  color: #85e4d2;
  justify-self: start;
  min-height: 44px;
  padding: 0.5rem 0;
  text-align: left;
}
button:disabled {
  opacity: 0.6;
}
:is(a, button):focus-visible {
  outline: 2px solid #b5efdf;
  outline-offset: 4px;
}
.result h2:focus {
  outline: none;
}
</style>
