<script setup lang="ts">
import { computed } from "vue";
import { resolveDocumentOverlayReturnPath } from "~/utils/documentOverlayReturn";

const { t } = useI18n();

const title = computed(() => t("privacy.metaTitle"));
const description = computed(() => t("privacy.metaDescription"));

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
});

/**
 * Close to the previous in-app page (or home) with history replacement so
 * browser scroll restoration does not jump back to the footer click position.
 */
function closeDocumentOverlay() {
  navigateTo(resolveDocumentOverlayReturnPath(), { replace: true });
}
</script>

<template>
  <div class="relative min-h-screen">
    <div
      class="pointer-events-none select-none"
      aria-hidden="true"
    >
      <DailyGamePage is-backdrop />
    </div>
    <DocumentOverlay labelled-by="privacy-document-title" @close="closeDocumentOverlay">
      <PrivacyDocument />
    </DocumentOverlay>
  </div>
</template>
