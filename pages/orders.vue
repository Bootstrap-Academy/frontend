<template>
  <main class="moderation-page moderation-surface grid max-w-4xl gap-5">
    <NuxtLink to="/account" class="w-fit">{{ $t("Links.MyAccount") }}</NuxtLink>
    <h1>{{ $t("Body.PurchaseOrders") }}</h1>
    <p>{{ $t("Body.PurchaseStateNote") }}</p>
    <button type="button" class="w-fit" :disabled="loading" @click="refresh">
      {{ $t("Body.PurchaseRefresh") }}
    </button>
    <p v-if="loading" role="status">{{ $t("Moderation.Loading") }}</p>
    <p v-else-if="!error && !orders.length">{{ $t("Body.PurchaseEmpty") }}</p>
    <p v-if="error" role="alert">{{ $t("Body.PurchaseDocumentUnavailable") }}</p>
    <article v-for="order in orders" :key="order.offer.id" class="support-card grid min-w-0 gap-3">
      <h2>{{ order.offer.product.title }}</h2>
      <p class="break-all">{{ order.offer.id }}</p>
      <p role="status">
        {{
          $t(
            order.state === "fulfilled"
              ? "Body.PurchaseProvided"
              : order.state === "review"
                ? "Body.PurchaseReview"
                : order.state === "failed"
                  ? "Body.PurchaseRejected"
                  : order.state === "offered"
                    ? "Body.PurchaseNotOrdered"
                    : "Body.PurchasePending"
          )
        }}
      </p>
      <details class="order-documents">
        <summary>{{ $t("Body.PurchaseDetails") }}</summary>
        <div class="grid gap-4">
          <details data-purchase-original lang="de">
            <summary class="cursor-pointer">{{ $t("Body.PurchaseStoredOffer") }}</summary>
            <p class="whitespace-pre-wrap break-words">{{ order.offer.text }}</p>
            <p class="whitespace-pre-wrap break-words">{{ order.offer.declaration }}</p>
          </details>
          <p v-if="order.provision_deadline">
            {{ $t("Body.PurchaseDeadline") }} {{ order.provision_deadline }}
          </p>
          <p
            v-if="
              order.provision_timing && !order.provision_timing.committed_before_deadline_proven
            "
          >
            {{ $t("Body.PurchaseTimingUncertain") }}
          </p>
          <p v-if="order.confirmation_smtp_accepted_at">
            {{ $t("Body.PurchaseSmtpAccepted") }} {{ order.confirmation_smtp_accepted_at }}
          </p>
          <p v-if="order.fulfillment?.purchased_since">
            {{ order.fulfillment.purchased_since }} – {{ order.fulfillment.purchased_until }}
          </p>
          <div class="flex flex-wrap gap-4">
            <button
              v-for="kind in order.accepted_at
                ? [
                    'terms',
                    'withdrawal',
                    'confirmation',
                    ...(order.fulfillment ? ['fulfillment'] : []),
                    ...(order.provision_timing ? ['timing'] : []),
                  ]
                : ['terms', 'withdrawal']"
              :key="kind"
              type="button"
              class="text-accent underline"
              @click="downloadPurchaseDocument(order.offer.id, kind)"
            >
              {{ $t(`Body.PurchaseDocument_${kind}`) }}
            </button>
          </div>
          <details v-if="order.document_corrections?.length" class="grid gap-3">
            <summary>{{ $t("Body.PurchaseCorrectedOriginals") }}</summary>
            <p>{{ $t("Body.PurchaseCorrectionNote") }}</p>
            <button
              v-for="kind in order.document_corrections"
              :key="kind"
              type="button"
              class="mr-4 text-accent underline"
              @click="downloadPurchaseDocument(order.offer.id, `${kind}-original`)"
            >
              {{ $t(`Body.PurchaseDocument_${kind}-original`) }}
            </button>
          </details>
        </div>
      </details>
    </article>
  </main>
</template>
<script setup lang="ts">
definePageMeta({ middleware: "auth" });
const orders = ref<any[]>([]);
const error = ref(false),
  loading = ref(false);
const user = useUser();
let generation = 0;
async function refresh() {
  const current = ++generation;
  const owner = user.value?.id;
  if (!owner) {
    orders.value = [];
    loading.value = false;
    error.value = false;
    return;
  }
  loading.value = true;
  error.value = false;
  try {
    const result = await GET("/shop/purchases");
    if (generation === current && user.value?.id === owner) {
      orders.value = result.filter((order: any) => order.offer.user_id === owner);
      error.value = false;
    }
  } catch {
    if (generation === current && user.value?.id === owner) error.value = true;
  } finally {
    if (generation === current && user.value?.id === owner) loading.value = false;
  }
}
watch(
  () => user.value?.id,
  () => {
    orders.value = [];
    refresh();
  }
);
onMounted(refresh);
</script>

<style src="../assets/css/account-support.css"></style>
